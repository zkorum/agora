import { describe, expect, it } from "vitest";
import {
    parseConversationEmailUpdateWorkWake,
    runWithConcurrency,
    type ConversationEmailUpdateWorkWake,
} from "./worker.js";
import { createWakeableLane } from "./workerLane.js";

function deferredVoid(): {
    promise: Promise<void>;
    resolve: () => void;
} {
    let resolvePromise: (() => void) | undefined;
    const promise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
    });
    return {
        promise,
        resolve: () => {
            resolvePromise?.();
        },
    };
}

describe("worker concurrency", () => {
    it("finishes every claimed item before reporting an item failure", async () => {
        const processed: number[] = [];

        await expect(
            runWithConcurrency({
                items: [1, 2, 3, 4],
                concurrency: 2,
                process: async (item) => {
                    processed.push(item);
                    if (item === 1) throw new Error("item failed");
                    await Promise.resolve();
                },
            }),
        ).rejects.toThrow("item failed");

        expect(processed.toSorted()).toEqual([1, 2, 3, 4]);
    });

    it("coalesces wakes and never overlaps lane iterations", async () => {
        const lane = createWakeableLane();
        const firstIteration = deferredVoid();
        const secondIteration = deferredVoid();
        let iterationCount = 0;
        let activeCount = 0;
        let maximumActiveCount = 0;
        let running = true;

        const lanePromise = lane.run({
            canIterate: () => running,
            intervalMs: 60_000,
            iterate: async () => {
                iterationCount += 1;
                activeCount += 1;
                maximumActiveCount = Math.max(maximumActiveCount, activeCount);
                if (iterationCount === 1) await firstIteration.promise;
                if (iterationCount === 2) await secondIteration.promise;
                activeCount -= 1;
            },
        });

        await expect.poll(() => iterationCount).toBe(1);
        lane.wake();
        lane.wake();
        lane.wake();
        firstIteration.resolve();
        await expect.poll(() => iterationCount).toBe(2);
        expect(maximumActiveCount).toBe(1);

        running = false;
        secondIteration.resolve();
        lane.wake();
        await lanePromise;
        expect(iterationCount).toBe(2);
        expect(maximumActiveCount).toBe(1);
    });

    it("supports an earlier scheduled wake without overlapping", async () => {
        const lane = createWakeableLane();
        let iterationCount = 0;
        let running = true;
        const lanePromise = lane.run({
            canIterate: () => running,
            intervalMs: 60_000,
            iterate: () => {
                iterationCount += 1;
                return Promise.resolve();
            },
        });

        await expect.poll(() => iterationCount).toBe(1);
        lane.wakeAfter(5);
        await expect.poll(() => iterationCount).toBe(2);

        running = false;
        lane.wake();
        await lanePromise;
    });

    it("parses known notification payloads", () => {
        const payloads: ConversationEmailUpdateWorkWake[] = [
            "delivery",
            "recipient",
            "sns",
            "test",
        ];
        expect(payloads.map(parseConversationEmailUpdateWorkWake)).toEqual(
            payloads,
        );
    });

    it("falls back to a full reconciliation for unknown payloads", () => {
        expect(
            parseConversationEmailUpdateWorkWake("future-work-kind"),
        ).toBeUndefined();
    });
});
