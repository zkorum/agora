import { describe, expect, it } from "vitest";
import { parseDevExerciseEnvironment } from "./guard.js";

function validEnvironment(): NodeJS.ProcessEnv {
    return {
        NODE_ENV: "development",
        AGORA_DEV_MODE: "true",
        CONNECTION_STRING:
            "postgresql://postgres:postgres@127.0.0.1:5432/agora_email_exercise_test",
        CONVERSATION_EMAIL_UPDATES_ENABLED: "true",
        CONVERSATION_EMAIL_UPDATES_KILL_SWITCH: "false",
        CONVERSATION_EMAIL_UPDATE_PROVIDER: "simulated",
        CONVERSATION_EMAIL_UPDATE_SIMULATOR_ENABLED: "true",
        CONVERSATION_EMAIL_UPDATE_SITE_BASE_URL: "http://127.0.0.1:8080",
        CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_EXPECTED_DB_NAME:
            "agora_email_exercise_test",
        CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_DATABASE_MARKER: "m".repeat(32),
        CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_CONVERSATION_SLUG_ID: "Ab12Cd34",
        CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_PARTICIPANT_COUNT: "12",
        CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_NAMESPACE: "guard-test",
        CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_SCENARIO: "success",
        CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_CAPTURE_BODIES: "false",
    };
}

describe("development exercise environment guard", () => {
    it("parses only an explicit local simulation configuration", () => {
        expect(parseDevExerciseEnvironment(validEnvironment())).toMatchObject({
            NODE_ENV: "development",
            AGORA_DEV_MODE: true,
            CONVERSATION_EMAIL_UPDATES_ENABLED: true,
            CONVERSATION_EMAIL_UPDATES_KILL_SWITCH: false,
            CONVERSATION_EMAIL_UPDATE_PROVIDER: "simulated",
            CONVERSATION_EMAIL_UPDATE_SIMULATOR_ENABLED: true,
            CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_CONVERSATION_SLUG_ID:
                "Ab12Cd34",
            CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_PARTICIPANT_COUNT: 12,
        });
    });

    it("allows the kill switch only for its explicit scenario", () => {
        const environment = validEnvironment();
        environment.CONVERSATION_EMAIL_UPDATES_KILL_SWITCH = "true";
        environment.CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_SCENARIO =
            "kill_switch";
        expect(
            parseDevExerciseEnvironment(environment)
                .CONVERSATION_EMAIL_UPDATES_KILL_SWITCH,
        ).toBe(true);
    });

    it("requires every mixed-outcome cohort to be represented", () => {
        expect(() =>
            parseDevExerciseEnvironment({
                ...validEnvironment(),
                CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_SCENARIO:
                    "mixed_participant_outcomes",
                CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_PARTICIPANT_COUNT: "2",
            }),
        ).toThrow("requires at least three participants");
    });

    it.each([
        [
            "postgres alias",
            { CONNECTION_STRING: "postgres://postgres@127.0.0.1/db" },
        ],
        [
            "hostname",
            { CONNECTION_STRING: "postgresql://postgres@localhost/db" },
        ],
        [
            "remote site",
            { CONVERSATION_EMAIL_UPDATE_SITE_BASE_URL: "https://example.com" },
        ],
        ["database override", { DB_HOST: "127.0.0.1" }],
        ["libpq database override", { PGDATABASE: "other" }],
        ["libpq service file", { PGSERVICEFILE: "/tmp/pg_service.conf" }],
        ["generic database URL", { DATABASE_URL: "postgresql://other" }],
        ["AWS environment", { AWS_PROFILE: "development" }],
        ["SES region", { CONVERSATION_EMAIL_UPDATE_SES_REGION: "eu-west-1" }],
    ])("rejects %s configuration", (_label, override) => {
        expect(() =>
            parseDevExerciseEnvironment({
                ...validEnvironment(),
                ...override,
            }),
        ).toThrow();
    });

    it.each([
        [
            "conversation slug",
            () => {
                const environment = validEnvironment();
                delete environment.CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_CONVERSATION_SLUG_ID;
                return environment;
            },
        ],
        [
            "participant count",
            () => {
                const environment = validEnvironment();
                delete environment.CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_PARTICIPANT_COUNT;
                return environment;
            },
        ],
        [
            "database marker",
            () => {
                const environment = validEnvironment();
                delete environment.CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_DATABASE_MARKER;
                return environment;
            },
        ],
    ])("requires %s", (_name, environment) => {
        expect(() => parseDevExerciseEnvironment(environment())).toThrow();
    });

    it.each([
        [
            "short slug",
            {
                CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_CONVERSATION_SLUG_ID:
                    "short",
            },
        ],
        [
            "zero participants",
            { CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_PARTICIPANT_COUNT: "0" },
        ],
        [
            "too many participants",
            {
                CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_PARTICIPANT_COUNT:
                    "10001",
            },
        ],
        [
            "fractional participants",
            { CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_PARTICIPANT_COUNT: "1.5" },
        ],
        [
            "non-dedicated database name",
            {
                CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_EXPECTED_DB_NAME:
                    "exercise",
            },
        ],
    ])("rejects %s", (_label, override) => {
        expect(() =>
            parseDevExerciseEnvironment({ ...validEnvironment(), ...override }),
        ).toThrow();
    });
});
