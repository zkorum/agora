import "dotenv/config";
import { z } from "zod";

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
    // Google Cloud Translation
    GOOGLE_CLOUD_TRANSLATION_LOCATION: z.string().default("global"),
    // AWS Secret Manager key for Google Cloud service account JSON (production)
    // If set, this takes precedence over GOOGLE_APPLICATION_CREDENTIALS
    GOOGLE_CLOUD_SERVICE_ACCOUNT_AWS_SECRET_KEY: z.string().optional(),
    // Path to Google Cloud service account JSON file (local development)
    GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),
    // Redis (optional - for vote buffer persistence across instances)
    REDIS_URL: z.string().optional(),
    REDIS_VOTE_BUFFER_KEY: z.string().default("vote_buffer"),
});
export type SharedConfigSchema = z.infer<typeof sharedConfigSchema>;
