/**
 * Utility functions for conversation draft
 * Extracted to avoid duplication between composable and store
 */

import type { ConversationDraft } from "./conversationDraft.types";

/**
 * Creates a new empty conversation draft with sensible defaults
 * Used by both the composable and the Pinia store
 */
export function createEmptyDraft(): ConversationDraft {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  return {
    // Basic Content
    title: "",
    content: "",
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
    privateConversationSettings: {
      hasScheduledConversion: false,
      conversionDate: tomorrow,
    },

    // Event Ticket Verification
    requiresEventTicket: undefined,

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
