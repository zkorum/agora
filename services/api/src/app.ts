import "dotenv/config"; // this loads .env values in process.env
import { z } from "zod";
import Fastify from "fastify";
import { zodDidWeb } from "./shared/types/zod.js";
import {
    activePhoneAuthModeSchema,
    phoneAuthModeSchema,
} from "./shared/types/phone-auth.js";
import { sharedConfigSchema } from "./shared-backend/config.js";

export type Environment = "development" | "production" | "staging" | "test";

const defaultPort = 8080;
const environmentBoolean = (defaultValue: boolean) =>
    z
        .enum(["true", "false"])
        .default(defaultValue ? "true" : "false")
        .transform((value) => value === "true");

const baseConfigSchema = sharedConfigSchema.extend({
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
    SERVER_URL_STAGING: z.url().default(`https://staging.agoracitizen.app`),
    SERVER_URL_PROD: z.url().default(`https://www.agoracitizen.app`),
    SERVER_DID_DEV: zodDidWeb.default(
        `did:web:localhost%3A${defaultPort.toString()}`,
    ),
    SERVER_DID_STAGING: zodDidWeb.default(`did:web:staging.agoracitizen.app`),
    SERVER_DID_PROD: zodDidWeb.default(`did:web:agoracitizen.app`),
    EMAIL_OTP_MAX_ATTEMPT_AMOUNT: z.number().int().min(1).max(5).default(3),
    EMAIL_OTP_DESTINATION_MAX_WRONG_GUESSES: z.coerce
        .number()
        .int()
        .min(5)
        .max(100)
        .default(10),
    THROTTLE_SMS_SECONDS_INTERVAL: z.number().int().min(5).default(10),
    MINUTES_BEFORE_SMS_OTP_EXPIRY: z.number().int().min(3).max(60).default(10),
    PHONE_AUTH_MODE: phoneAuthModeSchema.default("enabled"),
    PHONE_LOGIN_ONLY_RESPONSE_MIN_MS: z.coerce
        .number()
        .int()
        .min(0)
        .max(10000)
        .default(2000),
    PHONE_LOGIN_ONLY_RESPONSE_JITTER_MS: z.coerce
        .number()
        .int()
        .min(0)
        .max(5000)
        .default(500),
    TWILIO_ACCOUNT_SID: z.string().min(1).optional(),
    TWILIO_AUTH_TOKEN: z.string().min(1).optional(),
    TWILIO_SERVICE_SID: z.string().min(1).optional(),
    TEST_CODE: z.coerce.number().int().min(0).max(999999).default(0),
    SPECIALLY_AUTHORIZED_PHONES: z.string().min(1).optional(),
    THROTTLE_EMAIL_SECONDS_INTERVAL: z.number().int().min(5).default(10),
    MINUTES_BEFORE_EMAIL_OTP_EXPIRY: z
        .number()
        .int()
        .min(3)
        .max(60)
        .default(10),
    AWS_SES_REGION: z.string().default("eu-west-1"),
    EMAIL_FROM_ADDRESS: z
        .email()
        .default("noreply@notify.agoracitizen.network"),
    CONVERSATION_EMAIL_UPDATE_EXPECTED_SNS_TOPIC_ARN: z
        .string()
        .regex(/^arn:aws(?:-us-gov|-cn)?:sns:[a-z0-9-]+:\d{12}:[A-Za-z0-9-_]+$/)
        .optional(),
    CONVERSATION_EMAIL_UPDATES_ENABLED: environmentBoolean(false),
    CONVERSATION_EMAIL_UPDATES_KILL_SWITCH: environmentBoolean(true),
    CONVERSATION_EMAIL_UPDATE_SNS_SIMULATOR_ENABLED: environmentBoolean(false),
    SPECIALLY_AUTHORIZED_EMAILS: z.string().min(1).optional(),
    SESSION_LIFETIME_DAYS: z.coerce.number().int().min(1).default(30),
    SESSION_REFRESH_THRESHOLD_DAYS: z.coerce.number().int().min(1).default(7),
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
    REACHER_BASE_URL: z.url().optional(),
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
    EXPORT_CONVOS_COOLDOWN_SECONDS: z.coerce.number().int().min(0).default(120), // Cooldown between exports for the same user and conversation
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
    PROJECT_DOCUMENTS_AWS_S3_REGION: z.string().optional(),
    PROJECT_DOCUMENTS_AWS_S3_BUCKET_NAME: z.string().optional(),
    PROJECT_DOCUMENTS_S3_PRESIGNED_URL_EXPIRY_SECONDS: z.coerce
        .number()
        .int()
        .min(60)
        .max(604800)
        .default(600),
    IS_MAXDIFF_GITHUB_ORG_ONLY: z
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
    MAXDIFF_GITHUB_ALLOWED_ORGS: z.string().default(""), // Comma-separated org names allowed to use GitHub connector when posting as org.
    MAXDIFF_GITHUB_ALLOWED_USERS: z.string().default(""), // Comma-separated user IDs allowed to use GitHub connector when posting as user.
    GITHUB_WEBHOOK_SECRET: z.string().optional(), // HMAC secret for verifying GitHub webhook payloads
    GITHUB_ACCESS_TOKEN: z.string().optional(), // GitHub personal access token for API calls (sync endpoint)
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
    IMPORT_ALLOWED_ORGS: z.string().default(""), // Comma-separated org names allowed to import conversations when posting as org (empty = all orgs allowed)
    IMPORT_ALLOWED_USERS: z.string().default(""), // Comma-separated user IDs allowed to import conversations when posting as user (empty = all users allowed)
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

const configSchema = baseConfigSchema.superRefine((value, ctx) => {
    const hasTwilioAccountSid = value.TWILIO_ACCOUNT_SID !== undefined;
    const hasTwilioAuthToken = value.TWILIO_AUTH_TOKEN !== undefined;
    const hasTwilioServiceSid = value.TWILIO_SERVICE_SID !== undefined;
    const hasAnyTwilioConfiguration =
        hasTwilioAccountSid || hasTwilioAuthToken || hasTwilioServiceSid;
    const hasCompleteTwilioConfiguration =
        hasTwilioAccountSid && hasTwilioAuthToken && hasTwilioServiceSid;

    if (hasAnyTwilioConfiguration && !hasCompleteTwilioConfiguration) {
        ctx.addIssue({
            code: "custom",
            path: ["TWILIO_ACCOUNT_SID"],
            message:
                "TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_SERVICE_SID must either all be set or all be unset",
        });
    } else if (
        value.NODE_ENV === "production" &&
        value.PHONE_AUTH_MODE !== "disabled" &&
        !hasCompleteTwilioConfiguration
    ) {
        ctx.addIssue({
            code: "custom",
            path: ["PHONE_AUTH_MODE"],
            message: `Complete Twilio configuration is required when PHONE_AUTH_MODE is ${value.PHONE_AUTH_MODE} in production`,
        });
    }

    if (
        value.NODE_ENV === "production" &&
        (value.SPECIALLY_AUTHORIZED_PHONES !== undefined ||
            value.SPECIALLY_AUTHORIZED_EMAILS !== undefined ||
            value.TEST_CODE !== 0)
    ) {
        ctx.addIssue({
            code: "custom",
            path: ["TEST_CODE"],
            message:
                "TEST_CODE, SPECIALLY_AUTHORIZED_PHONES, and SPECIALLY_AUTHORIZED_EMAILS must not enable test authentication in production",
        });
    }

    if (value.SESSION_REFRESH_THRESHOLD_DAYS >= value.SESSION_LIFETIME_DAYS) {
        ctx.addIssue({
            code: "custom",
            path: ["SESSION_REFRESH_THRESHOLD_DAYS"],
            message:
                "SESSION_REFRESH_THRESHOLD_DAYS must be less than SESSION_LIFETIME_DAYS",
        });
    }
    if (
        value.CONVERSATION_EMAIL_UPDATE_SNS_SIMULATOR_ENABLED &&
        value.NODE_ENV !== "development"
    ) {
        ctx.addIssue({
            code: "custom",
            path: ["CONVERSATION_EMAIL_UPDATE_SNS_SIMULATOR_ENABLED"],
            message:
                "The Conversation Email Updates SNS simulator is development-only",
        });
    }
});

export const config = configSchema.parse(process.env);
const phoneAuthConfigSchema = z.discriminatedUnion("mode", [
    z.object({ mode: z.literal("disabled") }).strict(),
    z
        .object({
            mode: activePhoneAuthModeSchema,
            delivery: z.discriminatedUnion("type", [
                z
                    .object({
                        type: z.literal("local"),
                        testCode: z.number().int().min(0).max(999999),
                        speciallyAuthorizedPhones: z.array(z.string()),
                    })
                    .strict(),
                z
                    .object({
                        type: z.literal("twilio"),
                        accountSid: z.string().min(1),
                        authToken: z.string().min(1),
                        serviceSid: z.string().min(1),
                    })
                    .strict(),
            ]),
        })
        .strict(),
]);

export type PhoneAuthConfig = z.infer<typeof phoneAuthConfigSchema>;

export const phoneAuthConfig = phoneAuthConfigSchema.parse(
    config.PHONE_AUTH_MODE === "disabled"
        ? { mode: "disabled" }
        : config.NODE_ENV === "production"
          ? {
                mode: config.PHONE_AUTH_MODE,
                delivery: {
                    type: "twilio",
                    accountSid: config.TWILIO_ACCOUNT_SID,
                    authToken: config.TWILIO_AUTH_TOKEN,
                    serviceSid: config.TWILIO_SERVICE_SID,
                },
            }
          : {
                mode: config.PHONE_AUTH_MODE,
                delivery: {
                    type: "local",
                    testCode: config.TEST_CODE,
                    speciallyAuthorizedPhones:
                        config.SPECIALLY_AUTHORIZED_PHONES === undefined
                            ? []
                            : config.SPECIALLY_AUTHORIZED_PHONES.replace(
                                  /\s/g,
                                  "",
                              ).split(","),
                },
            },
);
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
    // Production traffic arrives from the private nginx container. Public
    // peers remain untrusted, so their forwarding headers are ignored.
    trustProxy: ["loopback", "uniquelocal"],
});

export const log = server.log;
