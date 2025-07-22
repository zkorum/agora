import { useStorage, type RemovableRef } from "@vueuse/core";
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import type { OrganizationProperties } from "src/shared/types/zod";
import {
  validateHtmlStringCharacterCount,
  MAX_LENGTH_BODY,
} from "src/shared/shared";
import { isValidPolisUrl } from "src/shared/utils/polis";

/**
 * Settings for posting as an organization
 */
export interface PostAsSettings {
  /** Whether to publish this post on behalf of an organization */
  postAsOrganization: boolean;
  /** The name of the organization (only relevant if postAsOrganization is true) */
  organizationName: string;
}

/**
 * Advanced settings for private conversations
 * Only relevant when the conversation is private
 */
export interface PrivateConversationSettings {
  /** Whether users must be logged in to participate */
  requiresLogin: boolean;
  /** Whether to automatically convert this conversation on a specific date */
  hasScheduledConversion: boolean;
  /** The target date for automatic conversion */
  conversionDate: Date;
}

/**
 * Settings for importing conversations from Polis
 */
export interface ImportConversationSettings {
  /** Whether this conversation is being imported from Polis */
  isImportMode: boolean;
  /** The Polis conversation URL to import from */
  polisUrl: string;
}

/**
 * Polling configuration for the conversation
 */
export interface PollSettings {
  /** Whether this conversation includes a poll */
  enabled: boolean;
  /** List of poll options */
  options: string[];
}

/**
 * Represents a draft of a new conversation post with all its configuration options
 */
export interface NewConversationDraft {
  // Basic Content
  /** The title/subject of the conversation post */
  title: string;
  /** The main content/body text of the conversation post */
  content: string;
  /** Initial opinion responses to seed the conversation */
  seedOpinions: string[];

  // Polling Configuration
  poll: PollSettings;

  // Publishing Options
  postAs: PostAsSettings;

  // Privacy and Advanced Settings
  /** Whether this is a private conversation (enables advanced settings) */
  isPrivate: boolean;
  /** Advanced settings for private conversations (only relevant when isPrivate is true) */
  privateConversationSettings: PrivateConversationSettings;

  // Import Settings
  importSettings: ImportConversationSettings;
}

/**
 * Serializable version for localStorage storage (Date objects converted to ISO strings)
 */
interface SerializablePrivateConversationSettings {
  requiresLogin: boolean;
  hasScheduledConversion: boolean;
  conversionDate: string; // ISO string instead of Date
}

interface SerializableConversationDraft {
  title: string;
  content: string;
  seedOpinions: string[];
  poll: PollSettings;
  postAs: PostAsSettings;
  isPrivate: boolean;
  privateConversationSettings: SerializablePrivateConversationSettings;
  importSettings: ImportConversationSettings;
}

/**
 * Result of validation checks for proceeding to review page
 */
export interface ValidationResult {
  isValid: boolean;
  errors: {
    title?: string;
    poll?: string;
    body?: string;
  };
  firstErrorField?: "title" | "poll" | "body";
}

