/**
 * Utility functions for conversation draft
 * Extracted to avoid duplication between composable and store
 */

import type {
  ConversationLanguageSettingInput,
  ConversationLanguageSettingOutput,
  ConversationMultilingualSetting,
} from "src/shared/types/zod";

import type { ConversationDraft } from "./conversationDraft.types";

export function areConversationLanguageSettingsEqual({
  left,
  right,
}: {
  left: ConversationLanguageSettingInput;
  right: ConversationLanguageSettingInput;
}): boolean {
  if (left.mode !== right.mode) {
    return false;
  }

  if (left.mode === "auto" || right.mode === "auto") {
    return true;
  }

  return left.languageCode === right.languageCode;
}

export function conversationLanguageSettingInputFromOutput({
  output,
}: {
  output: ConversationLanguageSettingOutput;
}): ConversationLanguageSettingInput {
  if (output.mode === "auto") {
    return { mode: "auto" };
  }

  if (output.languageCode === null) {
    throw new Error("Manual conversation language setting is missing languageCode");
  }

  return { mode: "manual", languageCode: output.languageCode };
}

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
    languageSetting: { mode: "auto" },
    multilingualSetting: {
      additionalLanguageCodes: [],
      dynamicTranslationEnabled: false,
    },
    seedOpinions: [],

    // Conversation Type
    conversationType: "polis",

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
