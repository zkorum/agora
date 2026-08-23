import { describe, expect, it } from "vitest";
import { parseDevExerciseEnvironment } from "./guard.js";
import { createExercisePlan, exercisePlanSchema } from "./schemas.js";

function environment() {
    return parseDevExerciseEnvironment({
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
        CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_DATABASE_MARKER: "m".repeat(32),
        CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_CONVERSATION_SLUG_ID: "Ab12Cd34",
        CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_PARTICIPANT_COUNT: "7",
        CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_NAMESPACE: "schema-test",
        CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_SCENARIO:
            "mixed_participant_outcomes",
        CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_CAPTURE_BODIES: "false",
    });
}

describe("development exercise schemas", () => {
    it("creates deterministic namespaced IDs, emails, and cohorts", () => {
        const first = createExercisePlan(environment());
        const second = createExercisePlan(environment());

        expect(first).toEqual(second);
        expect(
            new Set(first.identities.map((identity) => identity.userId)).size,
        ).toBe(7);
        expect(
            new Set(first.identities.map((identity) => identity.email)).size,
        ).toBe(7);
        expect(first.identities.map((identity) => identity.cohort)).toEqual([
            "participant_success",
            "participant_retry",
            "participant_permanent_failure",
            "participant_success",
            "participant_retry",
            "participant_permanent_failure",
            "participant_success",
        ]);
        expect(first.identities.map((identity) => identity.ordinal)).toEqual([
            1, 2, 3, 4, 5, 6, 7,
        ]);
        expect(
            first.identities.every((identity) =>
                identity.email.endsWith("@exercise.invalid"),
            ),
        ).toBe(true);
    });

    it("rejects unknown plan properties", () => {
        expect(() =>
            exercisePlanSchema.parse({
                ...createExercisePlan(environment()),
                unsafeOverride: true,
            }),
        ).toThrow();
    });

    it("requires identity length to equal participant count", () => {
        const plan = createExercisePlan(environment());
        expect(() =>
            exercisePlanSchema.parse({
                ...plan,
                identities: plan.identities.slice(1),
            }),
        ).toThrow("Identity count must equal participant count");
    });
});
