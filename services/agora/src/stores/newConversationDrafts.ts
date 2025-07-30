import { useStorage, type RemovableRef } from "@vueuse/core";
import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";
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
 * Comprehensive validation state for all form fields
 */
export interface ValidationState {
  title: {
    isValid: boolean;
    error: string;
    showError: boolean;
  };
  body: {
    isValid: boolean;
    error: string;
    showError: boolean;
  };
  poll: {
    isValid: boolean;
    error: string;
    showError: boolean;
  };
  polisUrl: {
    isValid: boolean;
    error: string;
    showError: boolean;
  };
}

export type ValidationErrorField = "title" | "poll" | "body" | "polisUrl";

/**
 * Result of validation checks for proceeding to review page
 */
export interface ValidationResult {
  isValid: boolean;
  errors: {
    title?: string;
    poll?: string;
    body?: string;
    polisUrl?: string;
  };
  firstErrorField?: ValidationErrorField;
}

/**
 * Mutation result interface for consistent error handling
 */
export interface MutationResult {
  success: boolean;
  error?: string;
}

export const useNewPostDraftsStore = defineStore("newPostDrafts", () => {
  /**
   * Comprehensive validation state for all form fields
   */
  const validationState = ref<ValidationState>({
    title: {
      isValid: true,
      error: "",
      showError: false,
    },
    body: {
      isValid: true,
      error: "",
      showError: false,
    },
    poll: {
      isValid: true,
      error: "",
      showError: false,
    },
    polisUrl: {
      isValid: true,
      error: "",
      showError: false,
    },
  });

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
    const hasPrivacyChanges = current.isPrivate !== emptyDraft.isPrivate;

    // Check private conversation settings changes (only relevant if isPrivate is true)
    // Note: conversionDate is excluded from comparison because the empty draft's date
    // changes constantly (set to "tomorrow"), causing false positives. Only checking
    // hasScheduledConversion is sufficient to detect meaningful user changes.
    const hasPrivateSettingsChanges =
      current.privateConversationSettings.requiresLogin !==
        emptyDraft.privateConversationSettings.requiresLogin ||
      current.privateConversationSettings.hasScheduledConversion !==
        emptyDraft.privateConversationSettings.hasScheduledConversion;

    // Check import settings changes
    const hasImportSettingsChanges =
      current.importSettings.isImportMode !==
        emptyDraft.importSettings.isImportMode ||
      current.importSettings.polisUrl !== emptyDraft.importSettings.polisUrl;

    return (
      hasContentChanges ||
      hasSeedOpinionsChanges ||
      hasPollChanges ||
      hasPostAsChanges ||
      hasPrivacyChanges ||
      hasPrivateSettingsChanges ||
      hasImportSettingsChanges
    );
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
    // Disable import mode when switching to non-organization account
    // as import mode should only be available for organization accounts
    conversationDraft.value.importSettings.isImportMode = false;
    conversationDraft.value.importSettings.polisUrl = "";
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
   * Checks if user has content that would be lost when switching to import mode
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
   * Clears content fields when switching to import mode
   */
  function clearContentFieldsForImport(): void {
    conversationDraft.value.title = "";
    conversationDraft.value.content = "";
    conversationDraft.value.poll.enabled = false;
    conversationDraft.value.poll.options = ["", ""];
    // Clear any validation errors for cleared fields
    clearValidationError("title");
    clearValidationError("body");
    clearValidationError("poll");
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

  /**
   * Sets import mode with optional content clearing
   * Returns whether confirmation is needed before proceeding
   */
  function setImportMode(isImport: boolean): { needsConfirmation: boolean } {
    // If switching to import mode and user has content, confirmation is needed
    if (
      isImport &&
      !conversationDraft.value.importSettings.isImportMode &&
      hasContentThatWouldBeCleared()
    ) {
      return { needsConfirmation: true };
    }

    // Proceed with mode change
    setImportModeWithClearing(isImport);
    return { needsConfirmation: false };
  }

  /**
   * Sets import mode and performs necessary clearing without confirmation
   */
  function setImportModeWithClearing(isImport: boolean): void {
    const wasImportMode = conversationDraft.value.importSettings.isImportMode;

    conversationDraft.value.importSettings.isImportMode = isImport;

    if (isImport && !wasImportMode) {
      // Switching to import mode - clear content fields
      clearContentFieldsForImport();
    } else if (!isImport && wasImportMode) {
      // Switching to regular mode - clear polis URL
      conversationDraft.value.importSettings.polisUrl = "";
      clearValidationError("polisUrl");
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
   * Centralized validation function for title field
   */
  function validateTitleField(): MutationResult {
    const title = conversationDraft.value.title.trim();

    if (!title) {
      validationState.value.title = {
        isValid: false,
        error: "Title is required to continue",
        showError: true,
      };
      return { success: false, error: "Title is required to continue" };
    }

    validationState.value.title = {
      isValid: true,
      error: "",
      showError: false,
    };
    return { success: true };
  }

  /**
   * Centralized validation function for body content
   */
  function validateBodyField(): MutationResult {
    const bodyValidation = validateHtmlStringCharacterCount(
      conversationDraft.value.content,
      "conversation"
    );

    if (!bodyValidation.isValid) {
      const error = `Body content exceeds ${MAX_LENGTH_BODY} character limit (${bodyValidation.characterCount}/${MAX_LENGTH_BODY})`;
      validationState.value.body = {
        isValid: false,
        error,
        showError: true,
      };
      return { success: false, error };
    }

    validationState.value.body = {
      isValid: true,
      error: "",
      showError: false,
    };
    return { success: true };
  }

  /**
   * Centralized validation function for Polis URL
   */
  function validatePolisUrlField(): MutationResult {
    const url = conversationDraft.value.importSettings.polisUrl;

    if (!url || isValidPolisUrl(url)) {
      validationState.value.polisUrl = {
        isValid: true,
        error: "",
        showError: false,
      };
      return { success: true };
    }

    const error = "Please enter a valid Polis URL.";
    validationState.value.polisUrl = {
      isValid: false,
      error,
      showError: true,
    };
    return { success: false, error };
  }

  /**
   * Centralized validation function for poll
   */
  function validatePollField(): MutationResult {
    const validation = validatePoll();

    if (!validation.isValid) {
      const error = validation.errorMessage || "Poll validation failed";
      validationState.value.poll = {
        isValid: false,
        error,
        showError: true,
      };
      return { success: false, error };
    }

    validationState.value.poll = {
      isValid: true,
      error: "",
      showError: false,
    };
    return { success: true };
  }

  /**
   * Clears validation error for a specific field
   */
  function clearValidationError(field: keyof ValidationState): void {
    validationState.value[field] = {
      isValid: true,
      error: "",
      showError: false,
    };
  }

  /**
   * Clears all validation errors
   */
  function clearAllValidationErrors(): void {
    Object.keys(validationState.value).forEach((field) => {
      clearValidationError(field as keyof ValidationState);
    });
  }

  /**
   * Centralized mutation for updating title with validation
   */
  function updateTitle(newTitle: string): MutationResult {
    conversationDraft.value.title = newTitle;

    // Clear error when user starts typing
    if (validationState.value.title.showError && newTitle.trim()) {
      clearValidationError("title");
    }

    return { success: true };
  }

  /**
   * Centralized mutation for updating body content with validation
   */
  function updateContent(newContent: string): MutationResult {
    conversationDraft.value.content = newContent;

    // Clear error when content becomes valid
    if (validationState.value.body.showError) {
      const bodyValidation = validateHtmlStringCharacterCount(
        newContent,
        "conversation"
      );
      if (bodyValidation.isValid) {
        clearValidationError("body");
      }
    }

    return { success: true };
  }

  /**
   * Centralized mutation for updating Polis URL with validation
   */
  function updatePolisUrl(newUrl: string): MutationResult {
    conversationDraft.value.importSettings.polisUrl = newUrl;

    // Clear error when URL becomes valid
    if (validationState.value.polisUrl.showError) {
      if (!newUrl || isValidPolisUrl(newUrl)) {
        clearValidationError("polisUrl");
      }
    }

    return { success: true };
  }

  /**
   * Centralized mutation for updating poll option with validation
   */
  function updatePollOption(index: number, value: string): MutationResult {
    if (index < 0 || index >= conversationDraft.value.poll.options.length) {
      return { success: false, error: "Invalid poll option index" };
    }

    conversationDraft.value.poll.options[index] = value;

    // Clear poll validation error when user starts fixing issues
    if (validationState.value.poll.showError) {
      clearValidationError("poll");
    }

    return { success: true };
  }

  /**
   * Centralized mutation for adding poll option with validation
   */
  function addPollOptionWithValidation(): MutationResult {
    const maxOptions = 6;
    if (conversationDraft.value.poll.options.length >= maxOptions) {
      return {
        success: false,
        error: `Maximum ${maxOptions} poll options allowed`,
      };
    }

    conversationDraft.value.poll.options.push("");

    // Clear poll validation error
    if (validationState.value.poll.showError) {
      clearValidationError("poll");
    }

    return { success: true };
  }

  /**
   * Centralized mutation for removing poll option with validation
   */
  function removePollOptionWithValidation(index: number): MutationResult {
    const options = conversationDraft.value.poll.options;
    const minOptions = 2;

    if (options.length <= minOptions) {
      return {
        success: false,
        error: `Minimum ${minOptions} poll options required`,
      };
    }

    if (index < 0 || index >= options.length) {
      return { success: false, error: "Invalid poll option index" };
    }

    options.splice(index, 1);

    // Clear poll validation error
    if (validationState.value.poll.showError) {
      clearValidationError("poll");
    }

    return { success: true };
  }

  /**
   * Centralized mutation for toggling poll with validation
   */
  function togglePollWithValidation(enabled: boolean): MutationResult {
    conversationDraft.value.poll.enabled = enabled;

    if (!enabled) {
      // Reset poll options when disabling
      conversationDraft.value.poll.options = ["", ""];
      clearValidationError("poll");
    }

    return { success: true };
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

  /**
   * Watcher to automatically disable import mode when switching to non-organization account
   * Import mode should only be available for organization accounts
   */
  watch(
    () => conversationDraft.value.postAs.postAsOrganization,
    (newValue, oldValue) => {
      // Only act when switching from true to false (organization to personal)
      if (oldValue === true && newValue === false) {
        // Disable import mode and clear related settings
        conversationDraft.value.importSettings.isImportMode = false;
        conversationDraft.value.importSettings.polisUrl = "";
      }
    }
  );

  return {
    // Main draft state
    conversationDraft,
    validationState,

    // Factory functions
    createEmptyDraft,

    // State checking functions
    hasUnsavedChanges,
    hasContent,
    canAccessReview,
    hasContentThatWouldBeCleared,

    // Centralized validation functions
    validateTitleField,
    validateBodyField,
    validatePolisUrlField,
    validatePollField,
    clearValidationError,
    clearAllValidationErrors,

    // Centralized mutation functions
    updateTitle,
    updateContent,
    updatePolisUrl,
    updatePollOption,
    addPollOptionWithValidation,
    removePollOptionWithValidation,
    togglePollWithValidation,

    // Comprehensive validation functions
    validateForReview,
    validatePoll,

    // Action functions
    resetDraft,
    resetPoll,
    addInitialOpinion,
    togglePrivacy,
    setPostAsOrganization,
    disablePostAsOrganization,
    validateSelectedOrganization,
    toggleImportMode,
    setImportMode,
    setImportModeWithClearing,
    clearContentFieldsForImport,
    validatePolisUrl,

    // Poll management functions
    addPollOption: addPollOptionWithValidation,
    removePollOption: removePollOptionWithValidation,
    togglePoll: togglePollWithValidation,
  };
});