export const useNewPostDraftsStore = defineStore("newPostDrafts", () => {
  /**
   * Reactive state for poll validation errors
   */
  const pollValidationError = ref<string>("");
  const showPollValidationError = ref<boolean>(false);

  /**
   * Creates a new empty conversation draft with sensible defaults
   */
  function createEmptyDraft(): NewConversationDraft {
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
      privateConversationSettings: {
        requiresLogin: true, // Default to requiring login when private
        hasScheduledConversion: false,
        conversionDate: tomorrow,
      },

      // Import Settings
      importSettings: {
        isImportMode: false,
        polisUrl: "",
      },
    };
  }

  /**
   * Validates that stored data matches the expected conversation draft structure
   */
  function isValidDraftData(
    data: unknown
  ): data is SerializableConversationDraft {
    if (!data || typeof data !== "object" || data === null) {
      return false;
    }

    const draft = data as Record<string, unknown>;

    // Validate basic content fields
    const hasValidContent =
      typeof draft.title === "string" &&
      typeof draft.content === "string" &&
      Array.isArray(draft.seedOpinions) &&
      draft.seedOpinions.every(
        (opinion: unknown) => typeof opinion === "string"
      );

    // Validate poll settings
    if (!draft.poll || typeof draft.poll !== "object") {
      return false;
    }
    const pollData = draft.poll as Record<string, unknown>;
    const hasValidPoll =
      typeof pollData.enabled === "boolean" &&
      Array.isArray(pollData.options) &&
      (pollData.options as unknown[]).every(
        (option: unknown) => typeof option === "string"
      );

    // Validate postAs settings
    if (!draft.postAs || typeof draft.postAs !== "object") {
      return false;
    }
    const postAsData = draft.postAs as Record<string, unknown>;
    const hasValidPostAs =
      typeof postAsData.postAsOrganization === "boolean" &&
      typeof postAsData.organizationName === "string";

    // Validate private conversation settings
    if (
      typeof draft.isPrivate !== "boolean" ||
      !draft.privateConversationSettings ||
      typeof draft.privateConversationSettings !== "object"
    ) {
      return false;
    }
    const privateSettingsData = draft.privateConversationSettings as Record<
      string,
      unknown
    >;
    const hasValidPrivateSettings =
      typeof privateSettingsData.requiresLogin === "boolean" &&
      typeof privateSettingsData.hasScheduledConversion === "boolean" &&
      typeof privateSettingsData.conversionDate === "string";

    // Validate import settings
    if (!draft.importSettings || typeof draft.importSettings !== "object") {
      return false;
    }
    const importSettingsData = draft.importSettings as Record<string, unknown>;
    const hasValidImportSettings =
      typeof importSettingsData.isImportMode === "boolean" &&
      typeof importSettingsData.polisUrl === "string";

    return (
      hasValidContent &&
      hasValidPoll &&
      hasValidPostAs &&
      hasValidPrivateSettings &&
      hasValidImportSettings
    );
  }

  /**
   * Persistent storage for the conversation draft with automatic serialization
   */
  const conversationDraft: RemovableRef<NewConversationDraft> = useStorage(
    "conversationDraft",
    createEmptyDraft(),
    localStorage,
    {
      serializer: {
        read: (storedValue: string): NewConversationDraft => {
          try {
            const parsedData = JSON.parse(storedValue);

            // Validate the parsed data structure
            if (!isValidDraftData(parsedData)) {
              console.warn(
                "Invalid conversation draft data found in storage, using default values"
              );
              return createEmptyDraft();
            }

            // Convert ISO string back to Date object in private conversation settings
            return {
              ...parsedData,
              privateConversationSettings: {
                ...parsedData.privateConversationSettings,
                conversionDate: new Date(
                  parsedData.privateConversationSettings.conversionDate
                ),
              },
            };
          } catch (error) {
            console.error(
              "Failed to parse conversation draft from storage:",
              error
            );
            return createEmptyDraft();
          }
        },
        write: (draft: NewConversationDraft): string => {
          try {
            // Convert Date to ISO string for JSON serialization
            const serializableDraft: SerializableConversationDraft = {
              ...draft,
              privateConversationSettings: {
                ...draft.privateConversationSettings,
                conversionDate:
                  draft.privateConversationSettings.conversionDate.toISOString(),
              },
            };
            return JSON.stringify(serializableDraft);
          } catch (error) {
            console.error("Failed to serialize conversation draft:", error);
            // Fallback to empty draft
            const emptyDraft = createEmptyDraft();
            const fallbackData: SerializableConversationDraft = {
              ...emptyDraft,
              privateConversationSettings: {
                ...emptyDraft.privateConversationSettings,
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

    // Check polling changes
    const hasPollChanges =
      current.poll.enabled !== emptyDraft.poll.enabled ||
      JSON.stringify(current.poll.options) !==
        JSON.stringify(emptyDraft.poll.options);

    return hasContentChanges || hasPollChanges;
  }

  /**
   * Checks if the draft has meaningful content (not just empty fields)
   */
  function hasContent(): boolean {
    const current = conversationDraft.value;
    return current.title.trim() !== "" || current.content.trim() !== "";
  }

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
   * Adds a new empty poll option to the draft
   */
  function addPollOption(): void {
    conversationDraft.value.poll.options.push("");
  }

  /**
   * Removes a poll option at the specified index
   */
  function removePollOption(index: number): void {
    const options = conversationDraft.value.poll.options;
    if (index >= 0 && index < options.length) {
      options.splice(index, 1);
    }
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

  /**
   * Toggles organization posting and manages related settings
   */
  function togglePostAsOrganization(postAsOrganization: boolean): void {
    conversationDraft.value.postAs.postAsOrganization = postAsOrganization;
    // Clear organization name when switching to personal posting
    if (!postAsOrganization) {
      conversationDraft.value.postAs.organizationName = "";
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

  /**
   * Toggles import mode and clears URL when disabling
   */
  function toggleImportMode(): void {
    conversationDraft.value.importSettings.isImportMode =
      !conversationDraft.value.importSettings.isImportMode;

    // Clear Polis URL when disabling import mode
    if (!conversationDraft.value.importSettings.isImportMode) {
      conversationDraft.value.importSettings.polisUrl = "";
    }
  }

  function setImportMode(isImport: boolean): void {
    conversationDraft.value.importSettings.isImportMode = isImport;
    if (!isImport) {
      conversationDraft.value.importSettings.polisUrl = "";
    }
  }

  /**
   * Validates Polis URL format
   */
  function validatePolisUrl(): boolean {
    return isValidPolisUrl(conversationDraft.value.importSettings.polisUrl);
  }

  /**
   * Validates poll options when polling is enabled
   */
  function validatePoll(): { isValid: boolean; errorMessage?: string } {
    if (!conversationDraft.value.poll.enabled) {
      return { isValid: true };
    }

    const options = conversationDraft.value.poll.options;

    // Check if there are at least 2 options
    if (options.length < 2) {
      return {
        isValid: false,
        errorMessage: "Poll must have at least 2 options",
      };
    }

    // Check for empty options
    const emptyOptions = options.filter(
      (option: string) => option.trim().length === 0
    );
    if (emptyOptions.length > 0) {
      return {
        isValid: false,
        errorMessage: "All poll options must be filled in",
      };
    }

    // Check for duplicate options
    const trimmedOptions = options.map((option: string) =>
      option.trim().toLowerCase()
    );
    const uniqueOptions = new Set(trimmedOptions);
    if (uniqueOptions.size !== trimmedOptions.length) {
      return { isValid: false, errorMessage: "Poll options must be unique" };
    }

    return { isValid: true };
  }

  /**
   * Triggers poll validation and sets error state for UI components
   */
  function triggerPollValidation(): boolean {
    const validation = validatePoll();

    if (!validation.isValid) {
      pollValidationError.value =
        validation.errorMessage || "Poll validation failed";
      showPollValidationError.value = true;
      return false;
    }

    clearPollValidationError();
    return true;
  }

  /**
   * Clears poll validation error state
   */
  function clearPollValidationError(): void {
    pollValidationError.value = "";
    showPollValidationError.value = false;
  }

  /**
   * Validates the draft for proceeding to review page
   * This centralizes all validation logic used by both create page and review page entry guard
   */
  function validateForReview(): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: {},
    };

    const draft = conversationDraft.value;

    // Validate title
    if (!draft.title.trim()) {
      result.isValid = false;
      result.errors.title = "Title is required to continue";
      if (!result.firstErrorField) result.firstErrorField = "title";
    }

    // Validate body content length
    const bodyValidation = validateHtmlStringCharacterCount(
      draft.content,
      "conversation"
    );
    if (!bodyValidation.isValid) {
      result.isValid = false;
      result.errors.body = `Body content exceeds ${MAX_LENGTH_BODY} character limit (${bodyValidation.characterCount}/${MAX_LENGTH_BODY})`;
      if (!result.firstErrorField) result.firstErrorField = "body";
    }

    // Validate poll if enabled
    if (draft.poll.enabled) {
      const pollValidation = validatePoll();
      if (!pollValidation.isValid) {
        result.isValid = false;
        result.errors.poll =
          pollValidation.errorMessage || "Poll validation failed";
        if (!result.firstErrorField) result.firstErrorField = "poll";
      }
    }

    return result;
  }

  /**
   * Computed property to check if the draft is ready for review
   */
  const canAccessReview = computed(() => {
    return validateForReview().isValid;
  });

  return {
    // Main draft state
    conversationDraft,

    // Poll validation state
    pollValidationError,
    showPollValidationError,

    // Factory functions
    createEmptyDraft,

    // State checking functions
    hasUnsavedChanges,
    hasContent,
    canAccessReview,

    // Validation functions
    validateForReview,
    validatePoll,
    triggerPollValidation,
    clearPollValidationError,

    // Action functions
    resetDraft,
    resetPoll,
    addPollOption,
    removePollOption,
    addInitialOpinion,
    togglePrivacy,
    togglePostAsOrganization,
    validateSelectedOrganization,
    toggleImportMode,
    setImportMode,
    validatePolisUrl,
  };
});
