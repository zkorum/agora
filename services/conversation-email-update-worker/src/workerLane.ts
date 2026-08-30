import { setTimeout } from "node:timers/promises";

export interface WakeableLane {
    run: ({
        canIterate,
        intervalMs,
        iterate,
    }: {
        canIterate: () => boolean;
        intervalMs: number;
        iterate: () => Promise<void>;
    }) => Promise<void>;
    wake: () => void;
    wakeAfter: (delayMs: number) => void;
}

export function createWakeableLane(): WakeableLane {
    let wakePending = true;
    let resolveWait: (() => void) | undefined;
    let scheduledWakeController: AbortController | undefined;
    let scheduledWakeAt: number | undefined;

    const cancelScheduledWake = (): void => {
        scheduledWakeController?.abort();
        scheduledWakeController = undefined;
        scheduledWakeAt = undefined;
    };

    const wake = (): void => {
        cancelScheduledWake();
        if (wakePending) return;
        wakePending = true;
        resolveWait?.();
    };

    const wakeAfter = (delayMs: number): void => {
        if (wakePending) return;
        const wakeAt = Date.now() + delayMs;
        if (scheduledWakeAt !== undefined && scheduledWakeAt <= wakeAt) return;

        cancelScheduledWake();
        const controller = new AbortController();
        scheduledWakeController = controller;
        scheduledWakeAt = wakeAt;
        void (async () => {
            try {
                await setTimeout(delayMs, undefined, {
                    signal: controller.signal,
                });
                if (scheduledWakeController === controller) wake();
            } catch (error: unknown) {
                if (!controller.signal.aborted) throw error;
            }
        })();
    };

    const waitForWake = async (intervalMs: number): Promise<void> => {
        if (wakePending) {
            wakePending = false;
            return;
        }

        const timerController = new AbortController();
        const wakePromise = new Promise<void>((resolve) => {
            resolveWait = resolve;
        });
        const timerPromise = setTimeout(intervalMs, undefined, {
            signal: timerController.signal,
        }).catch((error: unknown) => {
            if (!timerController.signal.aborted) throw error;
        });

        try {
            await Promise.race([wakePromise, timerPromise]);
        } finally {
            resolveWait = undefined;
            timerController.abort();
            await timerPromise;
        }

        wakePending = false;
    };

    return {
        wake,
        wakeAfter,
        run: async ({ canIterate, intervalMs, iterate }) => {
            try {
                while (canIterate()) {
                    await waitForWake(intervalMs);
                    if (!canIterate()) return;
                    await iterate();
                }
            } finally {
                cancelScheduledWake();
            }
        },
    };
}
