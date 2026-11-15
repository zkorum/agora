import { describe, expect, it, vi } from "vitest";
import {
    createCatchupRequestQueue,
    parseRealtimeEventOutboxRow,
} from "./realtimeEventOutbox.js";

function createVoidDeferred(): {
    promise: Promise<void>;
    resolve: () => void;
} {
    let resolveDeferred = (): void => undefined;
    const promise = new Promise<void>((resolve) => {
        resolveDeferred = resolve;
    });
    return { promise, resolve: resolveDeferred };
}

describe("realtime outbox catch-up request queue", () => {
    it("replays comparison item invalidations without accepting content or score fields", () => {
        const row = {
            id: 3,
            eventType: "comparison_items_updated",
            payload: { conversationSlugId: "convo001", timestamp: 1 },
        };
        expect(parseRealtimeEventOutboxRow(row)).toEqual({
            id: row.id,
            event: row.eventType,
            data: row.payload,
        });
        expect(
            parseRealtimeEventOutboxRow({
                ...row,
                payload: { ...row.payload, statement: "Private statement" },
            }),
        ).toBeUndefined();
    });
    it("projects participant-only QV updates without permitting lifecycle fields", () => {
        const row = {
            id: 2,
            eventType: "conversation_qv_stats_updated",
            payload: {
                conversationSlugId: "qvtest01",
                qvStatsRevision: 3,
                participantCount: 8,
            },
        };
        expect(parseRealtimeEventOutboxRow(row)).toEqual({
            id: 2,
            event: row.eventType,
            data: row.payload,
        });
        expect(
            parseRealtimeEventOutboxRow({
                ...row,
                payload: { ...row.payload, isClosed: true },
            }),
        ).toBeUndefined();
    });
    it("projects legacy text-bearing replay rows to content-free invalidation events", () => {
        const event = parseRealtimeEventOutboxRow({
            id: 1,
            eventType: "opinion_updated",
            payload: {
                conversationSlugId: "convo001",
                opinionSlugId: "source01",
                previousSourceVersion: "00000000-0000-4000-8000-000000000001",
                sourceVersion: "00000000-0000-4000-8000-000000000002",
                opinion: "PRIVATE RECOVERY SOURCE",
                sourceLanguageCode: "en",
                timestamp: 1,
            },
        });
        expect(event).toMatchObject({
            id: 1,
            event: "opinion_source_changed",
            data: { opinionSlugId: "source01" },
        });
        expect(JSON.stringify(event)).not.toContain("PRIVATE RECOVERY SOURCE");
        expect(event?.data).not.toHaveProperty("opinion");
    });
    it("runs a requested task", async () => {
        const task = vi.fn<() => Promise<void>>(() => Promise.resolve());
        const onError = vi.fn<(error: unknown) => void>();
        const queue = createCatchupRequestQueue({ task, onError });

        queue.request();
        await queue.waitForIdle();

        expect(task).toHaveBeenCalledTimes(1);
        expect(onError).not.toHaveBeenCalled();
    });

    it("runs one follow-up when requests arrive during a task", async () => {
        const firstTaskStarted = createVoidDeferred();
        const releaseFirstTask = createVoidDeferred();
        let invocationCount = 0;
        const task = vi.fn<() => Promise<void>>(async () => {
            invocationCount += 1;
            if (invocationCount === 1) {
                firstTaskStarted.resolve();
                await releaseFirstTask.promise;
            }
        });
        const onError = vi.fn<(error: unknown) => void>();
        const queue = createCatchupRequestQueue({ task, onError });

        queue.request();
        await firstTaskStarted.promise;
        queue.request();
        queue.request();
        releaseFirstTask.resolve();
        await queue.waitForIdle();

        expect(task).toHaveBeenCalledTimes(2);
        expect(onError).not.toHaveBeenCalled();
    });

    it("reports a failure without immediately retrying", async () => {
        const error = new Error("database unavailable");
        const task = vi
            .fn<() => Promise<void>>()
            .mockRejectedValueOnce(error)
            .mockResolvedValue(undefined);
        const onError = vi.fn<(error: unknown) => void>();
        const queue = createCatchupRequestQueue({ task, onError });

        queue.request();
        queue.request();
        await queue.waitForIdle();

        expect(task).toHaveBeenCalledTimes(1);
        expect(onError).toHaveBeenCalledWith(error);

        queue.request();
        await queue.waitForIdle();
        expect(task).toHaveBeenCalledTimes(2);
    });
});
