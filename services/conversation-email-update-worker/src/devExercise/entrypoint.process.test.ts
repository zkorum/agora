import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const serviceDirectory = fileURLToPath(new URL("../../", import.meta.url));
const sourceEntrypoint = fileURLToPath(new URL("./index.ts", import.meta.url));

function validEnvironment(): NodeJS.ProcessEnv {
    return {
        PATH: process.env.PATH,
        HOME: process.env.HOME,
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
        CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_PARTICIPANT_COUNT: "4",
        CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_NAMESPACE: "process-guard-test",
        CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_SCENARIO: "success",
        CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_CAPTURE_BODIES: "false",
    };
}

const unsafeCases: readonly {
    name: string;
    environment: () => NodeJS.ProcessEnv;
}[] = [
    {
        name: "production",
        environment: () => ({ ...validEnvironment(), NODE_ENV: "production" }),
    },
    {
        name: "staging",
        environment: () => ({ ...validEnvironment(), NODE_ENV: "staging" }),
    },
    {
        name: "missing required safety variables",
        environment: () => {
            const environment = validEnvironment();
            delete environment.AGORA_DEV_MODE;
            return environment;
        },
    },
    {
        name: "missing database marker",
        environment: () => {
            const environment = validEnvironment();
            delete environment.CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_DATABASE_MARKER;
            return environment;
        },
    },
    {
        name: "remote database",
        environment: () => ({
            ...validEnvironment(),
            CONNECTION_STRING:
                "postgresql://postgres:postgres@db.example.com:5432/agora_email_exercise_test",
        }),
    },
    {
        name: "mismatched database name",
        environment: () => ({
            ...validEnvironment(),
            CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_EXPECTED_DB_NAME: "agora",
        }),
    },
    {
        name: "SES sender and configuration set",
        environment: () => ({
            ...validEnvironment(),
            CONVERSATION_EMAIL_UPDATE_EMAIL_FROM_ADDRESS: "sender@example.com",
            CONVERSATION_EMAIL_UPDATE_SES_CONFIGURATION_SET: "production-mail",
        }),
    },
    {
        name: "SES region",
        environment: () => ({
            ...validEnvironment(),
            CONVERSATION_EMAIL_UPDATE_SES_REGION: "eu-west-1",
        }),
    },
    {
        name: "read replica",
        environment: () => ({
            ...validEnvironment(),
            CONNECTION_STRING_READ:
                "postgresql://postgres@127.0.0.1:5433/agora_email_exercise_test",
        }),
    },
    {
        name: "AWS configuration",
        environment: () => ({
            ...validEnvironment(),
            AWS_PROFILE: "production",
        }),
    },
    {
        name: "libpq routing configuration",
        environment: () => ({
            ...validEnvironment(),
            PGHOST: "127.0.0.1",
        }),
    },
    {
        name: "missing conversation slug",
        environment: () => {
            const environment = validEnvironment();
            delete environment.CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_CONVERSATION_SLUG_ID;
            return environment;
        },
    },
    {
        name: "invalid conversation slug",
        environment: () => ({
            ...validEnvironment(),
            CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_CONVERSATION_SLUG_ID:
                "not-eight",
        }),
    },
    {
        name: "missing participant count",
        environment: () => {
            const environment = validEnvironment();
            delete environment.CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_PARTICIPANT_COUNT;
            return environment;
        },
    },
    {
        name: "invalid participant count",
        environment: () => ({
            ...validEnvironment(),
            CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_PARTICIPANT_COUNT: "10001",
        }),
    },
];

describe("development exercise process guard", () => {
    it.each(unsafeCases)(
        "rejects $name before importing runtime modules",
        async ({ environment }) => {
            const directory = await mkdtemp(
                `${tmpdir()}/agora-email-exercise-guard-`,
            );
            const marker = `${directory}/runtime-imported`;
            const result = spawnSync(
                process.execPath,
                ["--import", "tsx", sourceEntrypoint, "plan"],
                {
                    cwd: serviceDirectory,
                    encoding: "utf8",
                    env: {
                        ...environment(),
                        AGORA_DEV_EXERCISE_RUNTIME_IMPORT_MARKER_FILE: marker,
                    },
                    timeout: 10_000,
                },
            );

            expect(result.status).not.toBe(0);
            expect(result.stderr).toContain(
                "[Conversation Email Updates dev exercise]",
            );
            expect(existsSync(marker)).toBe(false);
            await rm(directory, { recursive: true, force: true });
        },
    );
});
