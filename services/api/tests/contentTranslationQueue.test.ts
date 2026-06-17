import { Decoder, GlideClient, Script } from "@valkey/valkey-glide";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
    buildContentTranslationQueueScore,
    CONTENT_TRANSLATION_QUEUE_PRIORITIES,
    CONTENT_TRANSLATION_USER_RATE_LIMIT_SCRIPT,
    consumeContentTranslationUserRateLimit,
    ENQUEUE_CONTENT_TRANSLATION_WORK_SCRIPT,
} from "../src/shared-backend/contentTranslationQueue.js";

// Podman cannot mount its API socket into Ryuk on macOS reliably. The existing
// testcontainers cleanup container then fails before Valkey starts, so disable
// Ryuk for this focused integration test and let afterAll stop the container.
process.env.TESTCONTAINERS_RYUK_DISABLED ??= "true";

describe("content translation queue Lua script", () => {
    let container: StartedTestContainer;
    let client: GlideClient;
    let enqueueScript: Script;
    let rateLimitScript: Script;

    const queueKey = "test:content-translation:dirty";
    const userRateLimitKeyPrefix = "content-translation:rate-limit:user:";

    beforeAll(async () => {
        container = await new GenericContainer("valkey/valkey:8")
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
        enqueueScript = new Script(ENQUEUE_CONTENT_TRANSLATION_WORK_SCRIPT);
        rateLimitScript = new Script(CONTENT_TRANSLATION_USER_RATE_LIMIT_SCRIPT);
    }, 60_000);

    afterAll(async () => {
        enqueueScript?.release();
        rateLimitScript?.release();
        client?.close();
        await container?.stop();
    });

    beforeEach(async () => {
        await client.del([queueKey]);
        await client.del([
            `${userRateLimitKeyPrefix}user-a`,
            `${userRateLimitKeyPrefix}user-b`,
        ]);
    });

    async function enqueue({
        workId,
        score,
    }: {
        workId: number;
        score: number;
    }): Promise<unknown> {
        return await client.invokeScript(enqueueScript, {
            keys: [queueKey],
            args: [String(workId), String(score)],
        });
    }

    it("adds a new work id", async () => {
        const score = buildContentTranslationQueueScore({
            priority: CONTENT_TRANSLATION_QUEUE_PRIORITIES.eagerVisible,
            enqueuedAtMs: 1_000,
        });

        const result = await enqueue({ workId: 42, score });

        expect(result).toBe(1);
        expect(await client.zcard(queueKey)).toBe(1);
        expect(await client.zscore(queueKey, "42")).toBe(score);
    });

    it("does not duplicate an existing work id", async () => {
        const firstScore = buildContentTranslationQueueScore({
            priority: CONTENT_TRANSLATION_QUEUE_PRIORITIES.eagerVisible,
            enqueuedAtMs: 1_000,
        });
        const secondScore = buildContentTranslationQueueScore({
            priority: CONTENT_TRANSLATION_QUEUE_PRIORITIES.eagerVisible,
            enqueuedAtMs: 2_000,
        });

        await enqueue({ workId: 42, score: firstScore });
        const result = await enqueue({ workId: 42, score: secondScore });

        expect(result).toBe(0);
        expect(await client.zcard(queueKey)).toBe(1);
        expect(await client.zscore(queueKey, "42")).toBe(firstScore);
    });

    it("escalates existing work when the next score is lower", async () => {
        const eagerScore = buildContentTranslationQueueScore({
            priority: CONTENT_TRANSLATION_QUEUE_PRIORITIES.eagerVisible,
            enqueuedAtMs: 1_000,
        });
        const userInteractiveScore = buildContentTranslationQueueScore({
            priority: CONTENT_TRANSLATION_QUEUE_PRIORITIES.userInteractive,
            enqueuedAtMs: 2_000,
        });

        await enqueue({ workId: 42, score: eagerScore });
        const result = await enqueue({ workId: 42, score: userInteractiveScore });

        expect(result).toBe(1);
        expect(await client.zscore(queueKey, "42")).toBe(userInteractiveScore);
    });

    it("does not downgrade existing work when the next score is higher", async () => {
        const userInteractiveScore = buildContentTranslationQueueScore({
            priority: CONTENT_TRANSLATION_QUEUE_PRIORITIES.userInteractive,
            enqueuedAtMs: 1_000,
        });
        const maintenanceScore = buildContentTranslationQueueScore({
            priority: CONTENT_TRANSLATION_QUEUE_PRIORITIES.maintenance,
            enqueuedAtMs: 2_000,
        });

        await enqueue({ workId: 42, score: userInteractiveScore });
        const result = await enqueue({ workId: 42, score: maintenanceScore });

        expect(result).toBe(0);
        expect(await client.zscore(queueKey, "42")).toBe(userInteractiveScore);
    });

    it("preserves the older queue position for duplicate same-priority work", async () => {
        const olderScore = buildContentTranslationQueueScore({
            priority: CONTENT_TRANSLATION_QUEUE_PRIORITIES.userInteractive,
            enqueuedAtMs: 1_000,
        });
        const newerScore = buildContentTranslationQueueScore({
            priority: CONTENT_TRANSLATION_QUEUE_PRIORITIES.userInteractive,
            enqueuedAtMs: 2_000,
        });

        await enqueue({ workId: 42, score: olderScore });
        const result = await enqueue({ workId: 42, score: newerScore });

        expect(result).toBe(0);
        expect(await client.zscore(queueKey, "42")).toBe(olderScore);
    });

    it("orders by priority first and timestamp second", async () => {
        await enqueue({
            workId: 1,
            score: buildContentTranslationQueueScore({
                priority: CONTENT_TRANSLATION_QUEUE_PRIORITIES.maintenance,
                enqueuedAtMs: 1,
            }),
        });
        await enqueue({
            workId: 2,
            score: buildContentTranslationQueueScore({
                priority: CONTENT_TRANSLATION_QUEUE_PRIORITIES.eagerVisible,
                enqueuedAtMs: 3,
            }),
        });
        await enqueue({
            workId: 3,
            score: buildContentTranslationQueueScore({
                priority: CONTENT_TRANSLATION_QUEUE_PRIORITIES.userInteractive,
                enqueuedAtMs: 2,
            }),
        });
        await enqueue({
            workId: 4,
            score: buildContentTranslationQueueScore({
                priority: CONTENT_TRANSLATION_QUEUE_PRIORITIES.userInteractive,
                enqueuedAtMs: 1,
            }),
        });

        const popped = await client.zpopmin(queueKey, { count: 4 });

        expect(popped.map(({ element }) => element)).toEqual([
            "4",
            "3",
            "2",
            "1",
        ]);
    });

    it("allows a user within the content translation request limit", async () => {
        const first = await consumeContentTranslationUserRateLimit({
            valkey: client,
            script: rateLimitScript,
            userId: "user-a",
            maxRequests: 2,
            windowMs: 60_000,
        });
        const second = await consumeContentTranslationUserRateLimit({
            valkey: client,
            script: rateLimitScript,
            userId: "user-a",
            maxRequests: 2,
            windowMs: 60_000,
        });

        expect(first).toMatchObject({ isAllowed: true, requestCount: 1 });
        expect(second).toMatchObject({ isAllowed: true, requestCount: 2 });
        expect(first.retryAfterMs).toBeGreaterThan(0);
    });

    it("rejects a user after the content translation request limit", async () => {
        await consumeContentTranslationUserRateLimit({
            valkey: client,
            script: rateLimitScript,
            userId: "user-a",
            maxRequests: 1,
            windowMs: 60_000,
        });

        const second = await consumeContentTranslationUserRateLimit({
            valkey: client,
            script: rateLimitScript,
            userId: "user-a",
            maxRequests: 1,
            windowMs: 60_000,
        });

        expect(second.isAllowed).toBe(false);
        expect(second.requestCount).toBe(2);
        expect(second.retryAfterMs).toBeGreaterThan(0);
    });

    it("limits content translation requests separately per user", async () => {
        await consumeContentTranslationUserRateLimit({
            valkey: client,
            script: rateLimitScript,
            userId: "user-a",
            maxRequests: 1,
            windowMs: 60_000,
        });
        await consumeContentTranslationUserRateLimit({
            valkey: client,
            script: rateLimitScript,
            userId: "user-a",
            maxRequests: 1,
            windowMs: 60_000,
        });

        const otherUser = await consumeContentTranslationUserRateLimit({
            valkey: client,
            script: rateLimitScript,
            userId: "user-b",
            maxRequests: 1,
            windowMs: 60_000,
        });

        expect(otherUser).toMatchObject({ isAllowed: true, requestCount: 1 });
    });
});
