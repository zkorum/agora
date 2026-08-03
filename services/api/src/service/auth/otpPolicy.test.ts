import { describe, expect, it } from "vitest";
import { decideDestinationWrongGuess } from "./otpPolicy.js";

const now = new Date("2026-08-01T00:00:00.000Z");

describe("destination OTP guess policy", () => {
    it("shares a guess budget across challenges", () => {
        const decision = decideDestinationWrongGuess({
            state: {
                wrongGuessAttemptAmount: 8,
                consecutiveFailedVerifyAttempts: 0,
                backoffUntil: null,
                updatedAt: now,
            },
            now,
            maxWrongGuesses: 10,
            throttleSecondsInterval: 10,
        });
        expect(decision).toMatchObject({
            type: "wrong_guess_allowed",
            state: { wrongGuessAttemptAmount: 9 },
        });
    });

    it("starts destination backoff at the shared threshold", () => {
        const decision = decideDestinationWrongGuess({
            state: {
                wrongGuessAttemptAmount: 9,
                consecutiveFailedVerifyAttempts: 0,
                backoffUntil: null,
                updatedAt: now,
            },
            now,
            maxWrongGuesses: 10,
            throttleSecondsInterval: 10,
        });
        expect(decision).toEqual({
            type: "throttled",
            state: {
                wrongGuessAttemptAmount: 0,
                consecutiveFailedVerifyAttempts: 1,
                backoffUntil: new Date("2026-08-01T00:00:30.000Z"),
                updatedAt: now,
            },
            nextCodeSoonestTime: new Date("2026-08-01T00:00:30.000Z"),
        });
    });

    it("does not consume guesses during active backoff", () => {
        const backoffUntil = new Date("2026-08-01T00:01:00.000Z");
        expect(
            decideDestinationWrongGuess({
                state: {
                    wrongGuessAttemptAmount: 0,
                    consecutiveFailedVerifyAttempts: 2,
                    backoffUntil,
                    updatedAt: now,
                },
                now,
                maxWrongGuesses: 10,
                throttleSecondsInterval: 10,
            }),
        ).toEqual({
            type: "throttled",
            state: {
                wrongGuessAttemptAmount: 0,
                consecutiveFailedVerifyAttempts: 2,
                backoffUntil,
                updatedAt: now,
            },
            nextCodeSoonestTime: backoffUntil,
        });
    });
});
