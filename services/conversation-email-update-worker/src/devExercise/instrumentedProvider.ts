import type {
    ConversationEmailProvider,
    ConversationEmailProviderMessage,
    ProviderResult,
} from "../provider.js";
import { z } from "zod";
import { hashExerciseValue } from "./identity.js";
import type { ExerciseArtifactStore } from "./manifestStore.js";
import {
    providerAggregateSchema,
    providerObservationSchema,
    type ExercisePlan,
    type ProviderAggregate,
    type ProviderObservation,
} from "./schemas.js";

export interface InstrumentedSimulatedProvider {
    provider: ConversationEmailProvider;
    snapshot: () => {
        aggregate: ProviderAggregate;
        observations: ProviderObservation[];
    };
}

function acceptedResult({
    plan,
    recipient,
    messageKey,
    attemptNumber,
}: {
    plan: ExercisePlan;
    recipient: string;
    messageKey: string;
    attemptNumber: number;
}): ProviderResult {
    return {
        kind: "provider_accepted",
        messageId: `exercise-${hashExerciseValue(`${plan.namespace}:${messageKey}:${recipient}:${attemptNumber.toString()}`).slice(0, 32)}`,
    };
}

function decideResult({
    plan,
    recipientKind,
    cohort,
    recipient,
    messageKey,
    attemptNumber,
}: {
    plan: ExercisePlan;
    recipientKind: ProviderObservation["recipientKind"];
    cohort: ExercisePlan["identities"][number]["cohort"] | undefined;
    recipient: string;
    messageKey: string;
    attemptNumber: number;
}): ProviderResult {
    if (recipientKind === "test") {
        return acceptedResult({ plan, recipient, messageKey, attemptNumber });
    }
    if (
        plan.scenario === "owner_permanent_rejection" &&
        recipientKind === "owner_copy"
    ) {
        return {
            kind: "permanent_rejected",
            code: "ExerciseOwnerPermanentRejection",
            details: "Deterministic owner rejection",
        };
    }
    if (
        plan.scenario === "mixed_participant_outcomes" &&
        cohort === "participant_permanent_failure"
    ) {
        return {
            kind: "permanent_rejected",
            code: "ExerciseParticipantPermanentRejection",
            details: "Deterministic participant rejection",
        };
    }
    if (
        (plan.scenario === "participant_retry_then_success" ||
            plan.scenario === "mixed_participant_outcomes") &&
        cohort === "participant_retry" &&
        attemptNumber === 1
    ) {
        return {
            kind: "retryable_rejected",
            code: "ExerciseParticipantRetry",
            details: "Deterministic first-attempt participant retry",
        };
    }
    return acceptedResult({ plan, recipient, messageKey, attemptNumber });
}

function incrementAggregate({
    aggregate,
    result,
}: {
    aggregate: ProviderAggregate;
    result: ProviderResult;
}): ProviderAggregate {
    return providerAggregateSchema.parse({
        ...aggregate,
        sendCalls: aggregate.sendCalls + 1,
        providerAccepted:
            aggregate.providerAccepted +
            (result.kind === "provider_accepted" ? 1 : 0),
        retryableRejected:
            aggregate.retryableRejected +
            (result.kind === "retryable_rejected" ? 1 : 0),
        permanentRejected:
            aggregate.permanentRejected +
            (result.kind === "permanent_rejected" ? 1 : 0),
        unknown: aggregate.unknown + (result.kind === "unknown" ? 1 : 0),
    });
}

export function createInstrumentedSimulatedProvider({
    plan,
    captureBodies,
    artifacts,
    onDeliveryMessage,
}: {
    plan: ExercisePlan;
    captureBodies: boolean;
    artifacts: ExerciseArtifactStore;
    onDeliveryMessage?: () => void;
}): InstrumentedSimulatedProvider {
    const attemptsByRecipient = new Map<string, number>();
    const identitiesByEmail = new Map(
        plan.identities.map((identity) => [identity.email, identity]),
    );
    const observations: ProviderObservation[] = [];
    let aggregate = providerAggregateSchema.parse({
        sendCalls: 0,
        providerAccepted: 0,
        retryableRejected: 0,
        permanentRejected: 0,
        unknown: 0,
    });

    const send = async (
        message: ConversationEmailProviderMessage,
    ): Promise<ProviderResult> => {
        const tags = z
            .object({
                message_type: z.enum([
                    "conversation_update_test",
                    "conversation_update",
                ]),
                conversation_update_id: z.string(),
                conversation_update_recipient_id: z.string().optional(),
            })
            .loose()
            .parse(message.tags);
        const messageType = tags.message_type;
        const rawUpdateId = tags.conversation_update_id;
        const updateId = Number(rawUpdateId);
        if (!Number.isSafeInteger(updateId) || updateId <= 0) {
            throw new Error("Exercise provider received an invalid update ID");
        }
        const recipientKind =
            messageType === "conversation_update_test"
                ? "test"
                : message.unsubscribeUrl === undefined
                  ? "owner_copy"
                  : "participant";
        const identity = identitiesByEmail.get(message.to);
        if (recipientKind === "participant" && identity === undefined) {
            throw new Error(
                "Exercise provider received a participant outside the exact fixture email set",
            );
        }
        const recipientId = tags.conversation_update_recipient_id;
        if (
            messageType === "conversation_update" &&
            (recipientId === undefined || !/^[1-9][0-9]*$/.test(recipientId))
        ) {
            throw new Error(
                "Exercise provider received an invalid recipient ID",
            );
        }
        const attemptKey = `${messageType}:${recipientId ?? message.to}`;
        const attemptNumber = (attemptsByRecipient.get(attemptKey) ?? 0) + 1;
        attemptsByRecipient.set(attemptKey, attemptNumber);
        if (messageType === "conversation_update") onDeliveryMessage?.();
        const result = decideResult({
            plan,
            recipientKind,
            cohort: identity?.cohort,
            recipient: message.to,
            messageKey: attemptKey,
            attemptNumber,
        });
        const sequence = aggregate.sendCalls + 1;
        const capturedMessageFile = captureBodies
            ? await artifacts.writeCapturedMessage({
                  namespace: plan.namespace,
                  sequence,
                  message: {
                      to: message.to,
                      subject: message.subject,
                      html: message.html,
                      text: message.text,
                      replyToEmail: message.replyToEmail,
                      tags: message.tags,
                      unsubscribeUrl: message.unsubscribeUrl,
                      simulatedResult: result,
                  },
              })
            : undefined;
        const observation = providerObservationSchema.parse({
            recipientHash: hashExerciseValue(message.to),
            cohort: identity?.cohort,
            participantOrdinal: identity?.ordinal,
            messageType,
            recipientKind,
            updateId,
            recipientId,
            attemptNumber,
            outcome: result.kind,
            providerMessageId:
                result.kind === "provider_accepted"
                    ? result.messageId
                    : undefined,
            subjectHash: hashExerciseValue(message.subject),
            htmlHash: hashExerciseValue(message.html),
            textHash: hashExerciseValue(message.text),
            htmlBytes: Buffer.byteLength(message.html, "utf8"),
            textBytes: Buffer.byteLength(message.text, "utf8"),
            capturedMessageFile,
        });
        observations.push(observation);
        aggregate = incrementAggregate({ aggregate, result });
        return result;
    };

    return {
        provider: { send },
        snapshot: () => ({
            aggregate: { ...aggregate },
            observations: observations.map((observation) => ({
                ...observation,
            })),
        }),
    };
}
