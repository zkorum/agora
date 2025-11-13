import { useStorage, type RemovableRef } from "@vueuse/core";
import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";
import { z } from "zod";
import type { OrganizationProperties, EventSlug } from "src/shared/types/zod";
import { zodEventSlug } from "src/shared/types/zod";
import {
  validateHtmlStringCharacterCount,
  MAX_LENGTH_BODY,
  MAX_LENGTH_TITLE,
} from "src/shared/shared";
import { isValidPolisUrl } from "src/shared/utils/polis";
import { processEnv } from "src/utils/processEnv";

// ============================================================================
// Zod Schemas for Draft Validation
// ============================================================================

/**
 * Zod schema for validating poll options (when poll is enabled)
 */
const zodPollOptions = z
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
 * Zod schema for poll settings
 */
const zodPollSettings = z.object({
  enabled: z.boolean(),
  options: z.array(z.string()),
});

/**
 * Zod schema for post-as settings
 */
const zodPostAsSettings = z.object({
  postAsOrganization: z.boolean(),
  organizationName: z.string(),
});

/**
 * Zod schema for private conversation settings (serializable version with ISO string)
 */
const zodSerializablePrivateConversationSettings = z.object({
  requiresLogin: z.boolean(),
  hasScheduledConversion: z.boolean(),
  conversionDate: z.iso.datetime(), // Validates ISO 8601 datetime format
});

/**
 * Zod schema for CSV file metadata
 */
const zodCsvFileMetadata = z
  .object({
    name: z.string(),
    size: z.number().nonnegative(),
  })
  .nullable();

/**
 * Zod schema for CSV file metadata set
 */
const zodCsvFileMetadataSet = z.object({
  summary: zodCsvFileMetadata,
  comments: zodCsvFileMetadata,
  votes: zodCsvFileMetadata,
});

/**
 * Zod schema for title validation (runtime validation)
 */
const zodTitleValidation = z
  .string()
  .trim()
  .min(1, "Title is required to continue")
  .max(MAX_LENGTH_TITLE);

/**
 * Zod schema for Polis URL validation (runtime validation)
 */
const zodPolisUrlValidation = z
  .string()
  .refine((url) => !url || isValidPolisUrl(url), {
    message: "Please enter a valid Polis URL.",
  });

/**
 * Zod schema for conversation import type
 */
const zodConversationImportType = z
  .enum(["polis-url", "csv-import"])
  .nullable();

/**
 * Zod schema for conversation import settings
 */
const zodConversationImportSettings = z.object({
  importType: zodConversationImportType,
  polisUrl: z.string(),
  csvFileMetadata: zodCsvFileMetadataSet,
});

/**
 * Zod schema for serializable conversation draft
 * This is the main schema used for localStorage validation
 */
