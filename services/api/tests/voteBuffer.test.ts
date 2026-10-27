import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import {
    Decoder,
    GlideClient,
    RequestError,
    Script,
    TimeoutError,
} from "@valkey/valkey-glide";
import { z } from "zod";
import {
    ADD_VOTE_SCRIPT,
    CLEANUP_VOTES_SCRIPT,
    READ_VOTES_SCRIPT,
} from "../src/service/voteBuffer.js";
import { bufferedVoteSchema } from "../src/service/voteBufferTypes.js";

describe("Valkey vote acceptance, ordering and exact-payload cleanup", () => {
    let container: StartedTestContainer;
    let client: GlideClient;
    const addScript = new Script(ADD_VOTE_SCRIPT);
    const cleanupScript = new Script(CLEANUP_VOTES_SCRIPT);
    const readScript = new Script(READ_VOTES_SCRIPT);
    const keys = [
        "test:index",
        "test:data",
        "test:opinion:",
        "test:conversation:",
        "test:gate:",
        "test:order:",
        "test:sequence:",
    ];
    const indexKey = "test:index";
    const dataKey = "test:data";
    const userId = randomUUID();
    const epoch = randomUUID();
    const sessionId = randomUUID();
    const member = `${userId}:${epoch}:1`;

    beforeAll(async () => {
        container = await new GenericContainer("valkey/valkey:8-alpine")
            .withExposedPorts(6379)
            .start();
        client = await GlideClient.createClient({
            addresses: [
                {
                    host: container.getHost(),
                    port: container.getMappedPort(6379),
                },
            ],
            defaultDecoder: Decoder.String,
        });
    }, 60_000);
    beforeEach(async () => {
        await client.flushall();
    });
    afterAll(async () => {
        addScript.release();
        cleanupScript.release();
        readScript.release();
        client?.close();
        await container?.stop();
    });

    async function add({
        vote = "agree",
        timestamp = 1000,
        opinionId = 1,
        sequence,
        minimumSequence = 0,
        voteBufferEpoch = epoch,
    }: {
        vote?: "agree" | "disagree" | "pass" | "cancel";
        timestamp?: number;
        opinionId?: number;
        sequence?: number;
        minimumSequence?: number;
        voteBufferEpoch?: string;
    } = {}) {
        return await client.invokeScript(addScript, {
            keys,
            args: [
                `${userId}:${voteBufferEpoch}:${String(opinionId)}`,
                String(timestamp),
                JSON.stringify({
                    userId,
                    opinionId,
                    conversationId: 1,
                    opinionContentId: 1,
                    vote,
                    timestamp: new Date(timestamp),
                    voteBufferEpoch,
                    clientAction:
                        sequence === undefined
                            ? undefined
                            : { sessionId, sequence },
                }),
                String(minimumSequence),
            ],
        });
    }
    async function read(limit = 100) {
        return z.array(z.tuple([z.string(), z.string()])).parse(
            await client.invokeScript(readScript, {
                keys: [indexKey, dataKey],
                args: [String(limit)],
            }),
        );
    }
    async function cleanup(entries: readonly [string, string][]) {
        return await client.invokeScript(cleanupScript, {
            keys: keys.slice(0, 4),
            args: entries.flatMap(([key, data]) => [key, data]),
        });
    }
    async function current() {
        return bufferedVoteSchema.parse(
            JSON.parse(z.string().parse(await client.hget(dataKey, member))),
        );
    }

    it("publishes the queue and both lookups before acknowledging", async () => {
        expect(await add()).toBe(1);
        const payload = await client.hget(dataKey, member);
        expect(await client.hget("test:opinion:1", member)).toBe(payload);
        expect(await client.hget("test:conversation:1", member)).toBe("1");
        expect(await client.zscore(indexKey, member)).toBe(1000);
        expect((await current()).bufferSequence).toBe(1);
    });

    it("reads a bounded timestamp-ordered batch without consuming votes", async () => {
        await add({ opinionId: 3, timestamp: 3000 });
        await add({ opinionId: 1, timestamp: 1000 });
        await add({ opinionId: 2, timestamp: 2000 });
        const first = await read(2);
        expect(first.map(([key]) => key)).toEqual([
            member,
            `${userId}:${epoch}:2`,
        ]);
        expect(await read(2)).toEqual(first);
        expect(await client.zcard(indexKey)).toBe(3);
    });

    it("orders same-timestamp actions and preserves a newer payload during cleanup", async () => {
        await add();
        const older = await read();
        await add({ vote: "cancel" });
        expect(await cleanup(older)).toBe(0);
        expect(await current()).toMatchObject({
            vote: "cancel",
            bufferSequence: 2,
        });
        expect(await cleanup(await read())).toBe(1);
        expect(await client.hlen(dataKey)).toBe(0);
        expect(await client.hlen("test:opinion:1")).toBe(0);
        expect(await client.hlen("test:conversation:1")).toBe(0);
    });

    it("suppresses a delayed duplicate after Undo even after its queue payload was cleaned", async () => {
        await add({ sequence: 1 });
        await cleanup(await read());
        await add({ sequence: 2, vote: "cancel" });
        const cancellation = await read();
        expect(await add({ sequence: 1 })).toBe(2);
        expect(await read()).toEqual(cancellation);
        expect((await current()).vote).toBe("cancel");
    });

    it("seeds a missing sequence from the last persisted vote", async () => {
        await add({ minimumSequence: 100 });
        expect((await current()).bufferSequence).toBe(101);
    });

    it("rejects new admission after the conversation epoch is sealed", async () => {
        await client.set(`test:gate:${epoch}`, "closed");
        expect(await add()).toBe(0);
        expect(await read()).toEqual([]);
        // A newly reopened epoch is independent of an obsolete cached gate.
        expect(await add({ voteBufferEpoch: randomUUID() })).toBe(1);
    });

    it("isolates a reopened vote from delayed admission and cleanup in the old epoch", async () => {
        const reopenedEpoch = randomUUID();
        await add({ voteBufferEpoch: reopenedEpoch, vote: "disagree" });
        const reopened = await read();
        await add();
        const olderEpoch = (await read()).filter(([key]) => key === member);
        expect(await cleanup(olderEpoch)).toBe(1);
        expect(await read()).toEqual(reopened);
        await client.set(`test:gate:${epoch}`, "closed");
        expect(await add()).toBe(0);
        expect(
            await add({ voteBufferEpoch: reopenedEpoch, vote: "cancel" }),
        ).toBe(1);
    });

    it("uses exact server-encoded payload bytes for cleanup", async () => {
        await add({ timestamp: 1704067200123 });
        const captured = await read();
        expect((await current()).timestamp.getTime()).toBe(1704067200123);
        expect(await cleanup(captured)).toBe(1);
        expect(await cleanup(captured)).toBe(0);
    });

    it("reloads scripts after a server script-cache flush", async () => {
        await add();
        const captured = await read();
        await client.scriptFlush();
        expect(await read()).toEqual(captured);
        expect(await cleanup(captured)).toBe(1);
    });

    it("removes an orphaned queue head so it cannot starve real votes", async () => {
        await client.zadd(indexKey, { orphan: 0 });
        await add();
        expect(await read(1)).toEqual([]);
        expect((await read(1)).map(([key]) => key)).toEqual([member]);
    });

    it("keeps an entry readable when a later cache-index write fails", async () => {
        await client.set("test:opinion:1", "wrong-type");
        await expect(add({ sequence: 1 })).rejects.toBeInstanceOf(RequestError);
        expect(await read()).toHaveLength(1);
        // No successful command receipt is fabricated after a partial Lua error.
        expect(
            await client.get(`test:order:${member}:${sessionId}`),
        ).toBeNull();
    });

    it("reports wrong-type errors instead of acknowledging an enqueue", async () => {
        await client.set(indexKey, "wrong-type");
        await expect(add()).rejects.toBeInstanceOf(RequestError);
        expect(await client.ping()).toBe("PONG");
    });

    it("completes concurrent script-cache misses", async () => {
        await add();
        await client.scriptFlush();
        const results = await Promise.all(
            Array.from({ length: 30 }, () => read(1)),
        );
        expect(
            results.every(
                (result) =>
                    JSON.stringify(result) === JSON.stringify(results[0]),
            ),
        ).toBe(true);
    });

    it("distinguishes an executing Lua timeout from a completed failed script", async () => {
        const impatient = await GlideClient.createClient({
            addresses: [
                {
                    host: container.getHost(),
                    port: container.getMappedPort(6379),
                },
            ],
            requestTimeout: 100,
        });
        const endless = new Script("while true do end");
        await client.customCommand(["CONFIG", "SET", "lua-time-limit", "50"]);
        try {
            await expect(
                impatient.invokeScript(endless),
            ).rejects.toBeInstanceOf(TimeoutError);
            await expect(client.ping()).rejects.toBeInstanceOf(RequestError);
        } finally {
            try {
                await client.scriptKill();
                await client.customCommand([
                    "CONFIG",
                    "SET",
                    "lua-time-limit",
                    "5000",
                ]);
            } finally {
                endless.release();
                impatient.close();
            }
        }
        expect(await client.ping()).toBe("PONG");
    });
});
