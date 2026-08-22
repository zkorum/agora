import { createHash, randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
    ingestConversationEmailSnsEnvelope,
    sesEventSchema,
} from "@/shared-backend/conversationEmailUpdateSnsIngress.js";
import {
    conversationEmailUpdateDeliveryAttemptTable,
    conversationEmailUpdateTestAttemptTable,
} from "@/shared-backend/schema.js";
import type {
    ConversationEmailUpdateSnsSimulatorRequest,
    ConversationEmailUpdateSnsSimulatorResponse,
} from "@/shared/types/dto.js";

interface SimulatorCorrelation {
    providerMessageId: string;
    destinationEmail: string;
    tags: Readonly<Record<string, string>>;
}
type SimulatorCorrelationResult =
    | { kind: "found"; correlation: SimulatorCorrelation }
    | { kind: "attempt_not_found" }
    | { kind: "provider_message_not_available" };

export const CONVERSATION_EMAIL_UPDATE_SIMULATOR_TOPIC_ARN =
    "arn:aws:sns:eu-west-1:000000000000:conversation-email-updates-simulator";

export function conversationEmailUpdateSimulatorRateLimitKey(
    authorization: string | undefined,
): string {
    return createHash("sha256")
        .update(authorization ?? "missing-authorization")
        .digest("hex");
}

async function loadSimulatorCorrelation({
    db,
    target,
}: {
    db: PostgresJsDatabase;
    target: ConversationEmailUpdateSnsSimulatorRequest["target"];
}): Promise<SimulatorCorrelationResult> {
    if (target.kind === "test") {
        const row = (
            await db
                .select({
                    publicId: conversationEmailUpdateTestAttemptTable.publicId,
                    providerMessageId:
                        conversationEmailUpdateTestAttemptTable.providerMessageId,
                    destinationEmail:
                        conversationEmailUpdateTestAttemptTable.destinationEmailSnapshot,
                })
                .from(conversationEmailUpdateTestAttemptTable)
                .where(
                    eq(
                        conversationEmailUpdateTestAttemptTable.publicId,
                        target.testAttemptId,
                    ),
                )
                .limit(1)
        ).at(0);
        if (row === undefined) return { kind: "attempt_not_found" };
        if (row.providerMessageId === null) {
            return { kind: "provider_message_not_available" };
        }
        return {
            kind: "found",
            correlation: {
                providerMessageId: row.providerMessageId,
                destinationEmail: row.destinationEmail,
                tags: { conversation_update_test_id: row.publicId },
            },
        };
    }
    const row = (
        await db
            .select({
                publicId: conversationEmailUpdateDeliveryAttemptTable.publicId,
                providerMessageId:
                    conversationEmailUpdateDeliveryAttemptTable.providerMessageId,
                destinationEmail:
                    conversationEmailUpdateDeliveryAttemptTable.emailSnapshot,
            })
            .from(conversationEmailUpdateDeliveryAttemptTable)
            .where(
                eq(
                    conversationEmailUpdateDeliveryAttemptTable.publicId,
                    target.deliveryAttemptId,
                ),
            )
            .limit(1)
    ).at(0);
    if (row === undefined) return { kind: "attempt_not_found" };
    if (row.providerMessageId === null) {
        return { kind: "provider_message_not_available" };
    }
    return {
        kind: "found",
        correlation: {
            providerMessageId: row.providerMessageId,
            destinationEmail: row.destinationEmail,
            tags: { conversation_update_attempt_id: row.publicId },
        },
    };
}

