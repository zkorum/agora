import { z } from "zod";

/**
 * Environment variable validation using zod.
 *
 * This is the SINGLE SOURCE OF TRUTH for environment variable definitions.
 * TypeScript types in src/env.d.ts are automatically derived from this schema.
 *
 * This utility validates required environment variables,
 * following the same pattern as the backend API (services/api/src/app.ts).
 *
 * Required vars throw an error if missing. Optional vars can be undefined.
 *
 * Environment file structure:
 * - .env.dev: Development configuration (loaded by `yarn dev`)
 * - .env.staging: Staging configuration (production build with VITE_STAGING=true)
 * - .env.production: Production configuration
 * - .env.local.prod: Temporary file created by build scripts (gitignored)
 *
 * Build scripts copy the appropriate env file to .env.local.prod before building,
 * which Quasar automatically loads during production builds.
 */

export const envSchema = z.object({
  // Required environment variables
  NODE_ENV: z.string(), // Node environment: "development" | "production"
  VITE_API_BASE_URL: z.string(), // Backend API endpoint (e.g., "http://localhost:8084")
  VITE_BACK_DID: z.string(), // Backend DID, must match backend config (e.g., "did:web:localhost%3A8084")
  VITE_IS_ORG_IMPORT_ONLY: z.enum(["true", "false"]), // If "true", only organizations can import conversations

  // Optional environment variables
  VUE_ROUTER_MODE: z.enum(["hash", "history", "abstract"]).optional(), // Vue router mode
  VUE_ROUTER_BASE: z.string().optional(), // Base path for router
  VITE_STAGING: z.enum(["true", "false"]).optional(), // If "true", staging mode is enabled
  VITE_DEV_AUTHORIZED_PHONES: z.string().optional(), // Comma-separated list of phone numbers for dev/staging testing (must match backend). Must not be set in production (safety check enforced)
  VITE_SENTRY_AUTH_TOKEN: z.string().optional(), // Sentry auth token for production builds
});

export type ProcessEnv = z.infer<typeof envSchema>;

/**
 * Validates environment variables using zod schema and additional safety checks.
 * Throws an error if validation fails.
 *
 * @param env - The environment object to validate (e.g., process.env or result from loadEnv)
 */
function validateEnvSchema(
  env: Record<string, string | undefined>
): ProcessEnv {
  const result = envSchema.parse(env);

  // Production safety check: VITE_DEV_AUTHORIZED_PHONES must not be set in production
  if (
    result.NODE_ENV === "production" &&
    result.VITE_STAGING !== "true" &&
    result.VITE_DEV_AUTHORIZED_PHONES !== undefined
  ) {
    throw new Error(
      "VITE_DEV_AUTHORIZED_PHONES must not be set in production environment"
    );
  }

  return result;
}

/**
 * Validates environment variables with logging.
 * Used by the Vite plugin in quasar.config.ts for build-time validation.
 */
export function validateEnv(
  env: Record<string, string | undefined>
): ProcessEnv {
  try {
    const result = validateEnvSchema(env);
    console.log("[ProcessEnv] Environment variables validated successfully");
    return result;
  } catch (error) {
    console.error("[ProcessEnv] Validation failed");
    throw error;
  }
}

// Typed access to process.env
// Validation happens at build time via Vite plugin in quasar.config.ts
export const processEnv = process.env as ProcessEnv;
