import "dotenv/config"; // this loads .env values in process.env
import { z } from "zod";
import Fastify from "fastify";
import { zodDidWeb } from "./shared/types/zod.js";

export type Environment = "development" | "production" | "staging";

const defaultPort = 8080;

const configSchema = z.object({
    CORS_ORIGIN_LIST: z
        .string()
        .transform((value) =>
            value.split(",").map((item) => {
                return item.trim();
            }),
        )
        .pipe(z.string().array()),
    CONNECTION_STRING: z.string(),
    PORT: z.coerce.number().int().nonnegative().default(defaultPort),
    NODE_ENV: z
        .enum(["development", "staging", "production"])
        .default("development"),
    MODE: z.enum(["web", "capacitor"]).default("web"),
    SERVER_URL_DEV: z
        .string()
        .url()
        .default(`http://localhost:${defaultPort.toString()}`),
    SERVER_URL_STAGING: z
        .string()
        .url()
        .default(`https://staging.agoracitizen.network`),
    SERVER_URL_PROD: z.string().url().default(`https://agoracitizen.network`),
    SERVER_DID_DEV: zodDidWeb.default(
        `did:web:localhost%3A${defaultPort.toString()}`,
    ),
    SERVER_DID_STAGING: zodDidWeb.default(
        `did:web:staging.agoracitizen.network`,
    ),
    SERVER_DID_PROD: zodDidWeb.default(`did:web:agoracitizen.network`),
    EMAIL_OTP_MAX_ATTEMPT_AMOUNT: z.number().int().min(1).max(5).default(3),
    THROTTLE_SMS_MINUTES_INTERVAL: z.number().int().min(3).default(3),
    MINUTES_BEFORE_SMS_OTP_EXPIRY: z.number().int().min(3).max(60).default(10),
    TWILIO_ACCOUNT_SID: z.string().optional(),
    TWILIO_AUTH_TOKEN: z.string().optional(),
    TWILIO_SERVICE_SID: z.string().optional(),
    // AWS_ACCESS_KEY_ID: z.string().default("CHANGEME"), // only use for prod
    // AWS_SECRET_ACCESS_KEY: z.string().default("CHANGEME"),
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
    VERIFICATOR_SVC_BASE_URL: z.string().url(),
    BASE_EVENT_ID: z.string().min(20).default("63957849393154643868"),
    NOSTR_PROOF_CHANNEL_EVENT_ID: z.string().optional(), // if undefined, then nostr functionalities are disabled
    NOSTR_DEFAULT_RELAY_URL: z.string().url().default("wss://nos.lol"),
    POLIS_BASE_URL: z.string().url().optional(), // if undefined, then polis functionalities are disabled
    POLIS_USER_EMAIL_DOMAIN: z.string().default("zkorum.com"),
    POLIS_USER_EMAIL_LOCAL_PART: z.string().default("hackerman"),
    POLIS_USER_PASSWORD: z.string().default("the_best_password_of_all_time"),
    POLIS_DELAY_TO_FETCH: z
        .literal(-1)
        .or(z.coerce.number().int())
        .default(3000), // milliseconds
    POLIS_CONV_TO_IMPORT_ON_RUN: z.undefined().or(
        z
            .string()
            .transform((value) =>
                value.split(",").map((item) => {
                    return item.trim();
                }),
            )
            .pipe(z.array(z.string()).min(3).max(3)), // summary, comments, votes csv
    ),
});

export const config = configSchema.parse(process.env);
function envToLogger(env: Environment) {
    switch (env) {
        case "development":
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
