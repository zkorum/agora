import { describe, expect, it } from "vitest";
import type { FixtureStore, PreparedExerciseFixture } from "./fixtureStore.js";
import { parseDevExerciseEnvironment } from "./guard.js";
import type { ExerciseArtifactStore } from "./manifestStore.js";
import {
    cleanupExerciseTransition,
    prepareExerciseTransition,
} from "./runtime.js";
import {
    createExercisePlan,
    exerciseManifestSchema,
    type ExerciseManifest,
    type ExercisePlan,
} from "./schemas.js";

function planForTest(): ExercisePlan {
    return createExercisePlan(
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
                "runtime-recovery-test",
            CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_SCENARIO: "success",
            CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_CAPTURE_BODIES: "false",
        }),
    );
}

function fixtureForPlan(plan: ExercisePlan): PreparedExerciseFixture {
    const identity = plan.identities.at(0);
    if (identity === undefined) throw new Error("Missing test identity");
    return {
        projectId: 1,
        projectSlug: "project",
        conversationId: 2,
        conversationContentId: 3,
        conversationSlugId: plan.conversationSlugId,
        opinionId: 4,
        opinionContentId: 5,
        preparedAt: new Date().toISOString(),
        participantCount: 1,
        participantReferences: [
            {
                userId: identity.userId,
                emailId: 6,
                projectPreference: { userId: identity.userId, projectId: 1 },
                conversationPreference: {
                    userId: identity.userId,
                    conversationId: 2,
                },
                voteId: 7,
                voteContentId: 8,
            },
        ],
    };
}

function manifestForTest({
    plan,
    state,
    fixture,
}: {
    plan: ExercisePlan;
    state: ExerciseManifest["state"];
    fixture?: PreparedExerciseFixture;
}): ExerciseManifest {
    const timestamp = new Date().toISOString();
    return exerciseManifestSchema.parse({
        schemaVersion: 2,
        kind: "conversation_email_update_dev_exercise",
        plan,
        state,
        revision: 0,
        createdAt: timestamp,
        updatedAt: timestamp,
        fixture,
    });
}

