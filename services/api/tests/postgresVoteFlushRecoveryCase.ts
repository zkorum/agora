import { connect, createServer, type Socket } from "node:net";
import { Decoder, GlideClient } from "@valkey/valkey-glide";
import { eq, sql } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { GenericContainer } from "testcontainers";
import { expect, vi } from "vitest";
import { z } from "zod";
import type { createVoteBuffer } from "../src/service/voteBuffer.js";
import {
    conversationTable,
    opinionTable,
    userTable,
    voteContentTable,
    voteTable,
} from "../src/shared-backend/schema.js";
import { VALKEY_QUEUE_KEYS } from "../src/shared-backend/valkeyQueues.js";

async function createResetProxy({
    host,
    port,
}: {
    host: string;
    port: number;
}) {
    const pairs = new Set<{ client: Socket; upstream: Socket }>();
    const server = createServer((client) => {
        const upstream = connect({ host, port });
        const pair = { client, upstream };
        pairs.add(pair);
        client.on("error", () => undefined);
        upstream.on("error", () => undefined);
        client.on("close", () => {
            upstream.destroy();
            pairs.delete(pair);
        });
        upstream.on("close", () => {
            client.destroy();
            pairs.delete(pair);
        });
        client.pipe(upstream).pipe(client);
    });
    await new Promise<void>((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", resolve);
    });
    const address = server.address();
    if (address === null || typeof address === "string") {
        throw new Error("Missing test proxy port");
    }
    function reset(): void {
        const pair = Array.from(pairs).at(-1);
        if (pair === undefined) throw new Error("Missing test connection");
        pair.upstream.destroy();
        pair.client.resetAndDestroy();
        pairs.delete(pair);
    }
    async function close(): Promise<void> {
        for (const { client, upstream } of pairs) {
            client.destroy();
            upstream.destroy();
        }
        pairs.clear();
        await new Promise<void>((resolve, reject) => {
            server.close((error) => {
                if (error !== undefined) reject(error);
                else resolve();
            });
        });
    }
    return { port: address.port, reset, close };
}

type Settlement = "resolved" | "rejected" | "pending";

async function observe(promise: PromiseLike<unknown>): Promise<Settlement> {
    let timer: NodeJS.Timeout | undefined;
    try {
        return await Promise.race([
            (async (): Promise<Settlement> => {
                try {
                    await promise;
                    return "resolved";
                } catch {
                    return "rejected";
                }
            })(),
            new Promise<Settlement>((resolve) => {
                timer = setTimeout(() => {
                    resolve("pending");
                }, 5000);
            }),
        ]);
    } finally {
        if (timer !== undefined) clearTimeout(timer);
    }
}

