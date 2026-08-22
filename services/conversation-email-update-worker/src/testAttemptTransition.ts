import type { ProviderResult } from "./provider.js";

export type TestAttemptStatus =
    | "pending"
    | "claimed"
    | "attempting"
    | "provider_accepted"
    | "retryable_rejected"
    | "permanent_rejected"
    | "unknown";

type TestAttemptFailureStatus = Extract<
    TestAttemptStatus,
    "retryable_rejected" | "permanent_rejected" | "unknown"
>;

export type TestProviderFinalizationDecision =
    | { kind: "no_change" }
    | { kind: "provider_accepted"; messageId: string }
    | {
          kind: "rejected";
          status: TestAttemptFailureStatus;
          errorCategory: "retryable" | "permanent" | "ambiguous";
          code: string;
          details: string;
      };

export function decideTestProviderFinalization({
    status,
    providerMessageId,
    leaseMatches,
    result,
}: {
    status: TestAttemptStatus;
    providerMessageId: string | null;
    leaseMatches: boolean;
    result: ProviderResult;
}): TestProviderFinalizationDecision {
    if (status === "provider_accepted") {
        if (providerMessageId === null) {
            throw new Error(
                "Provider-accepted test attempt is missing its message ID",
            );
        }
        return { kind: "no_change" };
    }
    if (result.kind === "provider_accepted") {
        if (status === "pending" || status === "claimed") {
            return { kind: "no_change" };
        }
        return { kind: "provider_accepted", messageId: result.messageId };
    }
    if (status !== "attempting" || !leaseMatches) {
        return { kind: "no_change" };
    }
    return {
        kind: "rejected",
        status: result.kind,
        errorCategory:
            result.kind === "retryable_rejected"
                ? "retryable"
                : result.kind === "permanent_rejected"
                  ? "permanent"
                  : "ambiguous",
        code: result.code,
        details: result.details,
    };
}

type TestSnsEventType =
    | "Send"
    | "Delivery"
    | "Bounce"
    | "Complaint"
    | "DeliveryDelay"
    | "Reject"
    | "Rendering Failure";

export type TestSnsTransitionDecision =
    | { kind: "no_change" }
    | { kind: "record_message_id"; messageId: string }
    | { kind: "provider_accepted"; messageId: string };

export function decideTestSnsTransition({
    status,
    providerMessageId,
    eventType,
    eventMessageId,
}: {
    status: TestAttemptStatus;
    providerMessageId: string | null;
    eventType: TestSnsEventType;
    eventMessageId: string;
}): TestSnsTransitionDecision {
    if (status === "provider_accepted") return { kind: "no_change" };
    if (eventType === "Send" || eventType === "Delivery") {
        if (status === "pending" || status === "claimed") {
            return { kind: "no_change" };
        }
        return {
            kind: "provider_accepted",
            messageId: providerMessageId ?? eventMessageId,
        };
    }
    if (
        providerMessageId === null &&
        (status === "retryable_rejected" ||
            status === "permanent_rejected" ||
            status === "unknown")
    ) {
        return { kind: "record_message_id", messageId: eventMessageId };
    }
    return { kind: "no_change" };
}

export function decideTestSnsSuppressions({
    eventType,
    bounceType,
}: {
    eventType: TestSnsEventType;
    bounceType: string | undefined;
}): {
    emailReason: "permanent_bounce" | "complaint" | undefined;
    suppressUserForComplaint: boolean;
} {
    if (eventType === "Complaint") {
        return {
            emailReason: "complaint",
            suppressUserForComplaint: true,
        };
    }
    return {
        emailReason:
            eventType === "Bounce" && bounceType === "Permanent"
                ? "permanent_bounce"
                : undefined,
        suppressUserForComplaint: false,
    };
}
