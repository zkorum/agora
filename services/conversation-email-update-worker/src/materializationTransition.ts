export type MaterializationFailureDecision =
    | { kind: "retry"; failureCount: number }
    | { kind: "failed"; failureCount: number };

export function decideMaterializationFailure({
    previousFailureCount,
    maximumFailureCount,
}: {
    previousFailureCount: number;
    maximumFailureCount: number;
}): MaterializationFailureDecision {
    const failureCount = previousFailureCount + 1;
    return {
        kind: failureCount >= maximumFailureCount ? "failed" : "retry",
        failureCount,
    };
}
