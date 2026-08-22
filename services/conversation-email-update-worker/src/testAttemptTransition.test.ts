import { describe, expect, it } from "vitest";
import {
    decideTestProviderFinalization,
    decideTestSnsSuppressions,
    decideTestSnsTransition,
} from "./testAttemptTransition.js";

describe("test attempt provider finalization", () => {
    it("does not let a stale provider failure replace SNS acceptance", () => {
        expect(
            decideTestProviderFinalization({
                status: "provider_accepted",
                providerMessageId: "sns-message-id",
                leaseMatches: false,
                result: {
                    kind: "retryable_rejected",
                    code: "ThrottlingException",
                    details: "stale result",
                },
            }),
        ).toEqual({ kind: "no_change" });
    });

    it("accepts a provider success after lease recovery marked it unknown", () => {
        expect(
            decideTestProviderFinalization({
                status: "unknown",
                providerMessageId: null,
                leaseMatches: false,
                result: {
                    kind: "provider_accepted",
                    messageId: "provider-message-id",
                },
            }),
        ).toEqual({
            kind: "provider_accepted",
            messageId: "provider-message-id",
        });
    });
});

describe("test attempt SNS transition", () => {
    it("promotes a failed test only when Send proves acceptance", () => {
        expect(
            decideTestSnsTransition({
                status: "unknown",
                providerMessageId: null,
                eventType: "Send",
                eventMessageId: "sns-message-id",
            }),
        ).toEqual({
            kind: "provider_accepted",
            messageId: "sns-message-id",
        });
    });

    it("records correlation without accepting a failed test on bounce", () => {
        expect(
            decideTestSnsTransition({
                status: "unknown",
                providerMessageId: null,
                eventType: "Bounce",
                eventMessageId: "sns-message-id",
            }),
        ).toEqual({
            kind: "record_message_id",
            messageId: "sns-message-id",
        });
    });

    it("does not let a delayed event preempt the provider finalizer", () => {
        expect(
            decideTestSnsTransition({
                status: "attempting",
                providerMessageId: null,
                eventType: "DeliveryDelay",
                eventMessageId: "sns-message-id",
            }),
        ).toEqual({ kind: "no_change" });
    });

    it("suppresses the frozen address for a permanent bounce", () => {
        expect(
            decideTestSnsSuppressions({
                eventType: "Bounce",
                bounceType: "Permanent",
            }),
        ).toEqual({
            emailReason: "permanent_bounce",
            suppressUserForComplaint: false,
        });
    });

    it("suppresses both the address and requester for a complaint", () => {
        expect(
            decideTestSnsSuppressions({
                eventType: "Complaint",
                bounceType: undefined,
            }),
        ).toEqual({
            emailReason: "complaint",
            suppressUserForComplaint: true,
        });
    });
});
