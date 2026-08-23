import { z } from "zod";
import type { DevExerciseEnvironment } from "./guard.js";
import { devExerciseScenarioSchema } from "./guard.js";
import {
    deterministicExerciseEmail,
    deterministicExerciseId,
    deterministicExerciseUsername,
    exerciseCohortSchema,
} from "./identity.js";

const exerciseIdentitySchema = z
    .object({
        cohort: exerciseCohortSchema,
        ordinal: z.number().int().positive(),
        userId: z.uuid(),
        username: z.string().length(20),
        email: z.email(),
    })
    .strict();

export const exercisePlanSchema = z
    .object({
        schemaVersion: z.literal(2),
        namespace: z
            .string()
            .min(3)
            .max(48)
            .regex(/^[a-z][a-z0-9-]*[a-z0-9]$/),
        scenario: devExerciseScenarioSchema,
        expectedDatabaseName: z.string().min(1),
        databaseMarker: z.string().min(32).max(128),
        conversationSlugId: z.string().regex(/^[A-Za-z0-9]{8}$/),
        participantCount: z.number().int().min(1).max(10_000),
        fixtureId: z.uuid(),
        identities: z.array(exerciseIdentitySchema).min(1).max(10_000),
    })
    .strict()
    .superRefine((plan, context) => {
        if (plan.identities.length !== plan.participantCount) {
            context.addIssue({
                code: "custom",
                path: ["identities"],
                message: "Identity count must equal participant count",
            });
        }
        for (const field of [
            "ordinal",
            "userId",
            "username",
            "email",
        ] satisfies readonly (keyof (typeof plan.identities)[number])[]) {
            const values = plan.identities.map((identity) => identity[field]);
            if (new Set(values).size !== values.length) {
                context.addIssue({
                    code: "custom",
                    path: ["identities"],
                    message: `Identity ${field} values must be unique`,
                });
            }
        }
    });

export const exerciseLifecycleStateSchema = z.enum([
    "planned",
    "fixture_prepared",
    "fixture_attached",
    "worker_running",
    "awaiting_ui_action",
    "observing",
    "verified",
    "failed",
    "cleaned",
]);

const fixtureParticipantReferenceSchema = z
    .object({
        userId: z.uuid(),
        emailId: z.number().int().positive(),
        projectPreference: z
            .object({
                userId: z.uuid(),
                projectId: z.number().int().positive(),
            })
            .strict(),
        conversationPreference: z
            .object({
                userId: z.uuid(),
                conversationId: z.number().int().positive(),
            })
            .strict(),
        voteId: z.number().int().positive(),
        voteContentId: z.number().int().positive(),
    })
    .strict();

export const exerciseFixtureSchema = z
    .object({
        projectId: z.number().int().positive(),
        projectSlug: z.string().min(1),
        conversationId: z.number().int().positive(),
        conversationContentId: z.number().int().positive(),
        conversationSlugId: z.string().regex(/^[A-Za-z0-9]{8}$/),
        opinionId: z.number().int().positive(),
        opinionContentId: z.number().int().positive(),
        preparedAt: z.iso.datetime(),
        participantCount: z.number().int().min(1).max(10_000),
        participantReferences: z
            .array(fixtureParticipantReferenceSchema)
            .min(1)
            .max(10_000),
    })
    .strict()
    .superRefine((fixture, context) => {
        if (fixture.participantReferences.length !== fixture.participantCount) {
            context.addIssue({
                code: "custom",
                path: ["participantReferences"],
                message:
                    "Participant reference count must equal participant count",
            });
        }
    });

export const exerciseManifestSchema = z
    .object({
        schemaVersion: z.literal(2),
        kind: z.literal("conversation_email_update_dev_exercise"),
        plan: exercisePlanSchema,
        state: exerciseLifecycleStateSchema,
        revision: z.number().int().nonnegative(),
        createdAt: z.iso.datetime(),
        updatedAt: z.iso.datetime(),
        fixture: exerciseFixtureSchema.optional(),
        lastError: z.string().min(1).optional(),
    })
    .strict();

export const providerObservationSchema = z
    .object({
        recipientHash: z.string().regex(/^[a-f0-9]{64}$/),
        cohort: exerciseCohortSchema.optional(),
        participantOrdinal: z.number().int().positive().optional(),
        messageType: z.enum([
            "conversation_update_test",
            "conversation_update",
        ]),
        recipientKind: z.enum(["test", "owner_copy", "participant"]),
        updateId: z.number().int().positive(),
        recipientId: z
            .string()
            .regex(/^[1-9][0-9]*$/)
            .optional(),
        attemptNumber: z.number().int().positive(),
        outcome: z.enum([
            "provider_accepted",
            "retryable_rejected",
            "permanent_rejected",
            "unknown",
        ]),
        providerMessageId: z.string().min(1).optional(),
        subjectHash: z.string().regex(/^[a-f0-9]{64}$/),
        htmlHash: z.string().regex(/^[a-f0-9]{64}$/),
        textHash: z.string().regex(/^[a-f0-9]{64}$/),
        htmlBytes: z.number().int().nonnegative(),
        textBytes: z.number().int().nonnegative(),
        capturedMessageFile: z.string().min(1).optional(),
    })
    .strict();

