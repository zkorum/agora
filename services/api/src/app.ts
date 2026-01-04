import "dotenv/config"; // this loads .env values in process.env
import { z } from "zod";
import Fastify from "fastify";
import { zodDidWeb } from "./shared/types/zod.js";
import { sharedConfigSchema } from "./shared-backend/config.js";

export type Environment = "development" | "production" | "staging" | "test";

const defaultPort = 8080;

const configSchema = sharedConfigSchema.extend({
    CORS_ORIGIN_LIST: z
        .string()
        .transform((value) =>
            value.split(",").map((item) => {
                return item.trim();
            }),
        )
        .pipe(z.string().array()),
    PORT: z.coerce.number().int().nonnegative().default(defaultPort),
    MODE: z.enum(["web", "capacitor", "test"]).default("web"),
    IMAGES_SERVICE_BASE_URL: z
        .url()
        .default("https://staging.agoracitizen.app/images/"),
    SERVER_URL_DEV: z
        .url()
        .default(`http://localhost:${defaultPort.toString()}`),
    SERVER_URL_STAGING: z
        .url()
        .default(`https://staging.agoracitizen.app`),
    SERVER_URL_PROD: z.url().default(`https://www.agoracitizen.app`),
    SERVER_DID_DEV: zodDidWeb.default(
        `did:web:localhost%3A${defaultPort.toString()}`,
    ),
    SERVER_DID_STAGING: zodDidWeb.default(`did:web:staging.agoracitizen.app`),
    SERVER_DID_PROD: zodDidWeb.default(`did:web:agoracitizen.app`),
    EMAIL_OTP_MAX_ATTEMPT_AMOUNT: z.number().int().min(1).max(5).default(3),
    THROTTLE_SMS_SECONDS_INTERVAL: z.number().int().min(5).default(10),
    MINUTES_BEFORE_SMS_OTP_EXPIRY: z.number().int().min(3).max(60).default(10),
    TWILIO_ACCOUNT_SID: z.string().optional(),
    TWILIO_AUTH_TOKEN: z.string().optional(),
    TWILIO_SERVICE_SID: z.string().optional(),
    TEST_CODE: z.coerce.number().int().min(0).max(999999).default(0),
    SPECIALLY_AUTHORIZED_PHONES: z.string().optional(),
    PEPPERS: z
        .string()
        .transform((value) =>
            value.split(",").map((item) => {
                return item.trim();
            }),
        )
        .pipe(z.string().min(16).array().nonempty()),
    VERIFICATOR_SVC_BASE_URL: z.url(),
    BASE_EVENT_ID: z.string().min(20).default("63957849393154643868"),
    // Zupass public key for verifying event ticket PCDs
    // This is the official Devcon Podbox pipeline public key
    // Source: https://github.com/efdevcon/monorepo/blob/main/devcon-api/src/utils/zupass.ts
    ZUPASS_PUBLIC_KEY: z
        .string()
        .default("YwahfUdUYehkGMaWh0+q3F8itx2h8mybjPmt8CmTJSs"),
    NOSTR_PROOF_CHANNEL_EVENT_ID: z.string().optional(), // if undefined, then nostr functionalities are disabled
    NOSTR_DEFAULT_RELAY_URL: z.url().default("wss://nos.lol"),
    POLIS_BASE_URL: z.url().optional(),
    POLIS_CONV_TO_IMPORT_ON_RUN: z.undefined().or(
        z
            .string()
            .transform((value) =>
                value.split(",").map((item) => {
                    return item.trim();
                }),
            )
            .pipe(z.array(z.string()).min(2).max(3)), // summary, comments, votes csv
    ),
    VOTE_NOTIF_MILESTONES: z
        .string()
        .default(
            "1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000, 2500000, 5000000, 10000000",
        )
        .transform((value) =>
            value.split(",").map((item) => {
                return parseInt(item.trim(), 10);
            }),
        )
        .pipe(z.number().int().min(1).array().nonempty()),
    // S3 configuration for conversation CSV exports
    EXPORT_CONVOS_AWS_S3_REGION: z.string().optional(),
    EXPORT_CONVOS_AWS_S3_BUCKET_NAME: z.string().optional(),
    EXPORT_CONVOS_EXPIRY_DAYS: z.coerce.number().int().min(1).default(30), // Export file expiry
    EXPORT_CONVOS_COOLDOWN_SECONDS: z.coerce.number().int().min(0).default(300), // Cooldown between exports for same conversation (default: 5 minutes)
    EXPORT_CONVOS_S3_PRESIGNED_URL_EXPIRY_SECONDS: z.coerce
        .number()
        .int()
        .min(60)
        .default(3600), // Presigned URL expiry (default: 1 hour)
    EXPORT_CONVOS_ENABLED: z
        .string()
        .default("true")
        .transform((value, ctx) => {
            if (value.toLowerCase().trim() === "true") {
                return true;
            } else if (value.toLowerCase().trim() === "false") {
                return false;
            } else {
                ctx.addIssue({
                    code: "custom",
                    message: "Value must be true or false",
                });
                return z.NEVER;
            }
        }),
    EXPORT_CONVOS_BUFFER_MAX_BATCH_SIZE: z.coerce
        .number()
        .int()
        .min(1)
        .default(100), // Max exports to take from queue per flush
    EXPORT_CONVOS_BUFFER_MAX_CONCURRENCY: z.coerce
        .number()
        .int()
        .min(1)
        .default(5), // Max exports to process in parallel (exports are I/O-bound: CSV generation + S3 upload)
    EXPORT_CONVOS_BUFFER_STALE_THRESHOLD_MS: z.coerce
        .number()
        .int()
        .min(30000)
        .default(300000), // 5 minutes - mark "processing" exports as failed after this
    EXPORT_CONVOS_BUFFER_STALE_CLEANUP_EVERY_N_FLUSHES: z.coerce
        .number()
        .int()
        .min(1)
        .default(60), // Run stale cleanup every N flushes (~1 minute at 1s flush)
    IS_ORG_IMPORT_ONLY: z
        .string()
        .default("false")
        .transform((value, ctx) => {
            if (value.toLowerCase().trim() === "true") {
                return true;
            } else if (value.toLowerCase().trim() === "false") {
                return false;
            } else {
                ctx.addIssue({
                    code: "custom",
                    message: "Value must be true or false",
                });
                return z.NEVER;
            }
        }),
    // CSV Import buffer configuration
    IMPORT_BUFFER_MAX_BATCH_SIZE: z.coerce
        .number()
        .int()
        .nonnegative()
        .default(4), // Max imports to take from queue per flush (0 = disable imports)
    IMPORT_BUFFER_MAX_CONCURRENCY: z.coerce.number().int().min(1).default(2), // Max imports to process in parallel
    IMPORT_BUFFER_FLUSH_INTERVAL_MS: z.coerce
        .number()
        .int()
        .min(100)
        .default(1000), // Flush interval in ms
    IMPORT_BUFFER_STALE_THRESHOLD_MS: z.coerce
        .number()
        .int()
        .min(30000)
        .default(300000), // 5 minutes - mark "processing" imports as failed after this
    IMPORT_BUFFER_STALE_CLEANUP_EVERY_N_FLUSHES: z.coerce
        .number()
        .int()
        .min(1)
        .default(60), // Run stale cleanup every N flushes (~1 minute at 1s flush)
    // Vote buffer configuration (batches votes to reduce DB contention)
    VOTE_BUFFER_FLUSH_INTERVAL_MS: z.coerce
        .number()
        .int()
        .min(100)
        .default(1000), // Flush interval in ms
    VOTE_BUFFER_VALKEY_BATCH_LIMIT: z.coerce
        .number()
        .int()
        .min(1)
        .default(5000), // Max votes to fetch from Valkey per flush
});

export const config = configSchema.parse(process.env);
function envToLogger(env: Environment) {
    switch (env) {
        case "development":
        case "test":
            return {
                transport: {
                    target: "pino-pretty",
                    options: {
                        translateTime: "HH:MM:ss Z",
                        ignore: "pid,hostname",
                    },
                },
            };
        case "production":
        case "staging":
            return true;
    }
}

export const server = Fastify({
    logger: envToLogger(config.NODE_ENV),
});

export const log = server.log;
