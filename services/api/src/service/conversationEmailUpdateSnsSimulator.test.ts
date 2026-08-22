import { describe, expect, it } from "vitest";
import { sesEventSchema } from "@/shared-backend/conversationEmailUpdateSnsIngress.js";
import type { ConversationEmailUpdateSnsSimulatorRequest } from "@/shared/types/dto.js";
import {
    buildSimulatedSesEvent,
    buildSnsMessageId,
    conversationEmailUpdateSimulatorRateLimitKey,
} from "./conversationEmailUpdateSnsSimulator.js";

const occurredAt = "2026-08-22T12:00:00.000Z";
const correlation = {
    providerMessageId: "provider-message-1",
    destinationEmail: "participant@example.com",
    tags: { conversation_update_attempt_id: "attempt-id" },
};

function request(
    event: ConversationEmailUpdateSnsSimulatorRequest["event"],
): ConversationEmailUpdateSnsSimulatorRequest {
    return {
        target: {
            kind: "delivery",
            deliveryAttemptId: "00000000-0000-4000-8000-000000000001",
        },
        event,
    };
}

describe("Conversation Email Updates SNS simulator", () => {
    it.each([
        [{ type: "send" }, "Send"],
        [{ type: "delivery" }, "Delivery"],
        [{ type: "bounce", bounceType: "Permanent" }, "Bounce"],
        [{ type: "complaint" }, "Complaint"],
        [{ type: "delivery_delay" }, "DeliveryDelay"],
        [{ type: "reject" }, "Reject"],
        [{ type: "rendering_failure" }, "Rendering Failure"],
    ] as const)("builds a valid %s event", (event, expectedEventType) => {
        const simulatedEvent = buildSimulatedSesEvent({
            request: request(event),
            correlation,
            occurredAt,
        });
        expect(sesEventSchema.parse(simulatedEvent).eventType).toBe(
            expectedEventType,
        );
    });

    it("uses an idempotency key for reproducible duplicate SNS events", () => {
        const simulationRequest = {
            ...request({ type: "delivery" }),
            idempotencyKey: "duplicate-1",
        };
        expect(
            buildSnsMessageId({
                request: simulationRequest,
                providerMessageId: correlation.providerMessageId,
            }),
        ).toBe(
            buildSnsMessageId({
                request: simulationRequest,
                providerMessageId: correlation.providerMessageId,
            }),
        );
    });

    it("keys development rate limits by a hash of authorization, not IP", () => {
        const first = conversationEmailUpdateSimulatorRateLimitKey("Bearer a");
        const second = conversationEmailUpdateSimulatorRateLimitKey("Bearer b");
        expect(first).not.toBe(second);
        expect(first).not.toContain("Bearer a");
    });
});