export const providerAggregateSchema = z
    .object({
        sendCalls: z.number().int().nonnegative(),
        providerAccepted: z.number().int().nonnegative(),
        retryableRejected: z.number().int().nonnegative(),
        permanentRejected: z.number().int().nonnegative(),
        unknown: z.number().int().nonnegative(),
    })
    .strict();

export const databaseObservationSchema = z
    .object({
        updateId: z.number().int().positive(),
        updatePublicId: z.uuid(),
        testAttemptIds: z.array(z.number().int().positive()),
        testAttemptStatuses: z.record(
            z.string(),
            z.number().int().nonnegative(),
        ),
        deliveryId: z.number().int().positive(),
        deliveryStatus: z.string().min(1),
        deliveryFailureReason: z.string().min(1).optional(),
        deliveryStopReason: z.string().min(1).optional(),
        materializedParticipantCount: z.number().int().nonnegative(),
        requiredOwnerCopyCount: z.number().int().positive(),
        participantRecipientIds: z.array(z.string().regex(/^[1-9][0-9]*$/)),
        ownerRecipientIds: z.array(z.string().regex(/^[1-9][0-9]*$/)),
        participantUserIds: z.array(z.uuid()),
        outsideFixtureRecipientUserIds: z.array(z.uuid()),
        recipientConversationCount: z.number().int().nonnegative(),
        deliveryAttemptIds: z.array(z.string().regex(/^[1-9][0-9]*$/)),
        deliveryAttemptCount: z.number().int().nonnegative(),
        deliveryAttemptOutcomeCounts: z.record(
            z.string(),
            z.number().int().nonnegative(),
        ),
        actionTokenCount: z.number().int().nonnegative(),
        providerMessageIds: z.array(z.string().min(1)),
        recipientOutcomeCounts: z.record(
            z.string(),
            z.number().int().nonnegative(),
        ),
    })
    .strict();

export const exerciseReportSchema = z
    .object({
        schemaVersion: z.literal(2),
        namespace: exercisePlanSchema.shape.namespace,
        fixtureId: z.uuid(),
        status: z.enum(["passed", "failed", "incomplete"]),
        observedAt: z.iso.datetime(),
        provider: z
            .object({
                aggregate: providerAggregateSchema,
                observations: z.array(providerObservationSchema),
            })
            .strict(),
        database: databaseObservationSchema.optional(),
        failures: z.array(z.string().min(1)),
    })
    .strict();

export type ExercisePlan = z.infer<typeof exercisePlanSchema>;
export type ExerciseManifest = z.infer<typeof exerciseManifestSchema>;
export type ExerciseLifecycleState = z.infer<
    typeof exerciseLifecycleStateSchema
>;
export type ExerciseReport = z.infer<typeof exerciseReportSchema>;
export type DatabaseObservation = z.infer<typeof databaseObservationSchema>;
export type ProviderObservation = z.infer<typeof providerObservationSchema>;
export type ProviderAggregate = z.infer<typeof providerAggregateSchema>;

export function createExercisePlan(
    environment: DevExerciseEnvironment,
): ExercisePlan {
    const namespace =
        environment.CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_NAMESPACE;
    const participantCount =
        environment.CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_PARTICIPANT_COUNT;
    const identities = Array.from({ length: participantCount }, (_, index) => {
        const ordinal = index + 1;
        const cohort = cohortForParticipant({
            scenario:
                environment.CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_SCENARIO,
            ordinal,
        });
        return {
            cohort,
            ordinal,
            userId: deterministicExerciseId({
                namespace,
                purpose: `user:${String(ordinal)}`,
            }),
            username: deterministicExerciseUsername({ namespace, ordinal }),
            email: deterministicExerciseEmail({ namespace, cohort, ordinal }),
        };
    });
    return exercisePlanSchema.parse({
        schemaVersion: 2,
        namespace,
        scenario: environment.CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_SCENARIO,
        expectedDatabaseName:
            environment.CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_EXPECTED_DB_NAME,
        databaseMarker:
            environment.CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_DATABASE_MARKER,
        conversationSlugId:
            environment.CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_CONVERSATION_SLUG_ID,
        participantCount,
        fixtureId: deterministicExerciseId({
            namespace,
            purpose: "fixture",
        }),
        identities,
    });
}

export function cohortForParticipant({
    scenario,
    ordinal,
}: {
    scenario: DevExerciseEnvironment["CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_SCENARIO"];
    ordinal: number;
}): z.infer<typeof exerciseCohortSchema> {
    if (scenario === "participant_retry_then_success") {
        return ordinal % 2 === 1 ? "participant_retry" : "participant_success";
    }
    if (scenario === "mixed_participant_outcomes") {
        return (
            exerciseCohortSchema.options[(ordinal - 1) % 3] ??
            "participant_success"
        );
    }
    return "participant_success";
}
