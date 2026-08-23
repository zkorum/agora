import "dotenv/config";
import { hostname } from "node:os";
import { z } from "zod";
import type { SharedConfigSchema } from "@/shared-backend/config.js";

const environmentBoolean = (defaultValue: boolean) =>
    z
        .enum(["true", "false"])
        .default(defaultValue ? "true" : "false")
        .transform((value) => value === "true");

const environmentSchema = z
    .object({
        NODE_ENV: z
            .enum(["development", "staging", "production", "test"])
            .default("development"),
        AGORA_DEV_MODE: environmentBoolean(false),
        CONNECTION_STRING: z.string().optional(),
        CONNECTION_STRING_READ: z.string().optional(),
        AWS_SECRET_ID: z.string().optional(),
        AWS_SECRET_REGION: z.string().optional(),
        DB_HOST: z.string().optional(),
        DB_PORT: z.coerce.number().int().nonnegative().default(5432),
        DB_NAME: z.string().default("agora"),
        AWS_SECRET_ID_READ: z.string().optional(),
        AWS_SECRET_REGION_READ: z.string().optional(),
        DB_HOST_READ: z.string().optional(),
        DB_PORT_READ: z.coerce.number().int().nonnegative().default(5433),
        CONVERSATION_EMAIL_UPDATES_ENABLED: environmentBoolean(false),
        CONVERSATION_EMAIL_UPDATES_KILL_SWITCH: environmentBoolean(true),
        CONVERSATION_EMAIL_UPDATE_SES_REGION: z
            .string()
            .min(1)
            .default("eu-west-1"),
        CONVERSATION_EMAIL_UPDATE_EMAIL_FROM_ADDRESS: z.email().optional(),
        CONVERSATION_EMAIL_UPDATE_SES_CONFIGURATION_SET: z
            .string()
            .min(1)
            .optional(),
        CONVERSATION_EMAIL_UPDATE_PROVIDER: z
            .enum(["ses", "simulated"])
            .default("ses"),
        CONVERSATION_EMAIL_UPDATE_SIMULATOR_ENABLED: environmentBoolean(false),
        CONVERSATION_EMAIL_UPDATE_SIMULATOR_MODE: z
            .enum([
                "success",
                "retryable_rejected",
                "retryable_rejected_then_success",
                "permanent_rejected",
                "unknown",
            ])
            .default("success"),
        CONVERSATION_EMAIL_UPDATE_SIMULATOR_RETRYABLE_FAILURES: z.coerce
            .number()
            .int()
            .min(1)
            .max(10)
            .default(1),
        CONVERSATION_EMAIL_UPDATE_WORKER_ID: z
            .string()
            .min(1)
            .max(100)
            .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/)
            .default(`${hostname()}-${process.pid.toString()}`),
        CONVERSATION_EMAIL_UPDATE_WORKER_POLL_INTERVAL_MS: z.coerce
            .number()
            .int()
            .min(100)
            .default(1_000),
        CONVERSATION_EMAIL_UPDATE_WORKER_HEARTBEAT_INTERVAL_MS: z.coerce
            .number()
            .int()
            .min(60_000)
            .max(3_600_000)
            .default(60_000),
        CONVERSATION_EMAIL_UPDATE_WORKER_BATCH_SIZE: z.coerce
            .number()
            .int()
            .min(1)
            .max(1_000)
            .default(25),
        CONVERSATION_EMAIL_UPDATE_WORKER_CONCURRENCY: z.coerce
            .number()
            .int()
            .min(1)
            .max(100)
            .default(4),
        CONVERSATION_EMAIL_UPDATE_WORKER_SENDS_PER_SECOND: z.coerce
            .number()
            .positive()
            .max(1_000)
            .default(5),
        CONVERSATION_EMAIL_UPDATE_WORKER_LEASE_SECONDS: z.coerce
            .number()
            .int()
            .min(30)
            .max(3_600)
            .default(120),
        CONVERSATION_EMAIL_UPDATE_REQUEST_TIMEOUT_MS: z.coerce
            .number()
            .int()
            .min(1_000)
            .max(120_000)
            .default(20_000),
        CONVERSATION_EMAIL_UPDATE_SITE_BASE_URL: z.url().optional(),
        CONVERSATION_EMAIL_UPDATE_WORKER_LOG_LEVEL: z
            .enum(["fatal", "error", "warn", "info", "debug", "trace"])
            .optional(),
    })
    .superRefine((value, ctx) => {
        const simulatedProvider =
            value.CONVERSATION_EMAIL_UPDATE_PROVIDER === "simulated";
        if (
            value.CONVERSATION_EMAIL_UPDATE_SIMULATOR_ENABLED &&
            (value.NODE_ENV !== "development" || !value.AGORA_DEV_MODE)
        ) {
            ctx.addIssue({
                code: "custom",
                path: ["CONVERSATION_EMAIL_UPDATE_SIMULATOR_ENABLED"],
                message:
                    "The Email Updates simulator requires NODE_ENV=development and AGORA_DEV_MODE=true",
            });
        }
        if (
            simulatedProvider !==
            value.CONVERSATION_EMAIL_UPDATE_SIMULATOR_ENABLED
        ) {
            ctx.addIssue({
                code: "custom",
                path: ["CONVERSATION_EMAIL_UPDATE_PROVIDER"],
                message:
                    "The simulated provider and simulator enable flag must be selected together",
            });
        }
        if (
            simulatedProvider &&
            (value.CONVERSATION_EMAIL_UPDATE_EMAIL_FROM_ADDRESS !== undefined ||
                value.CONVERSATION_EMAIL_UPDATE_SES_CONFIGURATION_SET !==
                    undefined)
        ) {
            ctx.addIssue({
                code: "custom",
                path: ["CONVERSATION_EMAIL_UPDATE_PROVIDER"],
                message:
                    "Simulated and real SES configuration cannot be enabled together",
            });
        }
        if (!value.CONVERSATION_EMAIL_UPDATES_ENABLED) return;
        const required: (readonly [string, string | undefined])[] = [
            [
                "CONVERSATION_EMAIL_UPDATE_SITE_BASE_URL",
                value.CONVERSATION_EMAIL_UPDATE_SITE_BASE_URL,
            ],
        ];
        if (!simulatedProvider) {
            required.push(
                [
                    "CONVERSATION_EMAIL_UPDATE_EMAIL_FROM_ADDRESS",
                    value.CONVERSATION_EMAIL_UPDATE_EMAIL_FROM_ADDRESS,
                ],
                [
                    "CONVERSATION_EMAIL_UPDATE_SES_CONFIGURATION_SET",
                    value.CONVERSATION_EMAIL_UPDATE_SES_CONFIGURATION_SET,
                ],
            );
        }
        for (const [path, configuredValue] of required) {
            if (configuredValue === undefined) {
                ctx.addIssue({
                    code: "custom",
                    path: [path],
                    message: `${path} is required when email updates are enabled`,
                });
            }
        }
        if (
            value.CONVERSATION_EMAIL_UPDATE_SITE_BASE_URL !== undefined &&
            new URL(value.CONVERSATION_EMAIL_UPDATE_SITE_BASE_URL).protocol !==
                "https:"
        ) {
            ctx.addIssue({
                code: "custom",
                path: ["CONVERSATION_EMAIL_UPDATE_SITE_BASE_URL"],
                message: "Conversation Email Updates require an HTTPS site URL",
            });
        }
        if (
            value.CONVERSATION_EMAIL_UPDATE_REQUEST_TIMEOUT_MS >=
            value.CONVERSATION_EMAIL_UPDATE_WORKER_LEASE_SECONDS * 1_000
        ) {
            ctx.addIssue({
                code: "custom",
                path: ["CONVERSATION_EMAIL_UPDATE_REQUEST_TIMEOUT_MS"],
                message:
                    "The SES request timeout must be shorter than the lease",
            });
        }
    });

