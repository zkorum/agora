import type { ProviderResult } from "./provider.js";
import { decideRetryState } from "./retry.js";

export type DeliveryAttemptOutcome =
    | "send_authorized"
    | "provider_accepted"
    | "retryable_rejected"
    | "permanent_rejected"
    | "unknown";

export type RecipientStatus =
    | "pending"
    | "claimed"
    | "attempting"
    | "retry_wait"
    | "provider_accepted"
    | "skipped"
    | "permanent_failed"
    | "unknown";

export type OwnerGateDecision =
    { kind: "continue" } | { kind: "wait" } | { kind: "fail" };

export function decideOwnerGate({
    ownerOutstanding,
    ownerFailed,
}: {
    ownerOutstanding: number;
    ownerFailed: number;
}): OwnerGateDecision {
    if (ownerFailed > 0) return { kind: "fail" };
    if (ownerOutstanding > 0) return { kind: "wait" };
    return { kind: "continue" };
}

export function decideTerminalDeliveryStatus({
    participantAccepted,
    participantFailed,
}: {
    participantAccepted: number;
    participantFailed: number;
}): "completed" | "completed_with_failures" | "failed" {
    if (participantAccepted > 0 && participantFailed > 0) {
        return "completed_with_failures";
    }
    return participantAccepted === 0 ? "failed" : "completed";
}

export type SendFinalizationDecision =
    | { kind: "no_change" }
    | {
          kind: "provider_accepted";
          messageId: string;
          updateAttempt: boolean;
      }
    | {
          kind: "retry_wait";
          attemptOutcome: "retryable_rejected";
          delayMs: number;
          code: string;
          details: string;
          updateRecipient: boolean;
      }
    | {
          kind: "permanent_failed";
          attemptOutcome: "retryable_rejected" | "permanent_rejected";
          code: string;
          details: string;
          updateRecipient: boolean;
      }
    | {
          kind: "unknown";
          attemptOutcome: "unknown";
          code: string;
          details: string;
          updateRecipient: boolean;
      };

export function decideSendFinalization({
    attemptOutcome,
    attemptProviderMessageId,
    recipientStatus,
    failureFenced,
    result,
    attemptNumber,
}: {
    attemptOutcome: DeliveryAttemptOutcome;
    attemptProviderMessageId: string | null;
    recipientStatus: RecipientStatus;
    failureFenced: boolean;
    result: ProviderResult;
    attemptNumber: number;
}): SendFinalizationDecision {
    if (attemptOutcome === "provider_accepted") {
        if (attemptProviderMessageId === null) {
            throw new Error(
                "Provider-accepted delivery attempt is missing its message ID",
            );
        }
        return {
            kind: "provider_accepted",
            messageId: attemptProviderMessageId,
            updateAttempt: false,
        };
    }

    if (result.kind === "provider_accepted") {
        return {
            kind: "provider_accepted",
            messageId: result.messageId,
            updateAttempt: true,
        };
    }

    if (attemptOutcome !== "send_authorized") {
        return { kind: "no_change" };
    }
    const updateRecipient = recipientStatus !== "provider_accepted";
    // A failure may only change a non-accepted recipient under its active lease.
    if (updateRecipient && !failureFenced) return { kind: "no_change" };

    if (result.kind === "unknown") {
        return {
            kind: "unknown",
            attemptOutcome: result.kind,
            code: result.code,
            details: result.details,
            updateRecipient,
        };
    }

    const retryDecision = decideRetryState({
        outcome: result.kind,
        attemptNumber,
    });
    if (retryDecision.kind === "retry_wait") {
        return {
            kind: "retry_wait",
            attemptOutcome: "retryable_rejected",
            delayMs: retryDecision.delayMs,
            code: result.code,
            details: result.details,
            updateRecipient,
        };
    }
    return {
        kind: "permanent_failed",
        attemptOutcome: result.kind,
        code: result.code,
        details: result.details,
        updateRecipient,
    };
}
