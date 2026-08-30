import { describe, expect, it } from "vitest";
import { createSendRateBudget } from "./sendRateBudget.js";

describe("send rate budget", () => {
    it("shares available capacity fairly between send kinds", () => {
        const budget = createSendRateBudget({ sendsPerSecond: 5 });

        expect(budget.take({ kind: "test", maximum: 25 })).toMatchObject({
            count: 3,
            preferredKind: "recipient",
        });
        expect(budget.take({ kind: "test", maximum: 25 })).toMatchObject({
            count: 0,
            preferredKind: "recipient",
        });
        expect(budget.take({ kind: "recipient", maximum: 25 })).toMatchObject({
            count: 2,
            preferredKind: "test",
        });
    });

    it("returns the next token deadline for fractional rates", () => {
        let now = 0;
        const budget = createSendRateBudget({
            sendsPerSecond: 0.5,
            now: () => now,
        });

        expect(budget.take({ kind: "test", maximum: 1 }).count).toBe(1);
        expect(
            budget.take({ kind: "recipient", maximum: 1 }).retryAfterMs,
        ).toBe(2_000);
        now = 2_000;
        expect(budget.take({ kind: "recipient", maximum: 1 }).count).toBe(1);
    });

    it("wakes only a send kind that was denied capacity", () => {
        const budget = createSendRateBudget({ sendsPerSecond: 1 });

        expect(budget.take({ kind: "test", maximum: 1 }).count).toBe(1);
        expect(budget.take({ kind: "recipient", maximum: 1 }).count).toBe(0);
        expect(budget.release(1)).toBe("recipient");
        expect(budget.take({ kind: "recipient", maximum: 1 }).count).toBe(1);
        expect(budget.release(1)).toBeUndefined();
    });
});
