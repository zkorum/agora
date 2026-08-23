import { describe, expect, it } from "vitest";
import {
    isTerminalExerciseDeliveryStatus,
    monitorExerciseDelivery,
    type ConversationEmailUpdateDeliveryStatus,
    type ExerciseDelivery,
} from "./workerRuntime.js";

const terminalStatuses = [
    "stopped",
    "completed",
    "completed_with_failures",
    "failed",
] satisfies readonly ConversationEmailUpdateDeliveryStatus[];
const nonTerminalStatuses = [
    "preparing",
    "queued",
    "sending",
    "stopping",
] satisfies readonly ConversationEmailUpdateDeliveryStatus[];

describe("development exercise delivery monitoring", () => {
    it.each(terminalStatuses)(
        "stops automatically for terminal status %s",
        (status) => {
            expect(isTerminalExerciseDeliveryStatus(status)).toBe(true);
        },
    );

    it.each(nonTerminalStatuses)(
        "continues monitoring non-terminal status %s",
        (status) => {
            expect(isTerminalExerciseDeliveryStatus(status)).toBe(false);
        },
    );

    it("reports status changes and returns the terminal delivery", async () => {
        const deliveries: ExerciseDelivery[] = [
            { id: 42, status: "preparing" },
            { id: 42, status: "preparing" },
            { id: 42, status: "sending" },
            { id: 42, status: "completed" },
        ];
        let readIndex = 0;
        const observedStatuses: ExerciseDelivery["status"][] = [];

        const result = await monitorExerciseDelivery({
            signal: new AbortController().signal,
            readDelivery: () => Promise.resolve(deliveries.at(readIndex++)),
            onStatusChange: (delivery) => {
                observedStatuses.push(delivery.status);
            },
            waitForNextPoll: () => Promise.resolve(),
        });

        expect(result).toEqual({ id: 42, status: "completed" });
        expect(observedStatuses).toEqual(["preparing", "sending", "completed"]);
    });

    it("returns incomplete when monitoring is aborted", async () => {
        const abortController = new AbortController();
        let statusChangeCount = 0;

        const result = await monitorExerciseDelivery({
            signal: abortController.signal,
            readDelivery: () => Promise.resolve(undefined),
            onStatusChange: () => {
                statusChangeCount += 1;
            },
            waitForNextPoll: () => {
                abortController.abort();
                return Promise.resolve();
            },
        });

        expect(result).toBeUndefined();
        expect(statusChangeCount).toBe(0);
    });
});