export function parseConversationEmailWorkerEnvironment(
    source: NodeJS.ProcessEnv,
): z.infer<typeof environmentSchema> {
    return environmentSchema.parse(source);
}

const environment = parseConversationEmailWorkerEnvironment(process.env);

export const databaseConfig = {
    NODE_ENV: environment.NODE_ENV,
    CONNECTION_STRING: environment.CONNECTION_STRING,
    CONNECTION_STRING_READ: environment.CONNECTION_STRING_READ,
    AWS_SECRET_ID: environment.AWS_SECRET_ID,
    AWS_SECRET_REGION: environment.AWS_SECRET_REGION,
    DB_HOST: environment.DB_HOST,
    DB_PORT: environment.DB_PORT,
    DB_NAME: environment.DB_NAME,
    AWS_SECRET_ID_READ: environment.AWS_SECRET_ID_READ,
    AWS_SECRET_REGION_READ: environment.AWS_SECRET_REGION_READ,
    DB_HOST_READ: environment.DB_HOST_READ,
    DB_PORT_READ: environment.DB_PORT_READ,
    GOOGLE_CLOUD_TRANSLATION_LOCATION: "us-central1",
    GOOGLE_CLOUD_TRANSLATION_ENDPOINT: "translate.googleapis.com",
    QUEUE_VALKEY_URL: undefined,
} satisfies SharedConfigSchema;

