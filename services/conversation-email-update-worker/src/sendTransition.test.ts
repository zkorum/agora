import { describe, expect, it } from "vitest";
import {
    decideOwnerGate,
    decideSendFinalization,
    decideTerminalDeliveryStatus,
} from "./sendTransition.js";

describe("conversation email send finalization", () => {
    it("keeps SNS acceptance when a stale failure finalizer runs", () => {
        expect(
            decideSendFinalization({
                attemptOutcome: "provider_accepted",
                attemptProviderMessageId: "sns-message-id",
                recipientStatus: "provider_accepted",
                failureFenced: false,
                result: {
                    kind: "retryable_rejected",
                    code: "ThrottlingException",
                    details: "stale provider result",
                },
                attemptNumber: 1,
            }),
        ).toEqual({
            kind: "provider_accepted",
            messageId: "sns-message-id",
            updateAttempt: false,
        });
    });

    it("repairs the recipient when SNS already accepted the attempt", () => {
        expect(
            decideSendFinalization({
                attemptOutcome: "provider_accepted",
                attemptProviderMessageId: "sns-message-id",
                recipientStatus: "attempting",
                failureFenced: true,
                result: {
                    kind: "unknown",
                    code: "TimeoutError",
                    details: "stale provider result",
                },
                attemptNumber: 1,
            }),
        ).toEqual({
            kind: "provider_accepted",
            messageId: "sns-message-id",
            updateAttempt: false,
        });
    });

    it("promotes a finalized retry when correlated SNS proves acceptance", () => {
        expect(
            decideSendFinalization({
                attemptOutcome: "retryable_rejected",
                attemptProviderMessageId: null,
                recipientStatus: "retry_wait",
                failureFenced: false,
                result: {
                    kind: "provider_accepted",
                    messageId: "sns-message-id",
                },
                attemptNumber: 1,
            }),
        ).toEqual({
            kind: "provider_accepted",
            messageId: "sns-message-id",
            updateAttempt: true,
        });
    });

    it("does not apply failures without the active recipient lease", () => {
        expect(
            decideSendFinalization({
                attemptOutcome: "send_authorized",
                attemptProviderMessageId: null,
                recipientStatus: "attempting",
                failureFenced: false,
                result: {
                    kind: "retryable_rejected",
                    code: "ThrottlingException",
                    details: "retry later",
                },
                attemptNumber: 1,
            }),
        ).toEqual({ kind: "no_change" });
    });

    it("allows the active lease to schedule a retry", () => {
        expect(
            decideSendFinalization({
                attemptOutcome: "send_authorized",
                attemptProviderMessageId: null,
                recipientStatus: "attempting",
                failureFenced: true,
                result: {
                    kind: "retryable_rejected",
                    code: "ThrottlingException",
                    details: "retry later",
                },
                attemptNumber: 1,
            }),
        ).toEqual({
            kind: "retry_wait",
            attemptOutcome: "retryable_rejected",
            delayMs: 30_000,
            code: "ThrottlingException",
            details: "retry later",
            updateRecipient: true,
        });
    });

    it("finalizes an in-flight retry without downgrading an accepted recipient", () => {
        expect(
            decideSendFinalization({
                attemptOutcome: "send_authorized",
                attemptProviderMessageId: null,
                recipientStatus: "provider_accepted",
                failureFenced: false,
                result: {
                    kind: "unknown",
                    code: "TimeoutError",
                    details: "ambiguous retry outcome",
                },
                attemptNumber: 2,
            }),
        ).toEqual({
            kind: "unknown",
            attemptOutcome: "unknown",
            code: "TimeoutError",
            details: "ambiguous retry outcome",
            updateRecipient: false,
        });
    });
});

describe("mandatory owner gate", () => {
    it("continues after every owner is accepted", () => {
        expect(
            decideOwnerGate({
                ownerOutstanding: 0,
                ownerFailed: 0,
            }),
        ).toEqual({ kind: "continue" });
    });

    it("waits while an owner remains outstanding", () => {
        expect(
            decideOwnerGate({
                ownerOutstanding: 1,
                ownerFailed: 0,
            }),
        ).toEqual({ kind: "wait" });
    });

    it("fails while an owner remains terminal", () => {
        expect(
            decideOwnerGate({
                ownerOutstanding: 1,
                ownerFailed: 1,
            }),
        ).toEqual({ kind: "fail" });
    });
});

describe("initial terminal delivery status", () => {
    it("fails when every participant is skipped", () => {
        expect(
            decideTerminalDeliveryStatus({
                participantAccepted: 0,
                participantFailed: 0,
            }),
        ).toBe("failed");
    });

    it("completes after the sole participant is accepted", () => {
        expect(
            decideTerminalDeliveryStatus({
                participantAccepted: 1,
                participantFailed: 0,
            }),
        ).toBe("completed");
    });

    it("completes with failures when another participant failed", () => {
        expect(
            decideTerminalDeliveryStatus({
                participantAccepted: 1,
                participantFailed: 1,
            }),
        ).toBe("completed_with_failures");
    });
});
