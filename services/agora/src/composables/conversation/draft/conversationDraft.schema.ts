/**
 * Shared Zod schemas and validation constants for conversation draft validation
 *
 * This module centralizes all validation schemas used across:
 * - useConversationDraft composable (runtime validation)
 * - newConversationDrafts store (persistence validation)
 */

import { MAX_LENGTH_CONVERSATION_BODY, MAX_LENGTH_TITLE } from "src/shared/shared";
import {
  zodConversationLanguageSettingInput,
  zodConversationMultilingualSetting,
  zodConversationType,
  zodEventSlug,
  zodExternalSourceConfig,
  zodParticipationMode,
  zodPreferredOpinionGroupCount,
  zodProjectSlug,
  zodSurveyConfig,
} from "src/shared/types/zod";
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
 * Zod schema for post-as settings
 */
export const zodPostAsSettings = z.object({
  postAsOrganization: z.boolean(),
  organizationName: z.string(),
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
export const zodSerializableConversationDraft = z.preprocess(
  (val) => {
    if (val === null || typeof val !== "object" || Array.isArray(val)) {
      return val;
    }
    if ("participationMode" in val || !("privateConversationSettings" in val)) {
      return val;
    }

    const legacyPrivateSettings = z
      .object({ participationMode: zodParticipationMode.optional() })
      .passthrough()
      .safeParse(val.privateConversationSettings);
    if (
      !legacyPrivateSettings.success ||
      legacyPrivateSettings.data.participationMode === undefined
    ) {
      return val;
    }

    return {
      ...val,
      participationMode: legacyPrivateSettings.data.participationMode,
    };
  },
  z.object({
    // Basic content
    title: z.string().max(MAX_LENGTH_TITLE),
    content: z.string(), // Body length validation happens in validateHtmlStringCharacterCount
    contentPlainText: z.string().default(""),
    languageSetting: zodConversationLanguageSettingInput.default({
      mode: "auto",
    }),
    multilingualSetting: zodConversationMultilingualSetting.default({
      additionalLanguageCodes: [],
      dynamicTranslationEnabled: false,
    }),
    selectedProjectSlug: zodProjectSlug.optional(),
    inheritProjectLanguages: z.boolean().default(false),
    seedOpinions: z.array(z.string()),

    // Conversation type
    conversationType: zodConversationType.default("polis"),

    // Publishing options
    postAs: zodPostAsSettings,

    // Privacy settings
    isPrivate: z.boolean(),
    participationMode: zodParticipationMode.default("account_required"),

    // Event ticket verification
    requiresEventTicket: zodEventSlug.optional(),

    // AI labeling
    aiLabelingEnabled: z.boolean().default(true),

    // Facilitator analysis preference
    preferredOpinionGroupCount: zodPreferredOpinionGroupCount.default(null),

    // External source (GitHub integration for MaxDiff)
    externalSourceConfig: zodExternalSourceConfig.nullable().default(null),

    // Survey configuration
    surveyConfig: zodSurveyConfig.nullable().default(null),

    // Import settings
    importSettings: zodConversationImportSettings,
  })
);

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
  MAX_LENGTH_BODY: MAX_LENGTH_CONVERSATION_BODY,
} as const;