export interface ConversationEmailWorkerConfig {
    enabled: boolean;
    killSwitch: boolean;
    sesRegion: string;
    fromAddress: string | undefined;
    configurationSetName: string | undefined;
    provider: "ses" | "simulated";
    simulatorMode:
        | "success"
        | "retryable_rejected"
        | "retryable_rejected_then_success"
        | "permanent_rejected"
        | "unknown";
    simulatorRetryableFailures: number;
    workerId: string;
    pollIntervalMs: number;
    heartbeatIntervalMs: number;
    batchSize: number;
    concurrency: number;
    sendsPerSecond: number;
    leaseSeconds: number;
    requestTimeoutMs: number;
    siteBaseUrl: string | undefined;
}

export const workerConfig: ConversationEmailWorkerConfig = {
    enabled: environment.CONVERSATION_EMAIL_UPDATES_ENABLED,
    killSwitch: environment.CONVERSATION_EMAIL_UPDATES_KILL_SWITCH,
    sesRegion: environment.CONVERSATION_EMAIL_UPDATE_SES_REGION,
    fromAddress: environment.CONVERSATION_EMAIL_UPDATE_EMAIL_FROM_ADDRESS,
    configurationSetName:
        environment.CONVERSATION_EMAIL_UPDATE_SES_CONFIGURATION_SET,
    provider: environment.CONVERSATION_EMAIL_UPDATE_PROVIDER,
    simulatorMode: environment.CONVERSATION_EMAIL_UPDATE_SIMULATOR_MODE,
    simulatorRetryableFailures:
        environment.CONVERSATION_EMAIL_UPDATE_SIMULATOR_RETRYABLE_FAILURES,
    workerId: environment.CONVERSATION_EMAIL_UPDATE_WORKER_ID,
    pollIntervalMs:
        environment.CONVERSATION_EMAIL_UPDATE_WORKER_POLL_INTERVAL_MS,
    heartbeatIntervalMs:
        environment.CONVERSATION_EMAIL_UPDATE_WORKER_HEARTBEAT_INTERVAL_MS,
    batchSize: environment.CONVERSATION_EMAIL_UPDATE_WORKER_BATCH_SIZE,
    concurrency: environment.CONVERSATION_EMAIL_UPDATE_WORKER_CONCURRENCY,
    sendsPerSecond:
        environment.CONVERSATION_EMAIL_UPDATE_WORKER_SENDS_PER_SECOND,
    leaseSeconds: environment.CONVERSATION_EMAIL_UPDATE_WORKER_LEASE_SECONDS,
    requestTimeoutMs: environment.CONVERSATION_EMAIL_UPDATE_REQUEST_TIMEOUT_MS,
    siteBaseUrl: environment.CONVERSATION_EMAIL_UPDATE_SITE_BASE_URL,
};

export const runtimeConfig = {
    environment: environment.NODE_ENV,
    workerId: environment.CONVERSATION_EMAIL_UPDATE_WORKER_ID,
    logLevel:
        environment.CONVERSATION_EMAIL_UPDATE_WORKER_LOG_LEVEL ??
        (environment.NODE_ENV === "development" ? "debug" : "info"),
};
