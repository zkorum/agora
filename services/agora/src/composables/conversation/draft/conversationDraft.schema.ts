/**
 * Shared Zod schemas and validation constants for conversation draft validation
 *
 * This module centralizes all validation schemas used across:
 * - useConversationDraft composable (runtime validation)
 * - newConversationDrafts store (persistence validation)
 */

import { uid } from "quasar";
import { MAX_LENGTH_CONVERSATION_TITLE } from "src/shared/shared";
import {
  zodConversationMultilingualSetting,
  zodExternalSourceConfig,
  zodParticipationMode,
  zodPolisVotingPresentation,
  zodPreferredOpinionGroupCount,
  zodProjectSlug,
  zodQvConversationTypeConfig,
  zodRankingConversationTypeConfig,
  zodSupportedParticipantStatements,
  zodSurveyConfig,
  zodUnsupportedParticipantStatements,
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
  .min(1)
  .max(MAX_LENGTH_CONVERSATION_TITLE);

/**
 * Zod schema for Polis URL validation (runtime validation)
 */
export const zodPolisUrlValidation = z
  .string()
  .refine((url) => !url || isValidPolisUrl(url));

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

const zodConversationDraftBase = z.object({
  // Basic content
  title: z.string().max(MAX_LENGTH_CONVERSATION_TITLE),
  content: z.string(), // Body length validation happens in validateHtmlStringCharacterCount
  multilingualSetting: zodConversationMultilingualSetting.default({
    additionalLanguageCodes: [],
    dynamicTranslationEnabled: false,
  }),
  selectedProjectSlug: zodProjectSlug.optional(),
  inheritProjectLanguages: z.boolean().default(false),
  conversationEmailUpdateEnabledOverride: z.boolean().optional(),
  seedOpinions: z.array(z.string()),
  qvStatements: z
    .array(
      z.object({
        localKey: z.string(),
        title: z.string(),
        description: z.string(),
      })
    )
    .default([]),
  aiSuggestionDraftId: z.uuid().default(uid),

  // Publishing options
  postAs: zodPostAsSettings,

  // Privacy settings
  isPrivate: z.boolean(),
  participationMode: zodParticipationMode.default("account_required"),

  // AI labeling
  aiLabelingEnabled: z.boolean().default(true),

  // Facilitator analysis preference
  preferredOpinionGroupCount: zodPreferredOpinionGroupCount.default(null),

  // External source (GitHub integration for comparisons).
  externalSourceConfig: zodExternalSourceConfig.nullable().default(null),

  // Survey configuration
  surveyConfig: zodSurveyConfig.nullable().default(null),

  // Import settings
  importSettings: zodConversationImportSettings,
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
    const normalizedLegacyConversationType =
      "conversationType" in val &&
      (val.conversationType === "maxdiff" || val.conversationType === "ranking")
        ? {
            ...val,
            conversationType: "prioritizing",
            prioritizationType: "comparisons",
            comparisonMethod: "bws",
          }
        : val;
    if (
      "participationMode" in normalizedLegacyConversationType ||
      !("privateConversationSettings" in normalizedLegacyConversationType)
    ) {
      return normalizedLegacyConversationType;
    }

    const legacyPrivateSettings = z
      .object({ participationMode: zodParticipationMode.optional() })
      .passthrough()
      .safeParse(normalizedLegacyConversationType.privateConversationSettings);
    if (
      !legacyPrivateSettings.success ||
      legacyPrivateSettings.data.participationMode === undefined
    ) {
      return normalizedLegacyConversationType;
    }

    return {
      ...normalizedLegacyConversationType,
      participationMode: legacyPrivateSettings.data.participationMode,
    };
  },
  z.discriminatedUnion("conversationType", [
    zodConversationDraftBase.extend({
      conversationType: z.literal("polis"),
      participantStatements: zodSupportedParticipantStatements.default({
        supported: true,
        enabled: true,
      }),
      votingPresentation: zodPolisVotingPresentation.default("list"),
    }),
    z.discriminatedUnion("prioritizationType", [
      zodConversationDraftBase
        .extend(zodRankingConversationTypeConfig.shape)
        .extend({
          participantStatements: zodSupportedParticipantStatements.default({
            supported: true,
            enabled: false,
          }),
        }),
      zodConversationDraftBase
        .extend(zodQvConversationTypeConfig.shape)
        .extend({
          participantStatements: zodUnsupportedParticipantStatements.default({
            supported: false,
          }),
        }),
    ]),
  ])
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
