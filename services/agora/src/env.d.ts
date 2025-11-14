import type { envSchema } from 'src/utils/processEnv';
import type { z } from 'zod';

/**
 * Environment variable type declarations.
 *
 * IMPORTANT: These types are automatically derived from the zod schema
 * defined in src/utils/processEnv.ts - that is the single source of truth.
 * Do not manually add variables here, add them to the schema instead.
 */
declare namespace NodeJS {
  interface ProcessEnv extends z.infer<typeof envSchema> {}
}

export {};