export async function assertPostgresVoteFlushRecovery({
    db,
    host,
    port,
    opinionId,
    opinionContentId,
    conversationId,
    authorId,
    createBuffer,
}: {
    db: PostgresJsDatabase;
    host: string;
    port: number;
    opinionId: number;
    opinionContentId: number;
    conversationId: number;
    authorId: string;
    createBuffer: typeof createVoteBuffer;
}): Promise<void> {
    const proxy = await createResetProxy({ host, port });
    const writer = postgres({
        host: "127.0.0.1",
        port: proxy.port,
        username: "postgres",
        password: "postgres",
        database: "agora_test",
        max: 10,
        connect_timeout: 2,
        connection: { application_name: "vote-flush-reset-test" },
    });
    const reservations: postgres.ReservedSql[] = [];
    const cache = await new GenericContainer("valkey/valkey:8-alpine")
        .withExposedPorts(6379)
        .start();
    const valkey = await GlideClient.createClient({
        addresses: [{ host: cache.getHost(), port: cache.getMappedPort(6379) }],
        defaultDecoder: Decoder.String,
    });
    const valkeyRef: { current: GlideClient | undefined } = { current: valkey };
    const buffer = createBuffer({
        db: drizzle(writer),
        valkeyRef,
        flushIntervalMs: 60_000,
        valkeyBatchLimit: 100,
    });
    let activeFlush: Promise<void> | undefined;
    let bufferStopped = false;
    try {
        // Keep the API's pool size of ten, with nine healthy connections busy,
        // so the flush must reuse the connection that experienced the reset.
        for (let index = 0; index < 9; index++) {
            reservations.push(await writer.reserve());
        }
        await drizzle(writer)
            .select({ id: conversationTable.id })
            .from(conversationTable)
            .limit(1);
        const interrupted = observe(
            writer.begin(async (tx) => {
                // Exercise the driver's transaction handle directly, including
                // its own rollback after the reset, rather than an ORM wrapper.
                await tx`update "user" set total_opinion_count = 999 where id = ${authorId}`;
                await tx`select pg_sleep(2)`;
            }),
        );
        // pg_stat_activity is a PostgreSQL catalog with no application model.
        // Parse its raw results and synchronize on actual server work, not sleeps.
        await vi.waitFor(
            async () => {
                const rows = z.array(z.object({ count: z.number() })).parse(
                    await db.execute(sql`
                    SELECT count(*)::integer AS count FROM pg_stat_activity
                    WHERE application_name = 'vote-flush-reset-test'
                      AND wait_event = 'PgSleep'
                `),
                );
                expect(rows).toEqual([{ count: 1 }]);
            },
            { timeout: 5000 },
        );
        // No mocked promises: the driver's own transaction error handler sends
        // ROLLBACK between the socket's error and close events.
        proxy.reset();
        expect(await interrupted).toBe("rejected");
        await vi.waitFor(
            async () => {
                const rows = z.array(z.object({ count: z.number() })).parse(
                    await db.execute(sql`
                    SELECT count(*)::integer AS count FROM pg_stat_activity
                    WHERE application_name = 'vote-flush-reset-test'
                      AND xact_start IS NOT NULL
                `),
                );
                expect(rows).toEqual([{ count: 0 }]);
            },
            { timeout: 5000 },
        );
        expect(
            await db
                .select({ count: userTable.totalOpinionCount })
                .from(userTable)
                .where(eq(userTable.id, authorId)),
        ).toEqual([{ count: 1 }]);

        await buffer.add({
            vote: {
                userId: authorId,
                opinionId,
                opinionContentId,
                conversationId,
                vote: "agree",
                timestamp: new Date(),
            },
        });
        activeFlush = buffer.flush();
        expect(
            await observe(activeFlush),
            "vote flushing must recover after an earlier reset",
        ).toBe("resolved");
        expect(await valkey.hlen(VALKEY_QUEUE_KEYS.VOTE_BUFFER_DATA)).toBe(0);
        expect(
            await db
                .select({ choice: voteContentTable.vote })
                .from(voteTable)
                .innerJoin(
                    voteContentTable,
                    eq(voteContentTable.id, voteTable.currentContentId),
                )
                .where(eq(voteTable.opinionId, opinionId)),
        ).toEqual([{ choice: "agree" }]);
        expect(
            await db
                .select({ agrees: opinionTable.numAgrees })
                .from(opinionTable)
                .where(eq(opinionTable.id, opinionId)),
        ).toEqual([{ agrees: 1 }]);

        await buffer.add({
            vote: {
                userId: authorId,
                opinionId,
                opinionContentId,
                conversationId,
                vote: "cancel",
                timestamp: new Date(),
            },
        });
        activeFlush = buffer.flush();
        expect(await observe(activeFlush)).toBe("resolved");
        expect(
            await db
                .select({ content: voteTable.currentContentId })
                .from(voteTable)
                .where(eq(voteTable.opinionId, opinionId)),
        ).toEqual([{ content: null }]);
        expect(
            await db
                .select({ agrees: opinionTable.numAgrees })
                .from(opinionTable)
                .where(eq(opinionTable.id, opinionId)),
        ).toEqual([{ agrees: 0 }]);
        expect(await valkey.hlen(VALKEY_QUEUE_KEYS.VOTE_BUFFER_DATA)).toBe(0);
        expect(await valkey.zcard(VALKEY_QUEUE_KEYS.VOTE_BUFFER_INDEX)).toBe(0);

        expect(
            await db
                .select({ id: conversationTable.id })
                .from(conversationTable),
        ).toHaveLength(1);
        for (const healthy of reservations) {
            // Reserved handles lack the runtime options required by Drizzle.
            // Parse this direct-driver probe instead of casting the handle.
            const rows = z
                .array(z.object({ count: z.number() }))
                .parse(
                    await healthy`select count(*)::integer as count from conversation`,
                );
            expect(rows).toEqual([{ count: 1 }]);
        }

        const transactions = z.array(z.object({ count: z.number() })).parse(
            await db.execute(sql`
                SELECT count(*)::integer AS count FROM pg_stat_activity
                WHERE application_name = 'vote-flush-reset-test'
                  AND xact_start IS NOT NULL
            `),
        );
        expect(transactions).toEqual([{ count: 0 }]);

        // error() must clear dead-socket state without changing errored(): a
        // parameter-build error on a live connection must not consume the next
        // pipelined query's result.
        await Promise.all([
            expect(
                writer`select ${new Date(Number.NaN)}`.execute(),
            ).rejects.toBeInstanceOf(Error),
            expect(writer`select 42 as value`.execute()).resolves.toEqual([
                { value: 42 },
            ]),
        ]);

        // Stop the buffer while its durable admission database is still open.
        valkeyRef.current = undefined;
        await buffer.shutdown();
        bufferStopped = true;

        // A reset followed directly by shutdown also needs to clear query.
        // Otherwise end() waits forever even without a queued ROLLBACK.
        const interruptedAgain = observe(writer`select pg_sleep(2)`.execute());
        await vi.waitFor(
            async () => {
                const rows = z.array(z.object({ count: z.number() })).parse(
                    await db.execute(sql`
                    SELECT count(*)::integer AS count FROM pg_stat_activity
                    WHERE application_name = 'vote-flush-reset-test'
                      AND wait_event = 'PgSleep'
                `),
                );
                expect(rows).toEqual([{ count: 1 }]);
            },
            { timeout: 5000 },
        );
        proxy.reset();
        expect(await interruptedAgain).toBe("rejected");
        for (const reservation of reservations.splice(0)) reservation.release();
        // The fallback only bounds failed-test cleanup; healthy shutdown must
        // finish before observe's shorter five-second deadline.
        expect(await observe(writer.end({ timeout: 10 }))).toBe("resolved");
    } finally {
        try {
            for (const reservation of reservations) reservation.release();
            if (activeFlush !== undefined) {
                expect(await observe(activeFlush)).not.toBe("pending");
            }
            valkeyRef.current = undefined;
            try {
                if (!bufferStopped) await buffer.shutdown();
            } finally {
                await writer.end({ timeout: 0 });
                await proxy.close();
            }
        } finally {
            valkey.close();
            await cache.stop();
        }
    }
}
