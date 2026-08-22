import { describe, expect, it } from "vitest";
import { decideRetryState } from "./retry.js";

describe("conversation email retry decisions", () => {
    it("uses the fixed explicit-rejection schedule", () => {
        expect(
            decideRetryState({
                outcome: "retryable_rejected",
                attemptNumber: 1,
            }),
        ).toEqual({ kind: "retry_wait", delayMs: 30_000 });
        expect(
            decideRetryState({
                outcome: "retryable_rejected",
                attemptNumber: 2,
            }),
        ).toEqual({ kind: "retry_wait", delayMs: 300_000 });
        expect(
            decideRetryState({
                outcome: "retryable_rejected",
                attemptNumber: 3,
            }),
        ).toEqual({ kind: "permanent_failed" });
    });

    it("never retries unknown or permanent outcomes", () => {
        expect(
            decideRetryState({ outcome: "unknown", attemptNumber: 1 }),
        ).toEqual({ kind: "unknown" });
        expect(
            decideRetryState({
                outcome: "permanent_rejected",
                attemptNumber: 1,
            }),
        ).toEqual({ kind: "permanent_failed" });
    });
});