describe("development exercise transition recovery", () => {
    it("reuses a DB-persisted fixture when the prepare manifest write is retried", async () => {
        const plan = planForTest();
        const fixture = fixtureForPlan(plan);
        const manifest = manifestForTest({ plan, state: "planned" });
        let persistedFixture: PreparedExerciseFixture | undefined;
        let prepareCalls = 0;
        const prepare: FixtureStore["prepare"] = () => {
            prepareCalls += 1;
            persistedFixture ??= fixture;
            return Promise.resolve(persistedFixture);
        };
        let transitionCalls = 0;
        const transitionManifest: ExerciseArtifactStore["transitionManifest"] =
            (params) => {
                transitionCalls += 1;
                if (transitionCalls === 1) {
                    return Promise.reject(
                        new Error("injected manifest write failure"),
                    );
                }
                return Promise.resolve(
                    manifestForTest({
                        plan,
                        state: params.to,
                        fixture: params.fixture,
                    }),
                );
            };

        await expect(
            prepareExerciseTransition({
                plan,
                manifest,
                fixtureStore: { prepare },
                artifacts: { transitionManifest },
            }),
        ).rejects.toThrow("injected manifest write failure");
        expect(persistedFixture).toEqual(fixture);

        await expect(
            prepareExerciseTransition({
                plan,
                manifest,
                fixtureStore: { prepare },
                artifacts: { transitionManifest },
            }),
        ).resolves.toBeUndefined();
        expect(prepareCalls).toBe(2);
        expect(transitionCalls).toBe(2);
    });

    it("accepts a prepared manifest after a post-write prepare failure", async () => {
        const plan = planForTest();
        const fixture = fixtureForPlan(plan);
        const preparedManifest = manifestForTest({
            plan,
            state: "fixture_prepared",
            fixture,
        });
        let transitionCalls = 0;
        const prepare: FixtureStore["prepare"] = () => Promise.resolve(fixture);
        const transitionManifest: ExerciseArtifactStore["transitionManifest"] =
            () => {
                transitionCalls += 1;
                return Promise.reject(
                    new Error("manifest must not transition twice"),
                );
            };

        await expect(
            prepareExerciseTransition({
                plan,
                manifest: preparedManifest,
                fixtureStore: { prepare },
                artifacts: { transitionManifest },
            }),
        ).resolves.toBeUndefined();
        expect(transitionCalls).toBe(0);
    });

    it("retains a cleaned DB tombstone until a retried cleanup manifest write succeeds", async () => {
        const plan = planForTest();
        const manifest = manifestForTest({
            plan,
            state: "fixture_prepared",
            fixture: fixtureForPlan(plan),
        });
        let reservationState: "prepared" | "cleaned" | "released" = "prepared";
        let cleanupCalls = 0;
        const cleanup: FixtureStore["cleanup"] = () => {
            cleanupCalls += 1;
            if (reservationState === "prepared") reservationState = "cleaned";
            return Promise.resolve();
        };
        const finalizeCleanup: FixtureStore["finalizeCleanup"] = () => {
            if (reservationState !== "cleaned") {
                return Promise.reject(new Error("reservation is not cleaned"));
            }
            reservationState = "released";
            return Promise.resolve();
        };
        let transitionCalls = 0;
        const transitionManifest: ExerciseArtifactStore["transitionManifest"] =
            (params) => {
                transitionCalls += 1;
                if (transitionCalls === 1) {
                    return Promise.reject(
                        new Error("injected manifest write failure"),
                    );
                }
                return Promise.resolve(
                    manifestForTest({
                        plan,
                        state: params.to,
                        fixture: manifest.fixture,
                    }),
                );
            };
        const readReportIfExists: ExerciseArtifactStore["readReportIfExists"] =
            () => Promise.resolve(undefined);

        await expect(
            cleanupExerciseTransition({
                manifest,
                fixtureStore: { cleanup, finalizeCleanup },
                artifacts: { readReportIfExists, transitionManifest },
            }),
        ).rejects.toThrow("injected manifest write failure");
        expect(reservationState).toBe("cleaned");

        await expect(
            cleanupExerciseTransition({
                manifest,
                fixtureStore: { cleanup, finalizeCleanup },
                artifacts: { readReportIfExists, transitionManifest },
            }),
        ).resolves.toBeUndefined();
        expect(reservationState).toBe("released");
        expect(cleanupCalls).toBe(2);
    });

    it("retries reservation release after the cleaned manifest is durable", async () => {
        const plan = planForTest();
        const manifest = manifestForTest({
            plan,
            state: "cleaned",
            fixture: fixtureForPlan(plan),
        });
        let finalizeCalls = 0;
        const finalizeCleanup: FixtureStore["finalizeCleanup"] = () => {
            finalizeCalls += 1;
            if (finalizeCalls === 1) {
                return Promise.reject(
                    new Error("injected reservation release failure"),
                );
            }
            return Promise.resolve();
        };
        const cleanup: FixtureStore["cleanup"] = () =>
            Promise.reject(
                new Error("cleanup must not rerun after manifest cleanup"),
            );
        const readReportIfExists: ExerciseArtifactStore["readReportIfExists"] =
            () =>
                Promise.reject(
                    new Error("report must not be read after manifest cleanup"),
                );
        const transitionManifest: ExerciseArtifactStore["transitionManifest"] =
            () =>
                Promise.reject(
                    new Error(
                        "manifest must not transition after manifest cleanup",
                    ),
                );

        await expect(
            cleanupExerciseTransition({
                manifest,
                fixtureStore: { cleanup, finalizeCleanup },
                artifacts: { readReportIfExists, transitionManifest },
            }),
        ).rejects.toThrow("injected reservation release failure");
        await expect(
            cleanupExerciseTransition({
                manifest,
                fixtureStore: { cleanup, finalizeCleanup },
                artifacts: { readReportIfExists, transitionManifest },
            }),
        ).resolves.toBeUndefined();
        expect(finalizeCalls).toBe(2);
    });
});
