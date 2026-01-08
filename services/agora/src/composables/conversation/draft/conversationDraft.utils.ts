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

    // Polling Configuration
    poll: {
      enabled: false,
      options: ["", ""], // Start with two empty options
    },

    // Publishing Options
    postAs: {
      postAsOrganization: false,
      organizationName: "",
    },

    // Privacy and Advanced Settings
    isPrivate: false,
    requiresLogin: true,
    privateConversationSettings: {
      hasScheduledConversion: false,
      conversionDate: tomorrow,
    },

    // Event Ticket Verification
    requiresEventTicket: undefined,

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
  content: string,
  pollEnabled: boolean,
  pollOptions: string[]
): boolean {
  return (
    title.trim() !== "" ||
    content.trim() !== "" ||
    (pollEnabled && pollOptions.some((opt) => opt.trim() !== ""))
  );
}
