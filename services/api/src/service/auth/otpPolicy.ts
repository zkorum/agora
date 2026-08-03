const OTP_DESTINATION_STREAK_RESET_MS = 24 * 60 * 60 * 1000;
const OTP_MIN_BACKOFF_SECONDS = 30;
const OTP_MAX_BACKOFF_SECONDS = 60 * 60;

export interface DestinationGuessState {
    wrongGuessAttemptAmount: number;
    consecutiveFailedVerifyAttempts: number;
    backoffUntil: Date | null;
    updatedAt: Date;
}

export type DestinationGuessDecision =
    | {
          type: "wrong_guess_allowed";
          state: DestinationGuessState;
      }
    | {
          type: "throttled";
          state: DestinationGuessState;
          nextCodeSoonestTime: Date;
      };

function resetStaleState({
    state,
    now,
}: {
    state: DestinationGuessState;
    now: Date;
}): DestinationGuessState {
    if (
        now.getTime() - state.updatedAt.getTime() <
        OTP_DESTINATION_STREAK_RESET_MS
    ) {
        return state;
    }
    return {
        wrongGuessAttemptAmount: 0,
        consecutiveFailedVerifyAttempts: 0,
        backoffUntil: null,
        updatedAt: state.updatedAt,
    };
}

function getBackoffUntil({
    now,
    consecutiveFailedVerifyAttempts,
    throttleSecondsInterval,
}: {
    now: Date;
    consecutiveFailedVerifyAttempts: number;
    throttleSecondsInterval: number;
}): Date {
    const baseSeconds = Math.max(
        throttleSecondsInterval,
        OTP_MIN_BACKOFF_SECONDS,
    );
    const backoffSeconds = Math.min(
        baseSeconds * 2 ** (consecutiveFailedVerifyAttempts - 1),
        OTP_MAX_BACKOFF_SECONDS,
    );
    return new Date(now.getTime() + backoffSeconds * 1000);
}

export function decideDestinationWrongGuess({
    state: providedState,
    now,
    maxWrongGuesses,
    throttleSecondsInterval,
}: {
    state: DestinationGuessState;
    now: Date;
    maxWrongGuesses: number;
    throttleSecondsInterval: number;
}): DestinationGuessDecision {
    const state = resetStaleState({ state: providedState, now });
    if (state.backoffUntil !== null && state.backoffUntil > now) {
        return {
            type: "throttled",
            state,
            nextCodeSoonestTime: state.backoffUntil,
        };
    }

    const wrongGuessAttemptAmount = state.wrongGuessAttemptAmount + 1;
    if (wrongGuessAttemptAmount < maxWrongGuesses) {
        return {
            type: "wrong_guess_allowed",
            state: {
                ...state,
                wrongGuessAttemptAmount,
                backoffUntil: null,
                updatedAt: now,
            },
        };
    }

    const consecutiveFailedVerifyAttempts =
        state.consecutiveFailedVerifyAttempts + 1;
    const backoffUntil = getBackoffUntil({
        now,
        consecutiveFailedVerifyAttempts,
        throttleSecondsInterval,
    });
    return {
        type: "throttled",
        state: {
            wrongGuessAttemptAmount: 0,
            consecutiveFailedVerifyAttempts,
            backoffUntil,
            updatedAt: now,
        },
        nextCodeSoonestTime: backoffUntil,
    };
}