const zodSerializableConversationDraft = z.object({
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

/**
 * Type inference from zod schema - replaces the SerializableConversationDraft interface
 */
type SerializableConversationDraft = z.infer<
  typeof zodSerializableConversationDraft
>;

// ============================================================================
// TypeScript Interfaces (for runtime types with Date objects)
// ============================================================================

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
  /** Whether to automatically convert this conversation on a specific date */
  hasScheduledConversion: boolean;
  /** The target date for automatic conversion */
  conversionDate: Date;
}

/**
 * Type of conversation import method
 */
export type ConversationImportType = "polis-url" | "csv-import";

/**
 * Settings for importing conversations
 */
export interface ConversationImportSettings {
  /** How this conversation is being imported (null for manual creation) */
  importType: ConversationImportType | null;
  /** The Polis conversation URL (only relevant for 'polis-url' type) */
  polisUrl: string;
  /** Metadata for uploaded CSV files (only relevant for 'csv-import' type) */
  csvFileMetadata: {
    summary: { name: string; size: number } | null;
    comments: { name: string; size: number } | null;
    votes: { name: string; size: number } | null;
  };
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
  /** Whether users must be logged in to participate (applies to both public and private conversations) */
  requiresLogin: boolean;
  /** Advanced settings for private conversations (only relevant when isPrivate is true) */
  privateConversationSettings: PrivateConversationSettings;

  // Event Ticket Verification
  /** If set, requires users to verify ownership of the specified event ticket. If undefined, no verification required. */
  requiresEventTicket?: EventSlug;

  // Import Settings
  importSettings: ConversationImportSettings;
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
   * Parses and validates stored draft data using zod schema
   * Returns parsed draft if valid, null otherwise
   */
  function parseStoredDraft(data: unknown): NewConversationDraft | null {
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
  const conversationDraft: RemovableRef<NewConversationDraft> = useStorage(
    "conversationDraft",
    createEmptyDraft(),
    localStorage,
    {
      serializer: {
        read: (storedValue: string): NewConversationDraft => {
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
        write: (draft: NewConversationDraft): string => {
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
    if (process.env.VITE_IS_ORG_IMPORT_ONLY === "true") {
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
    // Clear any validation errors for cleared fields
    clearValidationError("title");
    clearValidationError("body");
    clearValidationError("poll");
  }

  /**
   * Sets creation type with optional content clearing
   * Returns whether confirmation is needed before proceeding
   */
  function setImportType(newType: ConversationImportType | null): {
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
  function setImportTypeWithClearing(
    newType: ConversationImportType | null
  ): void {
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
      clearValidationError("polisUrl");
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

  /**
   * Validates Polis URL format
   */
  function validatePolisUrl(): boolean {
    return isValidPolisUrl(conversationDraft.value.importSettings.polisUrl);
  }

  /**
   * Validates poll options when polling is enabled using Zod
   */
  function validatePoll(): { isValid: boolean; errorMessage?: string } {
    if (!conversationDraft.value.poll.enabled) {
      return { isValid: true };
    }

    const options = conversationDraft.value.poll.options;
    const result = zodPollOptions.safeParse(options);

    if (!result.success) {
      // Extract the first error message from Zod
      const errorMessage =
        result.error.issues[0]?.message || "Poll validation failed";
      return { isValid: false, errorMessage };
    }

    return { isValid: true };
  }

  /**
   * Centralized validation function for title field using Zod
   */
  function validateTitleField(): MutationResult {
    const title = conversationDraft.value.title;
    const result = zodTitleValidation.safeParse(title);

    if (!result.success) {
      const error =
        result.error.issues[0]?.message || "Title validation failed";
      validationState.value.title = {
        isValid: false,
        error,
        showError: true,
      };
      return { success: false, error };
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
   * Centralized validation function for Polis URL using Zod
   */
  function validatePolisUrlField(): MutationResult {
    const url = conversationDraft.value.importSettings.polisUrl;
    const result = zodPolisUrlValidation.safeParse(url);

    if (!result.success) {
      const error =
        result.error.issues[0]?.message || "Polis URL validation failed";
      validationState.value.polisUrl = {
        isValid: false,
        error,
        showError: true,
      };
      return { success: false, error };
    }

    validationState.value.polisUrl = {
      isValid: true,
      error: "",
      showError: false,
    };
    return { success: true };
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
    const importType = draft.importSettings.importType;

    // For manual creation, validate title and content
    if (importType === null) {
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
    }

    // For Polis URL import, validate URL
    if (importType === "polis-url") {
      if (
        !draft.importSettings.polisUrl ||
        !isValidPolisUrl(draft.importSettings.polisUrl)
      ) {
        result.isValid = false;
        result.errors.polisUrl = "Please enter a valid Polis URL.";
        if (!result.firstErrorField) result.firstErrorField = "polisUrl";
      }
    }

    // For CSV import, validation will be handled by the PolisCsvUpload component
    // The component will expose an isValid method that the create page can check

    return result;
  }

  /**
   * Computed property to check if the draft is ready for review
   */
  const canAccessReview = computed(() => {
    return validateForReview().isValid;
  });

  if (process.env.VITE_IS_ORG_IMPORT_ONLY === "true") {
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
    setImportType,
    setImportTypeWithClearing,
    clearContentFields,
    validatePolisUrl,

    // Poll management functions
    addPollOption: addPollOptionWithValidation,
    removePollOption: removePollOptionWithValidation,
    togglePoll: togglePollWithValidation,
  };
});
