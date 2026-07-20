/**
 * Utility functions for conversation draft
 * Extracted to avoid duplication between composable and store
 */

import type {
  ConversationMultilingualSetting,
  OrganizationProperties,
} from "src/shared/types/zod";

import type { ConversationDraft } from "./conversationDraft.types";

export function areConversationMultilingualSettingsEqual({
  left,
  right,
}: {
  left: ConversationMultilingualSetting;
  right: ConversationMultilingualSetting;
}): boolean {
  if (left.dynamicTranslationEnabled !== right.dynamicTranslationEnabled) {
    return false;
  }

  if (left.additionalLanguageCodes.length !== right.additionalLanguageCodes.length) {
    return false;
  }

  return left.additionalLanguageCodes.every((languageCode) =>
    right.additionalLanguageCodes.includes(languageCode)
  );
}

export function resolveSelectedOrganizationSlug({
  organizationIdentifier,
  organizationList,
}: {
  organizationIdentifier: string;
  organizationList: readonly OrganizationProperties[];
}): string | undefined {
  let legacyOrganizationSlug: string | undefined;
  let hasAmbiguousLegacyName = false;

  for (const organization of organizationList) {
    if (organization.slug === organizationIdentifier) {
      return organization.slug;
    }

    if (organization.name === organizationIdentifier) {
      if (legacyOrganizationSlug === undefined) {
        legacyOrganizationSlug = organization.slug;
      } else {
        hasAmbiguousLegacyName = true;
      }
    }
  }

  return hasAmbiguousLegacyName ? undefined : legacyOrganizationSlug;
}

/**
 * Creates a new empty conversation draft with sensible defaults
 * Used by both the composable and the Pinia store
 */
export function createEmptyDraft(): ConversationDraft {
  return {
    // Basic Content
    title: "",
    content: "",
    contentPlainText: "",
    multilingualSetting: {
      additionalLanguageCodes: [],
      dynamicTranslationEnabled: false,
    },
    selectedProjectSlug: undefined,
    inheritProjectLanguages: false,
    seedOpinions: [],

    // Conversation Type
    conversationType: "polis",
    rankingMode: undefined,

    // Publishing Options
    postAs: {
      postAsOrganization: false,
      organizationName: "",
    },

    // Privacy and Advanced Settings
    isPrivate: false,
    participationMode: "account_required",

    // Event Ticket Verification
    requiresEventTicket: undefined,

    // AI labeling
    aiLabelingEnabled: true,

    // Facilitator analysis preference
    preferredOpinionGroupCount: null,

    // External Source (GitHub integration for MaxDiff)
    externalSourceConfig: null,

    // Survey configuration
    surveyConfig: null,

    // Creation Settings
    importSettings: {
      importType: null,
      polisUrl: "",
      csvFileMetadata: {
        summary: null,
        comments: null,
        votes: null,
      },
    },
  };
}

/**
 * Checks if the draft has content that would be lost when switching creation type
 * Used by both the store and control bar
 */
export function hasContentThatWouldBeCleared(
  title: string,
  content: string
): boolean {
  return title.trim() !== "" || content.trim() !== "";
}
