export type SendKind = "recipient" | "test";

export interface SendRateReservation {
    count: number;
    preferredKind: SendKind;
    retryAfterMs: number | undefined;
}

export interface SendRateBudget {
    release: (count: number) => SendKind | undefined;
    take: ({
        kind,
        maximum,
    }: {
        kind: SendKind;
        maximum: number;
    }) => SendRateReservation;
}

export function createSendRateBudget({
    sendsPerSecond,
    now = Date.now,
}: {
    sendsPerSecond: number;
    now?: () => number;
}): SendRateBudget {
    const bucketCapacity = Math.max(1, sendsPerSecond);
    let available = bucketCapacity;
    let lastRefill = now();
    let preferredKind: SendKind = "test";
    let nextGrantLimit: number | undefined;
    const waitingKinds = new Set<SendKind>();

    const refill = (): void => {
        const currentTime = now();
        available = Math.min(
            bucketCapacity,
            available + ((currentTime - lastRefill) / 1_000) * sendsPerSecond,
        );
        lastRefill = currentTime;
    };

    return {
        release: (count) => {
            available = Math.min(
                bucketCapacity,
                available + Math.max(0, count),
            );
            if (available < 1) return undefined;
            if (waitingKinds.has(preferredKind)) return preferredKind;
            const otherKind = preferredKind === "test" ? "recipient" : "test";
            return waitingKinds.has(otherKind) ? otherKind : undefined;
        },
        take: ({ kind, maximum }) => {
            refill();
            const wholeTokens = Math.floor(available);
            if (wholeTokens === 0) {
                waitingKinds.add(kind);
                return {
                    count: 0,
                    preferredKind,
                    retryAfterMs: Math.max(
                        1,
                        Math.ceil(((1 - available) / sendsPerSecond) * 1_000),
                    ),
                };
            }
            if (kind !== preferredKind) {
                waitingKinds.add(kind);
                return { count: 0, preferredKind, retryAfterMs: undefined };
            }
            waitingKinds.delete(kind);

            const count = Math.min(
                maximum,
                nextGrantLimit ?? Math.ceil(wholeTokens / 2),
            );
            available -= count;
            nextGrantLimit =
                nextGrantLimit === undefined && wholeTokens - count > 0
                    ? wholeTokens - count
                    : undefined;
            preferredKind = kind === "test" ? "recipient" : "test";
            return { count, preferredKind, retryAfterMs: undefined };
        },
    };
}
