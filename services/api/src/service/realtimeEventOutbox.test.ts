import { describe, expect, it, vi } from "vitest";
import { createCatchupRequestQueue } from "./realtimeEventOutbox.js";

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
