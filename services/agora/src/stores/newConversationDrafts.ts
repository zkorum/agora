import { type RemovableRef, useStorage } from "@vueuse/core";
import { defineStore } from "pinia";
import {
  type SerializableConversationDraft,
  zodSerializableConversationDraft,
} from "src/composables/conversation/draft/conversationDraft.schema";
import type {
  ConversationDraft,
  ConversationImportType,
} from "src/composables/conversation/draft/conversationDraft.types";
import { createEmptyDraft } from "src/composables/conversation/draft/conversationDraft.utils";
import type { OrganizationProperties } from "src/shared/types/zod";
import { processEnv } from "src/utils/processEnv";
import { watch } from "vue";

export const useNewPostDraftsStore = defineStore("newPostDrafts", () => {
  /**
   * Parses and validates stored draft data using zod schema
   * Returns parsed draft if valid, null otherwise
   */
  function parseStoredDraft(data: unknown): ConversationDraft | null {
    const result = zodSerializableConversationDraft.safeParse(data);

    if (!result.success) {
      console.warn(
        "Invalid conversation draft data found in storage:",
        result.error.format()
      );
      return null;
    }

    // Transform serialized format to runtime format (Date conversion and requiresLogin extraction)
    const { requiresLogin, ...restPrivateSettings } =
      result.data.privateConversationSettings;

    return {
      ...result.data,
      requiresLogin,
      privateConversationSettings: {
        ...restPrivateSettings,
        conversionDate: new Date(restPrivateSettings.conversionDate),
      },
    };
  }

  /**
   * Persistent storage for the conversation draft with automatic serialization
   */
  const conversationDraft: RemovableRef<ConversationDraft> = useStorage(
    "conversationDraft",
    createEmptyDraft(),
    localStorage,
    {
      serializer: {
        read: (storedValue: string): ConversationDraft => {
          try {
            const parsedData = JSON.parse(storedValue);
            const draft = parseStoredDraft(parsedData);

            if (!draft) {
              console.warn(
                "Invalid conversation draft data found in storage, using default values"
              );
              return createEmptyDraft();
            }

            return draft;
          } catch (error) {
            console.error(
              "Failed to parse conversation draft from storage:",
              error
            );
            return createEmptyDraft();
          }
        },
        write: (draft: ConversationDraft): string => {
          try {
            // Convert runtime format to serialized format
            // Move requiresLogin into privateConversationSettings and convert Date to ISO string
            const { requiresLogin, ...restDraft } = draft;
            const serializableDraft: SerializableConversationDraft = {
              ...restDraft,
              privateConversationSettings: {
                requiresLogin,
                hasScheduledConversion:
                  draft.privateConversationSettings.hasScheduledConversion,
                conversionDate:
                  draft.privateConversationSettings.conversionDate.toISOString(),
              },
            };
            return JSON.stringify(serializableDraft);
          } catch (error) {
            console.error("Failed to serialize conversation draft:", error);
            // Fallback to empty draft
            const emptyDraft = createEmptyDraft();
            const { requiresLogin, ...restEmptyDraft } = emptyDraft;
            const fallbackData: SerializableConversationDraft = {
              ...restEmptyDraft,
              privateConversationSettings: {
                requiresLogin,
                hasScheduledConversion:
                  emptyDraft.privateConversationSettings.hasScheduledConversion,
                conversionDate:
                  emptyDraft.privateConversationSettings.conversionDate.toISOString(),
              },
            };
            return JSON.stringify(fallbackData);
          }
        },
      },
    }
  );

  // ============================================================================
  // State Checking Functions
  // ============================================================================

  /**
   * Checks if the current draft has been modified from its default state
   */
  function hasUnsavedChanges(): boolean {
    const emptyDraft = createEmptyDraft();
    const current = conversationDraft.value;

    // Check basic content changes
    const hasContentChanges =
      current.title !== emptyDraft.title ||
      current.content !== emptyDraft.content;

    // Check seed opinions changes
    const hasSeedOpinionsChanges =
      JSON.stringify(current.seedOpinions) !==
      JSON.stringify(emptyDraft.seedOpinions);

    // Check polling changes
    const hasPollChanges =
      current.poll.enabled !== emptyDraft.poll.enabled ||
      JSON.stringify(current.poll.options) !==
        JSON.stringify(emptyDraft.poll.options);

    // Check post-as settings changes
    const hasPostAsChanges =
      current.postAs.postAsOrganization !==
        emptyDraft.postAs.postAsOrganization ||
      current.postAs.organizationName !== emptyDraft.postAs.organizationName;

    // Check privacy settings changes
    const hasPrivacyChanges =
      current.isPrivate !== emptyDraft.isPrivate ||
      current.requiresLogin !== emptyDraft.requiresLogin;

    // Check private conversation settings changes (only relevant if isPrivate is true)
    // Note: conversionDate is excluded from comparison because the empty draft's date
    // changes constantly (set to "tomorrow"), causing false positives. Only checking
    // hasScheduledConversion is sufficient to detect meaningful user changes.
    const hasPrivateSettingsChanges =
      current.privateConversationSettings.hasScheduledConversion !==
      emptyDraft.privateConversationSettings.hasScheduledConversion;

    // Check creation settings changes
    const hasCreationSettingsChanges =
      current.importSettings.importType !==
        emptyDraft.importSettings.importType ||
      current.importSettings.polisUrl !== emptyDraft.importSettings.polisUrl ||
      JSON.stringify(current.importSettings.csvFileMetadata) !==
        JSON.stringify(emptyDraft.importSettings.csvFileMetadata);

    return (
      hasContentChanges ||
      hasSeedOpinionsChanges ||
      hasPollChanges ||
      hasPostAsChanges ||
      hasPrivacyChanges ||
      hasPrivateSettingsChanges ||
      hasCreationSettingsChanges
    );
  }

  /**
   * Checks if the draft has meaningful content (not just empty fields)
   */
  function hasContent(): boolean {
    const current = conversationDraft.value;
    return current.title.trim() !== "" || current.content.trim() !== "";
  }

  // ============================================================================
  // Draft Management Functions
  // ============================================================================

  /**
   * Resets the conversation draft to its default empty state
   */
  function resetDraft(): void {
    conversationDraft.value = createEmptyDraft();
  }

  /**
   * Resets the poll to its default state (disabled with two empty options)
   */
  function resetPoll(): void {
    conversationDraft.value.poll.enabled = false;
    conversationDraft.value.poll.options = ["", ""];
  }

  /**
   * Adds a new initial opinion to seed the conversation
   */
  function addInitialOpinion(opinion: string): void {
    if (opinion.trim() !== "") {
      conversationDraft.value.seedOpinions.push(opinion.trim());
    }
  }

  /**
   * Toggles the privacy mode and manages related settings
   */
  function togglePrivacy(isPrivate: boolean): void {
    conversationDraft.value.isPrivate = isPrivate;
    // Reset private conversation settings to defaults when switching to public
    if (!isPrivate) {
      const emptyDraft = createEmptyDraft();
      conversationDraft.value.privateConversationSettings =
        emptyDraft.privateConversationSettings;
    }
  }

  // ============================================================================
  // Organization Management Functions
  // ============================================================================

  /**
   * Sets posting as an organization with the specified name
   */
  function setPostAsOrganization(organizationName: string): void {
    conversationDraft.value.postAs.postAsOrganization = true;
    conversationDraft.value.postAs.organizationName = organizationName;
  }

  /**
   * Disables posting as an organization and switches to personal posting
   */
  function disablePostAsOrganization(): void {
    conversationDraft.value.postAs.postAsOrganization = false;
    conversationDraft.value.postAs.organizationName = "";
    if (processEnv.VITE_IS_ORG_IMPORT_ONLY === "true") {
      // Reset to manual creation when switching to non-organization account
      // as Polis URL and CSV import should only be available for organization accounts
      conversationDraft.value.importSettings.importType = null;
      conversationDraft.value.importSettings.polisUrl = "";
      conversationDraft.value.importSettings.csvFileMetadata = {
        summary: null,
        comments: null,
        votes: null,
      };
    }
  }

  /**
   * Validates that the selected organization still exists in the user's organization list
   * If the organization doesn't exist, resets the draft to prevent invalid state
   */
  function validateSelectedOrganization(
    userOrganizationList: OrganizationProperties[]
  ): void {
    const draft = conversationDraft.value;

    // Only validate if posting as organization
    if (!draft.postAs.postAsOrganization || !draft.postAs.organizationName) {
      return;
    }

    // Check if the selected organization still exists in user's organization list
    const organizationExists = userOrganizationList.some(
      (org) => org.name === draft.postAs.organizationName
    );

    if (!organizationExists) {
      console.warn(
        `Selected organization "${draft.postAs.organizationName}" no longer exists in user's organization list. Resetting draft.`
      );
      resetDraft();
    }
  }

  // ============================================================================
  // Import Type Management Functions
  // ============================================================================

  /**
   * Checks if user has content that would be lost when switching creation type
   */
  function hasContentThatWouldBeCleared(): boolean {
    const draft = conversationDraft.value;
    return (
      draft.title.trim() !== "" ||
      draft.content.trim() !== "" ||
      (draft.poll.enabled &&
        draft.poll.options.some((opt) => opt.trim() !== ""))
    );
  }

  /**
   * Clears content fields when switching to non-manual creation type
   */
  function clearContentFields(): void {
    conversationDraft.value.title = "";
    conversationDraft.value.content = "";
    conversationDraft.value.poll.enabled = false;
    conversationDraft.value.poll.options = ["", ""];
  }

  /**
   * Sets creation type with optional content clearing
   * Returns whether confirmation is needed before proceeding
   */
  function setImportType(newType: ConversationImportType): {
    needsConfirmation: boolean;
  } {
    const currentType = conversationDraft.value.importSettings.importType;

    // If switching from manual to import type and user has content, confirmation is needed
    if (
      currentType === null &&
      newType !== null &&
      hasContentThatWouldBeCleared()
    ) {
      return { needsConfirmation: true };
    }

    // Proceed with type change
    setImportTypeWithClearing(newType);
    return { needsConfirmation: false };
  }

  /**
   * Sets creation type and performs necessary clearing without confirmation
   */
  function setImportTypeWithClearing(newType: ConversationImportType): void {
    const oldType = conversationDraft.value.importSettings.importType;

    conversationDraft.value.importSettings.importType = newType;

    // Clear type-specific data when switching
    if (oldType === null && newType !== null) {
      // Switching from manual to import type - clear content fields
      clearContentFields();
    }

    if (newType !== "polis-url") {
      // Clear Polis URL when not using Polis URL type
      conversationDraft.value.importSettings.polisUrl = "";
    }

    if (newType !== "csv-import") {
      // Clear CSV metadata when not using CSV import type
      conversationDraft.value.importSettings.csvFileMetadata = {
        summary: null,
        comments: null,
        votes: null,
      };
    }
  }

  // ============================================================================
  // Watchers
  // ============================================================================

  if (processEnv.VITE_IS_ORG_IMPORT_ONLY === "true") {
    /**
     * Watcher to automatically reset to manual creation when switching to non-organization account
     * Polis URL and CSV import should only be available for organization accounts
     */
    watch(
      () => conversationDraft.value.postAs.postAsOrganization,
      (newValue, oldValue) => {
        // Only act when switching from true to false (organization to personal)
        if (oldValue === true && newValue === false) {
          // Reset to manual creation and clear related settings
          conversationDraft.value.importSettings.importType = null;
          conversationDraft.value.importSettings.polisUrl = "";
          conversationDraft.value.importSettings.csvFileMetadata = {
            summary: null,
            comments: null,
            votes: null,
          };
        }
      }
    );
  }

  return {
    // Main draft state
    conversationDraft,

    // Factory functions
    createEmptyDraft,

    // State checking functions
    hasUnsavedChanges,
    hasContent,
    hasContentThatWouldBeCleared,

    // Draft management functions
    resetDraft,
    resetPoll,
    addInitialOpinion,
    togglePrivacy,

    // Organization management functions
    setPostAsOrganization,
    disablePostAsOrganization,
    validateSelectedOrganization,

    // Import type management functions
    setImportType,
    setImportTypeWithClearing,
    clearContentFields,
  };
});
