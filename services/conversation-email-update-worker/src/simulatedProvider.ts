import { randomUUID } from "node:crypto";
import type { ConversationEmailProvider, ProviderResult } from "./provider.js";

export type SimulatedConversationEmailProviderMode =
    | "success"
    | "retryable_rejected"
    | "retryable_rejected_then_success"
    | "permanent_rejected"
    | "unknown";

export function createSimulatedConversationEmailProvider({
    mode,
    retryableFailures,
}: {
    mode: SimulatedConversationEmailProviderMode;
    retryableFailures: number;
}): ConversationEmailProvider {
    let retryableFailureCount = 0;

    return {
        send: async (): Promise<ProviderResult> => {
            await Promise.resolve();
            if (
                mode === "retryable_rejected" ||
                (mode === "retryable_rejected_then_success" &&
                    retryableFailureCount < retryableFailures)
            ) {
                retryableFailureCount += 1;
                return {
                    kind: "retryable_rejected",
                    code: "SimulatedThrottling",
                    details: "Simulated SES request throttling",
                };
            }
            if (mode === "permanent_rejected") {
                return {
                    kind: "permanent_rejected",
                    code: "SimulatedRejection",
                    details: "Simulated SES permanent rejection",
                };
            }
            if (mode === "unknown") {
                return {
                    kind: "unknown",
                    code: "SimulatedUnknown",
                    details: "Simulated ambiguous SES outcome",
                };
            }
            return {
                kind: "provider_accepted",
                messageId: `simulated-${randomUUID()}`,
            };
        },
    };
}
