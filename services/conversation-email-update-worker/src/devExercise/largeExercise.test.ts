import { describe, expect, it } from "vitest";
import { verifyExerciseReport } from "./fixtureStore.js";
import { parseDevExerciseEnvironment } from "./guard.js";
import { createInstrumentedSimulatedProvider } from "./instrumentedProvider.js";
import { createExerciseArtifactStore } from "./manifestStore.js";
import {
    createExercisePlan,
    exerciseManifestSchema,
    exerciseReportSchema,
} from "./schemas.js";

describe("large development exercise", () => {
    it("identifies and verifies 10,000 participants without quadratic lookups", async () => {
        const plan = createExercisePlan(
            parseDevExerciseEnvironment({
                NODE_ENV: "development",
                AGORA_DEV_MODE: "true",
                CONNECTION_STRING:
                    "postgresql://postgres@127.0.0.1/agora_email_exercise_test",
                CONVERSATION_EMAIL_UPDATES_ENABLED: "true",
                CONVERSATION_EMAIL_UPDATES_KILL_SWITCH: "false",
                CONVERSATION_EMAIL_UPDATE_PROVIDER: "simulated",
                CONVERSATION_EMAIL_UPDATE_SIMULATOR_ENABLED: "true",
                CONVERSATION_EMAIL_UPDATE_SITE_BASE_URL:
                    "http://127.0.0.1:8080",
                CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_EXPECTED_DB_NAME:
                    "agora_email_exercise_test",
                CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_DATABASE_MARKER:
                    "m".repeat(32),
                CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_CONVERSATION_SLUG_ID:
                    "Ab12Cd34",
                CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_PARTICIPANT_COUNT:
                    "10000",
                CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_NAMESPACE:
                    "large-exercise-test",
                CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_SCENARIO: "success",
                CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_CAPTURE_BODIES: "false",
            }),
        );
        const provider = createInstrumentedSimulatedProvider({
            plan,
            captureBodies: false,
            artifacts: createExerciseArtifactStore(),
        });
        const commonMessage = {
            subject: "Subject",
            html: "<p>Message</p>",
            text: "Message",
            replyToName: "Project contact",
            replyToEmail: "owner@example.invalid",
        };
        await provider.provider.send({
            ...commonMessage,
            to: "owner@example.invalid",
            tags: {
                message_type: "conversation_update_test",
                conversation_update_id: "10",
            },
            unsubscribeUrl: undefined,
        });
        await provider.provider.send({
            ...commonMessage,
            to: "owner@example.invalid",
            tags: {
                message_type: "conversation_update",
                conversation_update_id: "10",
                conversation_update_recipient_id: "10001",
            },
            unsubscribeUrl: undefined,
        });
        for (const identity of plan.identities) {
            await provider.provider.send({
                ...commonMessage,
                to: identity.email,
                tags: {
                    message_type: "conversation_update",
                    conversation_update_id: "10",
                    conversation_update_recipient_id:
                        identity.ordinal.toString(),
                },
                unsubscribeUrl: `http://127.0.0.1/unsubscribe/${identity.ordinal.toString()}`,
            });
        }

        const now = new Date().toISOString();
        const manifest = exerciseManifestSchema.parse({
            schemaVersion: 2,
            kind: "conversation_email_update_dev_exercise",
            plan,
            state: "observing",
            revision: 4,
            createdAt: now,
            updatedAt: now,
            fixture: {
                projectId: 1,
                projectSlug: "project",
                conversationId: 2,
                conversationContentId: 3,
                conversationSlugId: plan.conversationSlugId,
                opinionId: 4,
                opinionContentId: 5,
                preparedAt: now,
                participantCount: plan.participantCount,
                participantReferences: plan.identities.map((identity) => ({
                    userId: identity.userId,
                    emailId: identity.ordinal,
                    projectPreference: {
                        userId: identity.userId,
                        projectId: 1,
                    },
                    conversationPreference: {
                        userId: identity.userId,
                        conversationId: 2,
                    },
                    voteId: identity.ordinal,
                    voteContentId: identity.ordinal,
                })),
            },
        });
        const snapshot = provider.snapshot();
        const participantRecipientIds = plan.identities.map((identity) =>
            identity.ordinal.toString(),
        );
        const finalObservations = snapshot.observations.filter(
            (observation) => observation.messageType === "conversation_update",
        );
        const report = exerciseReportSchema.parse({
            schemaVersion: 2,
            namespace: plan.namespace,
            fixtureId: plan.fixtureId,
            status: "incomplete",
            observedAt: now,
            provider: snapshot,
            database: {
                updateId: 10,
                updatePublicId: "00000000-0000-4000-8000-000000000010",
                testAttemptIds: [11],
                testAttemptStatuses: { provider_accepted: 1 },
                deliveryId: 12,
                deliveryStatus: "completed",
                materializedParticipantCount: plan.participantCount,
                requiredOwnerCopyCount: 1,
                participantRecipientIds,
                ownerRecipientIds: ["10001"],
                participantUserIds: plan.identities.map(
                    (identity) => identity.userId,
                ),
                outsideFixtureRecipientUserIds: [],
                recipientConversationCount: plan.participantCount + 1,
                deliveryAttemptIds: finalObservations.map(
                    (_observation, index) => (index + 1).toString(),
                ),
                deliveryAttemptCount: finalObservations.length,
                deliveryAttemptOutcomeCounts: {
                    provider_accepted: finalObservations.length,
                },
                actionTokenCount: plan.participantCount * 3,
                providerMessageIds: snapshot.observations.flatMap(
                    (observation) =>
                        observation.providerMessageId === undefined
                            ? []
                            : [observation.providerMessageId],
                ),
                recipientOutcomeCounts: {
                    provider_accepted: plan.participantCount + 1,
                },
            },
            failures: ["pending"],
        });

        expect(verifyExerciseReport({ manifest, report })).toEqual([]);
    }, 30_000);
});
