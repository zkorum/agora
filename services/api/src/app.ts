import "dotenv/config"; // this loads .env values in process.env
import { z } from "zod";
import Fastify from "fastify";
import { zodDidWeb } from "./shared/types/zod.js";

export type Environment = "development" | "production" | "staging" | "test";

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
    CONNECTION_STRING: z.string().optional(),
    PORT: z.coerce.number().int().nonnegative().default(defaultPort),
    NODE_ENV: z
        .enum(["development", "staging", "production", "test"])
        .default("development"),
    MODE: z.enum(["web", "capacitor", "test"]).default("web"),
    IMAGES_SERVICE_BASE_URL: z
        .string()
        .url()
        .default("https://staging.agoracitizen.network/images/"),
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
    THROTTLE_SMS_SECONDS_INTERVAL: z.number().int().min(5).default(10),
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
    // for production
    AWS_SECRET_ID: z.string().optional(),
    AWS_SECRET_REGION: z.string().optional(),
    AWS_AI_LABEL_SUMMARY_ENABLE: z.boolean().default(true),
    AWS_AI_LABEL_SUMMARY_REGION: z.string().default("eu-west-1"),
    AWS_AI_LABEL_SUMMARY_MODEL_ID: z
        .string()
        .default("mistral.mistral-large-2402-v1:0"),
    AWS_AI_LABEL_SUMMARY_TEMPERATURE: z.string().default("0.4"),
    AWS_AI_LABEL_SUMMARY_TOP_P: z.string().default("0.8"),
    AWS_AI_LABEL_SUMMARY_MAX_TOKENS: z.string().default("8192"),
    AWS_AI_LABEL_SUMMARY_PROMPT: z.string().default(
        `You are a JSON API analyzing group conversations similar to Pol.is. Output only one raw JSON object, no extra text or markdown.

Output Format:
{
  "clusters": {
    "0": { "label": "string", "summary": "string" },
    "1": { "label": "string", "summary": "string" },
    "2": { "label": "string", "summary": "string" },
    "3": { "label": "string", "summary": "string" },
    "4": { "label": "string", "summary": "string" },
    "5": { "label": "string", "summary": "string" }
  }
}
(Reference only — never include in output)

Input Format:
{
  "conversationTitle": "string",
  "conversationBody": "string (optional)",
  "clusters": {
    "0": { "representativeAgree": [...], "representativeDisagree": [...] },
    "1": { ... },
    "2": { ... },
    "3": { ... },
    "4": { ... },
    "5": { ... }
  }
}

Rules:
- Use conversationTitle and conversationBody as context.
- Detect sarcasm/irony; avoid literal misreadings.
- For each cluster independently:
    - representativeAgree = views most members support.
    - representativeDisagree = views most members reject.

Labels:
1. Length and Format:
    - 1–2 words, ≤30 chars, neutral agentive nouns (-ists, -ers, -ians)
    - Use neutral agentive nouns ending in -ists, -ers, -ians, etc.
    - Avoid policy-specific terms or geographic references.
    - Avoid abstract concepts (e.g. avoid “Concerns”)
2. Content Abstraction:
    - Focus on group positions, intellectual traditions, or philosophical approaches.
    - Overt discussion-specific context may be omitted if the context is implied by opposing clusters (e.g. use labels like “Skeptics”, “Technologists”, and “Ethicists” instead of "AI Skeptics", "AI Tool Advocates", "AI Ethicists")
    - Avoid describing specific mechanisms (e.g., avoid "Income Threshold Supporters" or “Rural Educators”).
3. Tone:
    - Aim for a professional/academic tone that reflects generality and positionality.
    - Use terms that could apply across contexts (e.g., "Pragmatists", "Skeptics").
4. Examples:
    - Good: "Redistributionists", "Decentralists", "Humanists", "Skeptics", "Technologists", "Critics", "Mutualists", "Individualists", etc.
    - Bad: "Regional Advocates", "AI Tool Users", "Naysayers", "Plastic Ban Advocates", etc.
5. Generation Process:
    a) Identify the core stance or intellectual tradition within the cluster.
    b) Abstract this stance into a general term using agentive suffixes.
    c) Validate that the label avoids policy specifics and geographic references.
    d) Validate that the label is either 1 or 2 words.

Summaries:
- ≤300 chars, neutral, concise
- Reflect cluster perspective and disagreements
- Grounded in cluster representative opinions and conversation context
- Summarize the cluster's perspective fully and precisely, covering all representative opinions of that cluster, concisely and without repetition.

Now analyze the following JSON input and generate precise, neutral labels and summaries for clusters "0"–"5" independently following the above rules.
`,
    ),
    DB_HOST: z.string().optional(),
    DB_PORT: z.coerce.number().int().nonnegative().default(5432),
    DB_NAME: z.string().default("agora"),
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
