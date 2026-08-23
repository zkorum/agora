import { z } from "zod";

const requiredBoolean = z
    .enum(["true", "false"])
    .transform((value) => value === "true");

export const devExerciseScenarioSchema = z.enum([
    "success",
    "owner_permanent_rejection",
    "participant_retry_then_success",
    "mixed_participant_outcomes",
    "kill_switch",
]);

const environmentSchema = z
    .object({
        NODE_ENV: z.literal("development"),
        AGORA_DEV_MODE: z.literal("true").transform(() => true),
        CONNECTION_STRING: z.string().min(1),
        CONVERSATION_EMAIL_UPDATES_ENABLED: z
            .literal("true")
            .transform(() => true),
        CONVERSATION_EMAIL_UPDATES_KILL_SWITCH: requiredBoolean,
        CONVERSATION_EMAIL_UPDATE_PROVIDER: z.literal("simulated"),
        CONVERSATION_EMAIL_UPDATE_SIMULATOR_ENABLED: z
            .literal("true")
            .transform(() => true),
        CONVERSATION_EMAIL_UPDATE_SITE_BASE_URL: z.url(),
        CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_EXPECTED_DB_NAME: z
            .string()
            .regex(/^agora_email_exercise_[a-z0-9_]+$/),
        CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_DATABASE_MARKER: z
            .string()
            .min(32)
            .max(128)
            .regex(/^[A-Za-z0-9_-]+$/),
        CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_CONVERSATION_SLUG_ID: z
            .string()
            .regex(/^[A-Za-z0-9]{8}$/),
        CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_PARTICIPANT_COUNT: z.coerce
            .number()
            .int()
            .min(1)
            .max(10_000),
        CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_NAMESPACE: z
            .string()
            .min(3)
            .max(48)
            .regex(/^[a-z][a-z0-9-]*[a-z0-9]$/),
        CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_SCENARIO:
            devExerciseScenarioSchema,
        CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_CAPTURE_BODIES: requiredBoolean,
    })
    .strict()
    .superRefine((value, context) => {
        const killSwitchExpected =
            value.CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_SCENARIO ===
            "kill_switch";
        if (
            value.CONVERSATION_EMAIL_UPDATES_KILL_SWITCH !== killSwitchExpected
        ) {
            context.addIssue({
                code: "custom",
                path: ["CONVERSATION_EMAIL_UPDATES_KILL_SWITCH"],
                message: killSwitchExpected
                    ? "The kill-switch exercise requires the kill switch"
                    : "The kill switch must be off outside the kill-switch exercise",
            });
        }

        let databaseUrl: URL;
        try {
            databaseUrl = new URL(value.CONNECTION_STRING);
        } catch {
            context.addIssue({
                code: "custom",
                path: ["CONNECTION_STRING"],
                message: "Must be a valid postgresql URL",
            });
            return;
        }
        if (databaseUrl.protocol !== "postgresql:") {
            context.addIssue({
                code: "custom",
                path: ["CONNECTION_STRING"],
                message: "Must use the postgresql protocol",
            });
        }
        if (!isLiteralLoopbackHost(databaseUrl.hostname)) {
            context.addIssue({
                code: "custom",
                path: ["CONNECTION_STRING"],
                message: "Database host must be literal loopback",
            });
        }
        if (databaseUrl.search !== "" || databaseUrl.hash !== "") {
            context.addIssue({
                code: "custom",
                path: ["CONNECTION_STRING"],
                message:
                    "Database URL must not contain query parameters or a fragment",
            });
        }
        const encodedDatabaseName = databaseUrl.pathname.slice(1);
        let databaseName = encodedDatabaseName;
        try {
            databaseName = decodeURIComponent(encodedDatabaseName);
        } catch {
            context.addIssue({
                code: "custom",
                path: ["CONNECTION_STRING"],
                message: "Database name must be valid URL-encoded text",
            });
        }
        if (
            databaseName === "" ||
            databaseName.includes("/") ||
            databaseName !==
                value.CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_EXPECTED_DB_NAME
        ) {
            context.addIssue({
                code: "custom",
                path: ["CONNECTION_STRING"],
                message:
                    "Database URL name must exactly match the expected database name",
            });
        }

        const siteUrl = new URL(value.CONVERSATION_EMAIL_UPDATE_SITE_BASE_URL);
        if (
            !["http:", "https:"].includes(siteUrl.protocol) ||
            !isLiteralLoopbackHost(siteUrl.hostname) ||
            siteUrl.username !== "" ||
            siteUrl.password !== ""
        ) {
            context.addIssue({
                code: "custom",
                path: ["CONVERSATION_EMAIL_UPDATE_SITE_BASE_URL"],
                message:
                    "Site base URL must be an unauthenticated loopback HTTP(S) URL",
            });
        }
    });

