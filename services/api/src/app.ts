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
        .string()
        .url()
        .default("https://staging.agoracitizen.app/images/"),
    SERVER_URL_DEV: z
        .string()
        .url()
        .default(`http://localhost:${defaultPort.toString()}`),
    SERVER_URL_STAGING: z
        .string()
        .url()
        .default(`https://staging.agoracitizen.app`),
    SERVER_URL_PROD: z.string().url().default(`https://www.agoracitizen.app`),
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
    VERIFICATOR_SVC_BASE_URL: z.string().url(),
    BASE_EVENT_ID: z.string().min(20).default("63957849393154643868"),
    NOSTR_PROOF_CHANNEL_EVENT_ID: z.string().optional(), // if undefined, then nostr functionalities are disabled
    NOSTR_DEFAULT_RELAY_URL: z.string().url().default("wss://nos.lol"),
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
        .transform((value) =>
            value.split(",").map((item) => {
                return item.trim();
            }),
        )
        .pipe(z.coerce.number().int().min(1).array().nonempty())
        .default(
            "1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000, 2500000, 5000000, 10000000",
        ),
    IS_ORG_IMPORT_ONLY: z.coerce.boolean().default(false),
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
