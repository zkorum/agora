/**
 * Shared Zod schemas and validation constants for conversation draft validation
 *
 * This module centralizes all validation schemas used across:
 * - useConversationDraft composable (runtime validation)
 * - newConversationDrafts store (persistence validation)
 */

import {
  MAX_LENGTH_BODY,
  MAX_LENGTH_OPTION,
  MAX_LENGTH_TITLE,
} from "src/shared/shared";
import { zodEventSlug } from "src/shared/types/zod";
import { isValidPolisUrl } from "src/shared/utils/polis";
import { z } from "zod";

// ============================================================================
// Runtime Validation Schemas (for form fields)
// ============================================================================

/**
 * Zod schema for title validation (runtime validation)
 */
export const zodTitleValidation = z
  .string()
  .trim()
  .min(1, "Title is required to continue")
  .max(MAX_LENGTH_TITLE);

/**
 * Zod schema for validating poll options (when poll is enabled)
 */
export const zodPollOptions = z
  .array(z.string().trim().min(1, "All poll options must be filled in"))
  .min(2, "Poll must have at least 2 options")
  .max(6, "Maximum 6 poll options allowed")
  .refine(
    (options) => {
      const trimmedLower = options.map((opt) => opt.toLowerCase());
      return new Set(trimmedLower).size === trimmedLower.length;
    },
    { message: "Poll options must be unique" }
  );

/**
 * Zod schema for Polis URL validation (runtime validation)
 */
export const zodPolisUrlValidation = z
  .string()
  .refine((url) => !url || isValidPolisUrl(url), {
    message: "Please enter a valid Polis URL.",
  });

// ============================================================================
// Persistence Schemas (for localStorage serialization)
// ============================================================================

/**
 * Zod schema for poll settings
 */
export const zodPollSettings = z.object({
  enabled: z.boolean(),
  options: z.array(z.string()),
});

/**
 * Zod schema for post-as settings
 */
export const zodPostAsSettings = z.object({
  postAsOrganization: z.boolean(),
  organizationName: z.string(),
});

/**
 * Zod schema for private conversation settings (serializable version with ISO string)
 */
export const zodSerializablePrivateConversationSettings = z.object({
  requiresLogin: z.boolean(),
  hasScheduledConversion: z.boolean(),
  conversionDate: z.string().datetime(), // ISO 8601 datetime format
});

/**
 * Zod schema for CSV file metadata
 */
export const zodCsvFileMetadata = z
  .object({
    name: z.string(),
    size: z.number().nonnegative(),
  })
  .nullable();

/**
 * Zod schema for CSV file metadata set
 */
export const zodCsvFileMetadataSet = z.object({
  summary: zodCsvFileMetadata,
  comments: zodCsvFileMetadata,
  votes: zodCsvFileMetadata,
});

/**
 * Zod schema for conversation import type
 */
export const zodConversationImportType = z
  .enum(["polis-url", "csv-import"])
  .nullable();

/**
 * Zod schema for conversation import settings
 */
export const zodConversationImportSettings = z.object({
  importType: zodConversationImportType,
  polisUrl: z.string(),
  csvFileMetadata: zodCsvFileMetadataSet,
});

/**
 * Zod schema for serializable conversation draft
 * This is the main schema used for localStorage validation
 */
export const zodSerializableConversationDraft = z.object({
  // Basic content
  title: z.string().max(MAX_LENGTH_TITLE),
  content: z.string(), // Body length validation happens in validateHtmlStringCharacterCount
  seedOpinions: z.array(z.string()),

  // Poll configuration
  poll: zodPollSettings,

  // Publishing options
  postAs: zodPostAsSettings,

  // Privacy settings
  isPrivate: z.boolean(),
  privateConversationSettings: zodSerializablePrivateConversationSettings,

  // Event ticket verification
  requiresEventTicket: zodEventSlug.optional(),

  // Import settings
  importSettings: zodConversationImportSettings,
});

// ============================================================================
// Type Exports
// ============================================================================

/**
 * Type inference from zod schema - represents a conversation draft ready for serialization
 */
export type SerializableConversationDraft = z.infer<
  typeof zodSerializableConversationDraft
>;

/**
 * Type for conversation import method
 */
export type ConversationImportType = z.infer<typeof zodConversationImportType>;

// ============================================================================
// Validation Constants
// ============================================================================

export const VALIDATION_CONSTANTS = {
  MAX_LENGTH_TITLE,
  MAX_LENGTH_BODY,
  MAX_LENGTH_OPTION,
  MIN_POLL_OPTIONS: 2,
  MAX_POLL_OPTIONS: 6,
} as const;
