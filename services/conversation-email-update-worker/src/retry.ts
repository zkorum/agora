export const MAX_SEND_ATTEMPTS = 3;

export type RetryDecision =
    | { kind: "retry_wait"; delayMs: number }
    | { kind: "permanent_failed" }
    | { kind: "unknown" };

export function decideRetryState({
    outcome,
    attemptNumber,
}: {
    outcome: "retryable_rejected" | "permanent_rejected" | "unknown";
    attemptNumber: number;
}): RetryDecision {
    if (outcome === "unknown") return { kind: "unknown" };
    if (
        outcome === "permanent_rejected" ||
        attemptNumber >= MAX_SEND_ATTEMPTS
    ) {
        return { kind: "permanent_failed" };
    }
    return {
        kind: "retry_wait",
        delayMs: attemptNumber === 1 ? 30_000 : 300_000,
    };
}
