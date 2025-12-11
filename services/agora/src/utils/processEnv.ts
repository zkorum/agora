import { z } from "zod";

/**
 * Environment variable validation using zod.
 *
 * This is the SINGLE SOURCE OF TRUTH for environment variable definitions.
 * TypeScript types in src/env.d.ts are automatically derived from this schema.
 *
 * Environment file structure:
 * - .env.dev: Development configuration (loaded by `yarn dev`)
 * - .env.staging: Staging configuration (includes VITE_STAGING=true)
 * - .env.production: Production configuration (includes VITE_STAGING=false)
 *
 * Build process:
 * - Build scripts use env-cmd to load the appropriate env file
 * - This ensures all variables (including VITE_STAGING) are available when quasar.config.ts runs
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
  VITE_STAGING: z.enum(["true", "false"]).optional(),
  VITE_DEV_AUTHORIZED_PHONES: z.string().optional(), // Comma-separated list of phone numbers for dev/staging testing (must match backend). Must not be set in production (safety check enforced)
  VITE_SENTRY_AUTH_TOKEN: z.string().optional(), // Sentry auth token for production builds
  VITE_DISCORD_LINK: z.string().optional(), // Discord invite link for support
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

  if (result.NODE_ENV === "production" && result.VITE_STAGING === undefined) {
    throw new Error(
      "VITE_STAGING must be set to 'true' or 'false' in production"
    );
  }

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

/**
 * Typed access to environment variables.
 *
 * Validation happens at:
 * 1. Build time: Vite plugin validates process.env and fails build if invalid
 * 2. Runtime: This provides typed access to import.meta.env (injected by Vite/Quasar)
 *
 * This ensures both compile-time safety and runtime availability.
 *
 * Note: In Node.js build context (quasar.config.ts), import.meta.env doesn't exist.
 * The actual values are only needed at browser runtime, not during config evaluation.
 */
export const processEnv = (typeof import.meta !== 'undefined' && import.meta.env
  ? import.meta.env
  : {}) as ProcessEnv;