const forbiddenExactNames = new Set([
    "CONNECTION_STRING_READ",
    "DB_HOST",
    "DB_PORT",
    "DB_NAME",
    "DB_HOST_READ",
    "DB_PORT_READ",
    "DB_NAME_READ",
    "DATABASE_URL",
    "CONVERSATION_EMAIL_UPDATE_EMAIL_FROM_ADDRESS",
    "CONVERSATION_EMAIL_UPDATE_SES_REGION",
    "CONVERSATION_EMAIL_UPDATE_SES_CONFIGURATION_SET",
]);

function isLiteralLoopbackHost(hostname: string): boolean {
    return (
        hostname === "127.0.0.1" || hostname === "[::1]" || hostname === "::1"
    );
}

export type DevExerciseEnvironment = z.infer<typeof environmentSchema>;

export function parseDevExerciseEnvironment(
    source: NodeJS.ProcessEnv,
): DevExerciseEnvironment {
    const forbiddenNames = Object.keys(source).filter(
        (name) =>
            forbiddenExactNames.has(name) ||
            name.startsWith("AWS_") ||
            name.startsWith("PG"),
    );
    if (forbiddenNames.length > 0) {
        throw new Error(
            `Forbidden development exercise environment variables: ${forbiddenNames.sort().join(", ")}`,
        );
    }

    const selectedSource = {
        NODE_ENV: source.NODE_ENV,
        AGORA_DEV_MODE: source.AGORA_DEV_MODE,
        CONNECTION_STRING: source.CONNECTION_STRING,
        CONVERSATION_EMAIL_UPDATES_ENABLED:
            source.CONVERSATION_EMAIL_UPDATES_ENABLED,
        CONVERSATION_EMAIL_UPDATES_KILL_SWITCH:
            source.CONVERSATION_EMAIL_UPDATES_KILL_SWITCH,
        CONVERSATION_EMAIL_UPDATE_PROVIDER:
            source.CONVERSATION_EMAIL_UPDATE_PROVIDER,
        CONVERSATION_EMAIL_UPDATE_SIMULATOR_ENABLED:
            source.CONVERSATION_EMAIL_UPDATE_SIMULATOR_ENABLED,
        CONVERSATION_EMAIL_UPDATE_SITE_BASE_URL:
            source.CONVERSATION_EMAIL_UPDATE_SITE_BASE_URL,
        CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_EXPECTED_DB_NAME:
            source.CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_EXPECTED_DB_NAME,
        CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_DATABASE_MARKER:
            source.CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_DATABASE_MARKER,
        CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_CONVERSATION_SLUG_ID:
            source.CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_CONVERSATION_SLUG_ID,
        CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_PARTICIPANT_COUNT:
            source.CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_PARTICIPANT_COUNT,
        CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_NAMESPACE:
            source.CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_NAMESPACE,
        CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_SCENARIO:
            source.CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_SCENARIO,
        CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_CAPTURE_BODIES:
            source.CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_CAPTURE_BODIES,
    };
    return environmentSchema.parse(selectedSource);
}

export function formatDevExerciseGuardError(error: unknown): string {
    if (error instanceof z.ZodError) {
        return error.issues
            .map(
                (issue) =>
                    `${issue.path.join(".") || "environment"}: ${issue.message}`,
            )
            .join("; ");
    }
    return error instanceof Error ? error.message : "Unknown guard failure";
}
