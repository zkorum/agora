import { describe, expect, it } from "vitest";
import {
    resolveOwnedUpdateEvidence,
    verifyExerciseReport,
} from "./fixtureStore.js";
import { parseDevExerciseEnvironment } from "./guard.js";
import {
    createExercisePlan,
    exerciseManifestSchema,
    exerciseReportSchema,
} from "./schemas.js";

function fixtureData() {
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
            CONVERSATION_EMAIL_UPDATE_SITE_BASE_URL: "http://127.0.0.1:8080",
            CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_EXPECTED_DB_NAME:
                "agora_email_exercise_test",
            CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_DATABASE_MARKER: "m".repeat(
                32,
            ),
            CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_CONVERSATION_SLUG_ID:
                "Ab12Cd34",
            CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_PARTICIPANT_COUNT: "1",
            CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_NAMESPACE:
                "fixture-store-test",
            CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_SCENARIO: "success",
            CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_CAPTURE_BODIES: "false",
        }),
    );
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
            participantCount: 1,
            participantReferences: [
                {
                    userId: plan.identities[0]?.userId,
                    emailId: 6,
                    projectPreference: {
                        userId: plan.identities[0]?.userId,
                        projectId: 1,
                    },
                    conversationPreference: {
                        userId: plan.identities[0]?.userId,
                        conversationId: 2,
                    },
                    voteId: 7,
                    voteContentId: 8,
                },
            ],
        },
    });
    const participant = plan.identities[0];
    const providerMessageId = "exercise-provider-message";
    const report = exerciseReportSchema.parse({
        schemaVersion: 2,
        namespace: plan.namespace,
        fixtureId: plan.fixtureId,
        status: "incomplete",
        observedAt: now,
        provider: {
            aggregate: {
                sendCalls: 3,
                providerAccepted: 3,
                retryableRejected: 0,
                permanentRejected: 0,
                unknown: 0,
            },
            observations: [
                {
                    recipientHash: "a".repeat(64),
                    messageType: "conversation_update_test",
                    recipientKind: "test",
                    updateId: 10,
                    attemptNumber: 1,
                    outcome: "provider_accepted",
                    providerMessageId: "exercise-test-message",
                    subjectHash: "b".repeat(64),
                    htmlHash: "c".repeat(64),
                    textHash: "d".repeat(64),
                    htmlBytes: 1,
                    textBytes: 1,
                },
                {
                    recipientHash: "e".repeat(64),
                    messageType: "conversation_update",
                    recipientKind: "owner_copy",
                    updateId: 10,
                    recipientId: "100",
                    attemptNumber: 1,
                    outcome: "provider_accepted",
                    providerMessageId: "exercise-owner-message",
                    subjectHash: "f".repeat(64),
                    htmlHash: "1".repeat(64),
                    textHash: "2".repeat(64),
                    htmlBytes: 1,
                    textBytes: 1,
                },
                {
                    recipientHash: "3".repeat(64),
                    cohort: participant.cohort,
                    participantOrdinal: participant.ordinal,
                    messageType: "conversation_update",
                    recipientKind: "participant",
                    updateId: 10,
                    recipientId: "101",
                    attemptNumber: 1,
                    outcome: "provider_accepted",
                    providerMessageId,
                    subjectHash: "4".repeat(64),
                    htmlHash: "5".repeat(64),
                    textHash: "6".repeat(64),
                    htmlBytes: 1,
                    textBytes: 1,
                },
            ],
        },
        database: {
            updateId: 10,
            updatePublicId: "00000000-0000-4000-8000-000000000010",
            testAttemptIds: [11],
            testAttemptStatuses: { provider_accepted: 1 },
            deliveryId: 12,
            deliveryStatus: "completed",
            materializedParticipantCount: 1,
            requiredOwnerCopyCount: 1,
            participantRecipientIds: ["101"],
            ownerRecipientIds: ["100"],
            participantUserIds: [participant.userId],
            outsideFixtureRecipientUserIds: [],
            recipientConversationCount: 2,
            deliveryAttemptIds: ["200", "201"],
            deliveryAttemptCount: 2,
            deliveryAttemptOutcomeCounts: { provider_accepted: 2 },
            actionTokenCount: 3,
            providerMessageIds: [
                "exercise-test-message",
                "exercise-owner-message",
                providerMessageId,
            ],
            recipientOutcomeCounts: { provider_accepted: 2 },
        },
        failures: ["pending"],
    });
    return { manifest, report };
}

describe("existing-conversation fixture verification planning", () => {
    it("preserves drafts when cleanup has no positive ownership evidence", () => {
        expect(
            resolveOwnedUpdateEvidence({
                providerUpdateIds: [],
                recipientUpdateIds: [],
            }),
        ).toBeUndefined();
    });

    it("accepts one consistent provider or fixture-recipient update", () => {
        expect(
            resolveOwnedUpdateEvidence({
                providerUpdateIds: [42],
                recipientUpdateIds: [],
            }),
        ).toBe(42);
        expect(
            resolveOwnedUpdateEvidence({
                providerUpdateIds: [42],
                recipientUpdateIds: [42],
            }),
        ).toBe(42);
    });

    it("rejects ambiguous or conflicting cleanup evidence", () => {
        expect(() =>
            resolveOwnedUpdateEvidence({
                providerUpdateIds: [41, 42],
                recipientUpdateIds: [],
            }),
        ).toThrow("identify multiple updates");
        expect(() =>
            resolveOwnedUpdateEvidence({
                providerUpdateIds: [41],
                recipientUpdateIds: [42],
            }),
        ).toThrow("evidence conflict");
    });

    it("accepts exact participant, owner, attempt, and provider relationships", () => {
        const { manifest, report } = fixtureData();
        expect(verifyExerciseReport({ manifest, report })).toEqual([]);
    });

    it("refuses recipients outside the exact participant and owner sets", () => {
        const { manifest, report } = fixtureData();
        const unsafeReport = exerciseReportSchema.parse({
            ...report,
            database: {
                ...report.database,
                outsideFixtureRecipientUserIds: [
                    "00000000-0000-4000-8000-000000000099",
                ],
            },
        });
        expect(
            verifyExerciseReport({ manifest, report: unsafeReport }),
        ).toContain(
            "Delivery includes a recipient outside fixture participants and authorized owners",
        );
    });
});
