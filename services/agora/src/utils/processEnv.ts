import { z } from "zod";

/**
 * Environment variable validation using zod.
 *
 * This is the SINGLE SOURCE OF TRUTH for environment variable definitions.
 * TypeScript types in src/env.d.ts are automatically derived from this schema.
 *
 * Environment file structure:
 * - .env.dev: Development configuration (loaded by `pnpm dev`)
 * - .env.staging: Staging configuration (includes VITE_STAGING=true)
 * - .env.production: Production configuration (includes VITE_STAGING=false)
 *
 * Build process:
 * - Dev/build scripts use env-cmd to load the appropriate env file
 * - This ensures all variables (including VITE_STAGING) are available when quasar.config.ts runs
 */

export const envSchema = z.object({
  // Required environment variables
  NODE_ENV: z.string(), // Node environment: "development" | "production"
  VITE_API_BASE_URL: z.string(), // Backend API endpoint (e.g., "http://localhost:8084")
  VITE_BACK_DID: z.string(), // Backend DID, must match backend config (e.g., "did:web:localhost%3A8084")
  // Note: We use z.enum instead of transform because process.env contains raw strings at runtime.
  // The processEnv object reads build-time process.env values, so transforms don't run at runtime.
  // Compare with string "true"/"false" when using this value.
  VITE_IS_ORG_IMPORT_ONLY: z.enum(["true", "false"]), // If "true", personal users cannot import conversations

  // Optional environment variables
  VUE_ROUTER_MODE: z.enum(["hash", "history", "abstract"]).optional(), // Vue router mode
  VUE_ROUTER_BASE: z.string().optional(), // Base path for router
  VITE_STAGING: z.enum(["true", "false"]).optional(),
  VITE_DEV_AUTHORIZED_PHONES: z.string().optional(), // Comma-separated list of phone numbers for dev/staging testing (must match backend). Must not be set in production (safety check enforced)
  VITE_DEV_AUTHORIZED_EMAILS: z.string().optional(), // Comma-separated list of emails for dev/staging testing (must match backend). Must not be set in production (safety check enforced)
  VITE_SENTRY_AUTH_TOKEN: z.string().optional(), // Sentry auth token for production builds
  VITE_DISCORD_LINK: z.string().optional(), // Discord invite link for support
  // Note: We use z.enum instead of transform because process.env contains raw strings at runtime.
  // The processEnv object reads build-time process.env values, so transforms don't run at runtime.
  // Compare with string "true"/"false" when using this value.
  // DO NOT use .default() here - it only applies during Zod parsing, but processEnv is a
  // direct read from process.env without runtime parsing. Code using this variable
  // must use !== "false" checks to treat undefined as enabled by default.
  VITE_EXPORT_CONVOS_ENABLED: z.enum(["true", "false"]).optional(), // Enable/disable conversation export feature (must match backend)
  VITE_FEATURED_CONVERSATION_SLUG: z.string().optional(), // Slug of a conversation to feature in a banner on the home page (empty or unset = no banner)
  // Note: We use z.enum instead of transform because process.env contains raw strings at runtime.
  // The processEnv object reads build-time process.env values, so transforms don't run at runtime.
  // Compare with string "true"/"false" when using this value.
  // DO NOT use .default() here - it only applies during Zod parsing, but processEnv is a
  // direct read from process.env without runtime parsing. Code using this variable
  // must use === "true" checks to treat undefined as disabled by default.
  VITE_MAXDIFF_ENABLED: z.enum(["true", "false"]).optional(), // Enable/disable MaxDiff conversation type (must match backend)
  VITE_IS_MAXDIFF_ORG_ONLY: z.enum(["true", "false"]).optional(), // If "true", personal users cannot create MaxDiff conversations (must match backend)
  VITE_MAXDIFF_ALLOWED_ORGS: z.string().optional(), // Comma-separated org names allowed to create MaxDiff conversations when posting as org (empty = all orgs allowed)
  VITE_MAXDIFF_ALLOWED_USERS: z.string().optional(), // Comma-separated user IDs allowed to create MaxDiff conversations when posting as user (empty = all users allowed)
  VITE_MAXDIFF_GITHUB_ENABLED: z.enum(["true", "false"]).optional(), // Enable/disable GitHub connector for MaxDiff (must match backend)
  VITE_IS_MAXDIFF_GITHUB_ORG_ONLY: z.enum(["true", "false"]).optional(), // If "true", personal users cannot use the GitHub connector (must match backend)
  VITE_MAXDIFF_GITHUB_ALLOWED_ORGS: z.string().optional(), // Comma-separated org names allowed to use GitHub connector when posting as org
  VITE_MAXDIFF_GITHUB_ALLOWED_USERS: z.string().optional(), // Comma-separated user IDs allowed to use GitHub connector when posting as user
  VITE_IMPORT_ALLOWED_ORGS: z.string().optional(), // Comma-separated org names allowed to import conversations when posting as org (empty = all orgs allowed)
  VITE_IMPORT_ALLOWED_USERS: z.string().optional(), // Comma-separated user IDs allowed to import conversations when posting as user (empty = all users allowed)
  VITE_SURVEY_ENABLED: z.enum(["true", "false"]).optional(), // Enable/disable survey configuration feature (must match backend)
  VITE_IS_SURVEY_ORG_ONLY: z.enum(["true", "false"]).optional(), // If "true", personal users cannot configure surveys (must match backend)
  VITE_SURVEY_ALLOWED_ORGS: z.string().optional(), // Comma-separated org names allowed to configure surveys when posting as org (empty = all orgs allowed)
  VITE_SURVEY_ALLOWED_USERS: z.string().optional(), // Comma-separated user IDs allowed to configure surveys when posting as user (empty = all users allowed)
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

  if (
    result.NODE_ENV === "production" &&
    result.VITE_STAGING !== "true" &&
    result.VITE_DEV_AUTHORIZED_EMAILS !== undefined
  ) {
    throw new Error(
      "VITE_DEV_AUTHORIZED_EMAILS must not be set in production environment"
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
 * 2. Runtime: This provides typed access to process.env values injected by Quasar/Vite
 *
 * This ensures both compile-time safety and runtime availability.
 *
 * Keep this as explicit process.env.KEY reads. Quasar/Vite replaces those static
 * expressions at build time from build.env. Do not use import.meta.env here:
 * Vite's automatic env loading uses mode "production" for builds by default,
 * which can make .env.production values leak into staging bundles.
 */
declare const process: {
  env: ProcessEnv;
};

export const processEnv = {
  NODE_ENV: process.env.NODE_ENV,
  VITE_API_BASE_URL: process.env.VITE_API_BASE_URL,
  VITE_BACK_DID: process.env.VITE_BACK_DID,
  VITE_IS_ORG_IMPORT_ONLY: process.env.VITE_IS_ORG_IMPORT_ONLY,
  VUE_ROUTER_MODE: process.env.VUE_ROUTER_MODE,
  VUE_ROUTER_BASE: process.env.VUE_ROUTER_BASE,
  VITE_STAGING: process.env.VITE_STAGING,
  VITE_DEV_AUTHORIZED_PHONES: process.env.VITE_DEV_AUTHORIZED_PHONES,
  VITE_DEV_AUTHORIZED_EMAILS: process.env.VITE_DEV_AUTHORIZED_EMAILS,
  VITE_SENTRY_AUTH_TOKEN: process.env.VITE_SENTRY_AUTH_TOKEN,
  VITE_DISCORD_LINK: process.env.VITE_DISCORD_LINK,
  VITE_EXPORT_CONVOS_ENABLED: process.env.VITE_EXPORT_CONVOS_ENABLED,
  VITE_FEATURED_CONVERSATION_SLUG: process.env.VITE_FEATURED_CONVERSATION_SLUG,
  VITE_MAXDIFF_ENABLED: process.env.VITE_MAXDIFF_ENABLED,
  VITE_IS_MAXDIFF_ORG_ONLY: process.env.VITE_IS_MAXDIFF_ORG_ONLY,
  VITE_MAXDIFF_ALLOWED_ORGS: process.env.VITE_MAXDIFF_ALLOWED_ORGS,
  VITE_MAXDIFF_ALLOWED_USERS: process.env.VITE_MAXDIFF_ALLOWED_USERS,
  VITE_MAXDIFF_GITHUB_ENABLED: process.env.VITE_MAXDIFF_GITHUB_ENABLED,
  VITE_IS_MAXDIFF_GITHUB_ORG_ONLY:
    process.env.VITE_IS_MAXDIFF_GITHUB_ORG_ONLY,
  VITE_MAXDIFF_GITHUB_ALLOWED_ORGS:
    process.env.VITE_MAXDIFF_GITHUB_ALLOWED_ORGS,
  VITE_MAXDIFF_GITHUB_ALLOWED_USERS:
    process.env.VITE_MAXDIFF_GITHUB_ALLOWED_USERS,
  VITE_IMPORT_ALLOWED_ORGS: process.env.VITE_IMPORT_ALLOWED_ORGS,
  VITE_IMPORT_ALLOWED_USERS: process.env.VITE_IMPORT_ALLOWED_USERS,
  VITE_SURVEY_ENABLED: process.env.VITE_SURVEY_ENABLED,
  VITE_IS_SURVEY_ORG_ONLY: process.env.VITE_IS_SURVEY_ORG_ONLY,
  VITE_SURVEY_ALLOWED_ORGS: process.env.VITE_SURVEY_ALLOWED_ORGS,
  VITE_SURVEY_ALLOWED_USERS: process.env.VITE_SURVEY_ALLOWED_USERS,
} satisfies ProcessEnv;