export function buildSimulatedSesEvent({
    request,
    correlation,
    occurredAt,
}: {
    request: ConversationEmailUpdateSnsSimulatorRequest;
    correlation: SimulatorCorrelation;
    occurredAt: string;
}) {
    const mail = {
        timestamp: occurredAt,
        messageId: correlation.providerMessageId,
        destination: [correlation.destinationEmail],
        tags: Object.fromEntries(
            Object.entries(correlation.tags).map(([name, value]) => [
                name,
                [value],
            ]),
        ),
    };
    const recipient = { emailAddress: correlation.destinationEmail };
    switch (request.event.type) {
        case "send":
            return sesEventSchema.parse({ eventType: "Send", mail, send: {} });
        case "delivery":
            return sesEventSchema.parse({
                eventType: "Delivery",
                mail,
                delivery: {
                    timestamp: occurredAt,
                    recipients: [correlation.destinationEmail],
                },
            });
        case "bounce":
            return sesEventSchema.parse({
                eventType: "Bounce",
                mail,
                bounce: {
                    bounceType: request.event.bounceType,
                    bouncedRecipients: [recipient],
                    timestamp: occurredAt,
                },
            });
        case "complaint":
            return sesEventSchema.parse({
                eventType: "Complaint",
                mail,
                complaint: {
                    complainedRecipients: [recipient],
                    timestamp: occurredAt,
                    complaintFeedbackType: "abuse",
                },
            });
        case "delivery_delay":
            return sesEventSchema.parse({
                eventType: "DeliveryDelay",
                mail,
                deliveryDelay: {
                    delayedRecipients: [recipient],
                    timestamp: occurredAt,
                    delayType: "TransientCommunicationFailure",
                },
            });
        case "reject":
            return sesEventSchema.parse({
                eventType: "Reject",
                mail,
                reject: { reason: "Simulated rejection" },
            });
        case "rendering_failure":
            return sesEventSchema.parse({
                eventType: "Rendering Failure",
                mail,
                failure: { errorMessage: "Simulated rendering failure" },
            });
    }
}

export function buildSnsMessageId({
    request,
    providerMessageId,
}: {
    request: ConversationEmailUpdateSnsSimulatorRequest;
    providerMessageId: string;
}): string {
    if (request.idempotencyKey === undefined) return randomUUID();
    return `simulated-${createHash("sha256")
        .update(providerMessageId)
        .update("\0")
        .update(request.event.type)
        .update("\0")
        .update(request.idempotencyKey)
        .digest("hex")}`;
}

export interface ConversationEmailUpdateSnsSimulator {
    simulate: (
        request: ConversationEmailUpdateSnsSimulatorRequest,
    ) => Promise<ConversationEmailUpdateSnsSimulatorResponse>;
}

export function createConversationEmailUpdateSnsSimulator({
    db,
    topicArn,
}: {
    db: PostgresJsDatabase;
    topicArn: string;
}): ConversationEmailUpdateSnsSimulator {
    return {
        simulate: async (request) => {
            const correlationResult = await loadSimulatorCorrelation({
                db,
                target: request.target,
            });
            if (correlationResult.kind !== "found") {
                return {
                    success: false,
                    reason: correlationResult.kind,
                };
            }
            const { correlation } = correlationResult;
            const occurredAt = new Date().toISOString();
            const event = buildSimulatedSesEvent({
                request,
                correlation,
                occurredAt,
            });
            const envelope = {
                Type: "Notification",
                Message: JSON.stringify(event),
                MessageId: buildSnsMessageId({
                    request,
                    providerMessageId: correlation.providerMessageId,
                }),
                Signature: "development-simulator",
                SignatureVersion: "2",
                SigningCertURL:
                    "https://sns.eu-west-1.amazonaws.com/SimpleNotificationService-simulator.pem",
                Timestamp: occurredAt,
                TopicArn: topicArn,
            };
            const result = await ingestConversationEmailSnsEnvelope({
                db,
                rawPayload: envelope,
                expectedTopicArn: topicArn,
                verifySignature: () => Promise.resolve(true),
            });
            if (result.kind !== "stored" && result.kind !== "duplicate") {
                throw new Error("Simulator created an unexpected SNS envelope");
            }
            return { success: true, result: result.kind };
        },
    };
}
