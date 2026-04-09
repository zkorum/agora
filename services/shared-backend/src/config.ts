import { z } from "zod";
import { parseValkeyUrl } from "./valkey.js";

const zodQueueValkeyUrl = z.string().optional().transform((value, ctx) => {
    if (value === undefined || value === "") {
        return undefined;
    }

    try {
        return parseValkeyUrl(value);
    } catch (error) {
        ctx.addIssue({
            code: "custom",
            message:
                error instanceof Error ? error.message : "Invalid Valkey URL",
        });
        return z.NEVER;
    }
});

export const sharedConfigSchema = z.object({
    NODE_ENV: z
        .enum(["development", "staging", "production", "test"])
        .default("development"),
    // Database - Primary (write)
    CONNECTION_STRING: z.string().optional(),
    AWS_SECRET_ID: z.string().optional(),
    AWS_SECRET_REGION: z.string().optional(),
    DB_HOST: z.string().optional(),
    DB_PORT: z.coerce.number().int().nonnegative().default(5432),
    DB_NAME: z.string().default("agora"),
    // Database - Read Replica (optional, falls back to primary if not set)
    CONNECTION_STRING_READ: z.string().optional(),
    AWS_SECRET_ID_READ: z.string().optional(),
    AWS_SECRET_REGION_READ: z.string().optional(),
    DB_HOST_READ: z.string().optional(),
    DB_PORT_READ: z.coerce.number().int().nonnegative().default(5433),
    GOOGLE_CLOUD_TRANSLATION_LOCATION: z.string().default("us-central1"),
    GOOGLE_CLOUD_TRANSLATION_ENDPOINT: z
        .string()
        .default("translate.googleapis.com"),
    // AWS Secret Manager key for Google Cloud service account JSON (production)
    // If set, this takes precedence over GOOGLE_APPLICATION_CREDENTIALS
    GOOGLE_CLOUD_SERVICE_ACCOUNT_AWS_SECRET_KEY: z.string().optional(),
    // Path to Google Cloud service account JSON file (local development)
    GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),
    // Valkey (optional - parsed into a typed connection config)
    // Empty strings are treated as undefined to prevent connection attempts
    QUEUE_VALKEY_URL: zodQueueValkeyUrl,
});
export type SharedConfigSchema = z.infer<typeof sharedConfigSchema>;
