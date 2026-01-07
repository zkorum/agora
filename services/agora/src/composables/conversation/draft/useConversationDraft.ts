/**
 * Composable for managing conversation draft state and validation
 *
 * This composable uses a ref-based architecture with automatic store synchronization:
 * - All state is stored in plain refs (single source of truth)
 * - When syncToStore: true, watchers automatically sync changes to the Pinia store
 * - Simple and consistent - no conditional computed refs
 */

import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  MAX_LENGTH_BODY,
  MAX_LENGTH_OPTION,
  validateHtmlStringCharacterCount,
} from "src/shared/shared";
import type { EventSlug } from "src/shared/types/zod";
import { isValidPolisUrl } from "src/shared/utils/polis";
import { useNewPostDraftsStore } from "src/stores/newConversationDrafts";
import { computed, type ComputedRef, type Ref, ref, watch } from "vue";

import {
  VALIDATION_CONSTANTS,
  zodPolisUrlValidation,
  zodPollOptions,
  zodTitleValidation,
} from "./conversationDraft.schema";
import type {
  ConversationDraft,
  ConversationFormState,
  ConversationImportSettings,
  MutationResult,
  PostAsSettings,
  PrivateConversationSettings,
  UseConversationDraftConfig,
  ValidationResult,
  ValidationState,
} from "./conversationDraft.types";
import { createEmptyDraft } from "./conversationDraft.utils";
import { useConversationDraftTranslations } from "./useConversationDraft.i18n";

// ============================================================================
// Composable Return Type
// ============================================================================

export interface UseConversationDraftReturn {
  // State (always refs - single source of truth)
  title: Ref<string>;
  content: Ref<string>;
  pollEnabled: Ref<boolean>;
  pollOptions: Ref<string[]>;
  seedOpinions: Ref<string[]>;
  isPrivate: Ref<boolean>;
  requiresLogin: Ref<boolean>;
  requiresEventTicket: Ref<EventSlug | undefined>;
  privateConversationSettings: Ref<PrivateConversationSettings>;
  postAs: Ref<PostAsSettings>;
  importSettings: Ref<ConversationImportSettings>;
  validationState: Ref<ValidationState>;

  // Computed
  isFormValid: ComputedRef<boolean>;
  canProceedToReview: ComputedRef<boolean>;

  // Validation functions
  validateTitle: () => MutationResult;
  validateBody: () => MutationResult;
  validatePoll: () => MutationResult;
  validatePolisUrl: () => MutationResult;
  validateForReview: () => ValidationResult;
  clearValidationError: (field: keyof ValidationState) => void;
  clearAllValidationErrors: () => void;

  // Mutation functions
  updateTitle: (newTitle: string) => MutationResult;
  updateContent: (newContent: string) => MutationResult;
  updatePollOption: (index: number, value: string) => MutationResult;
  addPollOption: () => MutationResult;
  removePollOption: (index: number) => MutationResult;
  togglePoll: (enabled: boolean) => MutationResult;
  addSeedOpinion: (opinion: string) => void;
  updateSeedOpinion: (index: number, value: string) => void;
  removeSeedOpinion: (index: number) => void;

  // Draft management functions
  createEmptyDraft: () => ConversationDraft;
  isDraftModified: () => boolean;
  hasFormContent: () => boolean;
  resetDraft: () => void;

  // Data transfer functions
  initializeFromData: (data: ConversationFormState) => void;
  getDraftSnapshot: () => ConversationFormState;
}

// ============================================================================
// Main Composable
// ============================================================================

/**
 * Composable for conversation draft state and validation
 *
 * @param config - Configuration options
 * @returns Draft state, validation, and manipulation functions
 */
export function useConversationDraft(
  config: UseConversationDraftConfig
): UseConversationDraftReturn {
  const store = config.syncToStore ? useNewPostDraftsStore() : null;

  const { t } = useComponentI18n(useConversationDraftTranslations);

  // ============================================================================
  // State Management (Always Refs)
  // ============================================================================

  // Initialize refs from store or empty draft
  const initialDraft = config.syncToStore
    ? store!.conversationDraft
    : createEmptyDraft();

  // All state as refs (single source of truth)
  const title = ref(initialDraft.title);
  const content = ref(initialDraft.content);
  const pollEnabled = ref(initialDraft.poll.enabled);
  const pollOptions = ref<string[]>([...initialDraft.poll.options]);
  const seedOpinions = ref<string[]>([...initialDraft.seedOpinions]);
  const isPrivate = ref(initialDraft.isPrivate);
  const requiresLogin = ref(initialDraft.requiresLogin);
  const requiresEventTicket = ref<EventSlug | undefined>(
    initialDraft.requiresEventTicket
  );
  const privateConversationSettings = ref<PrivateConversationSettings>({
    ...initialDraft.privateConversationSettings,
  });
  const postAs = ref<PostAsSettings>({ ...initialDraft.postAs });
  const importSettings = ref<ConversationImportSettings>({
    ...initialDraft.importSettings,
  });

  const validationState = ref<ValidationState>({
    title: { isValid: true, error: "", showError: false },
    body: { isValid: true, error: "", showError: false },
    poll: { isValid: true, error: "", showError: false },
    polisUrl: { isValid: true, error: "", showError: false },
  });

  // ============================================================================
  // Store Synchronization (Single Batched Watcher)
  // ============================================================================

  if (config.syncToStore && store) {
    // Create a computed object containing all draft state for efficient watching
    const draftSnapshot = computed(() => ({
      title: title.value,
      content: content.value,
      pollEnabled: pollEnabled.value,
      pollOptions: [...pollOptions.value],
      seedOpinions: [...seedOpinions.value],
      isPrivate: isPrivate.value,
      requiresLogin: requiresLogin.value,
      requiresEventTicket: requiresEventTicket.value,
      privateConversationSettings: { ...privateConversationSettings.value },
      postAs: { ...postAs.value },
      importSettings: { ...importSettings.value },
    }));

    // Single deep watcher syncs all changes to store
    watch(
      draftSnapshot,
      (newSnapshot) => {
        store.conversationDraft.title = newSnapshot.title;
        store.conversationDraft.content = newSnapshot.content;
        store.conversationDraft.poll.enabled = newSnapshot.pollEnabled;
        store.conversationDraft.poll.options = newSnapshot.pollOptions;
        store.conversationDraft.seedOpinions = newSnapshot.seedOpinions;
        store.conversationDraft.isPrivate = newSnapshot.isPrivate;
        store.conversationDraft.requiresLogin = newSnapshot.requiresLogin;
        store.conversationDraft.requiresEventTicket =
          newSnapshot.requiresEventTicket;
        store.conversationDraft.privateConversationSettings =
          newSnapshot.privateConversationSettings;
        store.conversationDraft.postAs = newSnapshot.postAs;
        store.conversationDraft.importSettings = newSnapshot.importSettings;
      },
      { deep: true }
    );
  }

  // ============================================================================
  // Validation Functions
  // ============================================================================

  function validateTitle(): MutationResult {
    const result = zodTitleValidation.safeParse(title.value);

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

  function validateBody(): MutationResult {
    const bodyValidation = validateHtmlStringCharacterCount(
      content.value,
      "conversation"
    );

    if (!bodyValidation.isValid) {
      const error = t("bodyExceedsLimit", {
        count: bodyValidation.characterCount.toString(),
        max: MAX_LENGTH_BODY.toString(),
      });
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

  function validatePoll(): MutationResult {
    if (!pollEnabled.value) {
      validationState.value.poll = {
        isValid: true,
        error: "",
        showError: false,
      };
      return { success: true };
    }

    const result = zodPollOptions.safeParse(pollOptions.value);

    if (!result.success) {
      const error = result.error.issues[0]?.message || "Poll validation failed";
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

  function validatePolisUrl(): MutationResult {
    const url = importSettings.value.polisUrl;
    const importType = importSettings.value.importType;

    // When import type is 'polis-url', URL is required and must be valid
    if (importType === "polis-url") {
      if (!url || url.trim() === "") {
        const error = t("polisUrlRequired");
        validationState.value.polisUrl = {
          isValid: false,
          error,
          showError: true,
        };
        return { success: false, error };
      }
    }

    const result = zodPolisUrlValidation.safeParse(url);

    if (!result.success) {
      const error = t("polisUrlInvalid");
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

  function clearValidationError(field: keyof ValidationState): void {
    validationState.value[field] = {
      isValid: true,
      error: "",
      showError: false,
    };
  }

  function clearAllValidationErrors(): void {
    Object.keys(validationState.value).forEach((field) => {
      clearValidationError(field as keyof ValidationState);
    });
  }

  function validateForReview(): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: {},
    };

    const importType = importSettings.value.importType;

    // For manual creation, validate title and content
    if (importType === null) {
      // Validate title
      if (!title.value.trim()) {
        result.isValid = false;
        result.errors.title = t("titleRequired");
        if (!result.firstErrorField) result.firstErrorField = "title";
      }

      // Validate body content length
      const bodyValidation = validateHtmlStringCharacterCount(
        content.value,
        "conversation"
      );
      if (!bodyValidation.isValid) {
        result.isValid = false;
        result.errors.body = t("bodyExceedsLimit", {
          count: bodyValidation.characterCount.toString(),
          max: MAX_LENGTH_BODY.toString(),
        });
        if (!result.firstErrorField) result.firstErrorField = "body";
      }

      // Validate poll if enabled
      if (pollEnabled.value) {
        const pollResult = zodPollOptions.safeParse(pollOptions.value);
        if (!pollResult.success) {
          result.isValid = false;
          result.errors.poll =
            pollResult.error.issues[0]?.message || "Poll validation failed";
          if (!result.firstErrorField) result.firstErrorField = "poll";
        }
      }
    }

    // For Polis URL import, validate URL
    if (importType === "polis-url") {
      if (
        !importSettings.value.polisUrl ||
        !isValidPolisUrl(importSettings.value.polisUrl)
      ) {
        result.isValid = false;
        result.errors.polisUrl = t("polisUrlInvalid");
        if (!result.firstErrorField) result.firstErrorField = "polisUrl";
      }
    }

    return result;
  }

  // ============================================================================
  // Mutation Functions
  // ============================================================================

  function updateTitle(newTitle: string): MutationResult {
    title.value = newTitle;

    // Clear error when user starts typing
    if (validationState.value.title.showError && newTitle.trim()) {
      clearValidationError("title");
    }

    return { success: true };
  }

  function updateContent(newContent: string): MutationResult {
    content.value = newContent;

    // Clear error when content becomes valid
    if (validationState.value.body.showError) {
      clearValidationError("body");
    }

    return { success: true };
  }

  function updatePollOption(index: number, value: string): MutationResult {
    if (index < 0 || index >= pollOptions.value.length) {
      return { success: false, error: "Invalid poll option index" };
    }

    // Validate poll option length
    if (value.length > MAX_LENGTH_OPTION) {
      console.warn(
        `Poll option exceeds max length (${value.length}/${MAX_LENGTH_OPTION}), keeping old value`
      );
      return { success: false, error: "Poll option too long" };
    }

    pollOptions.value[index] = value;

    // Clear poll validation error when user starts fixing issues
    if (validationState.value.poll.showError) {
      clearValidationError("poll");
    }

    return { success: true };
  }

  function addPollOption(): MutationResult {
    const maxOptions = VALIDATION_CONSTANTS.MAX_POLL_OPTIONS;
    if (pollOptions.value.length >= maxOptions) {
      return {
        success: false,
        error: t("pollMaxOptionsError", { max: maxOptions.toString() }),
      };
    }

    pollOptions.value.push("");

    // Clear poll validation error
    if (validationState.value.poll.showError) {
      clearValidationError("poll");
    }

    return { success: true };
  }

  function removePollOption(index: number): MutationResult {
    const minOptions = VALIDATION_CONSTANTS.MIN_POLL_OPTIONS;

    if (pollOptions.value.length <= minOptions) {
      return {
        success: false,
        error: t("pollMinOptionsError", { min: minOptions.toString() }),
      };
    }

    if (index < 0 || index >= pollOptions.value.length) {
      return { success: false, error: "Invalid poll option index" };
    }

    pollOptions.value.splice(index, 1);

    // Clear poll validation error
    if (validationState.value.poll.showError) {
      clearValidationError("poll");
    }

    return { success: true };
  }

  function togglePoll(enabled: boolean): MutationResult {
    pollEnabled.value = enabled;

    if (!enabled) {
      // Reset poll options when disabling
      pollOptions.value = ["", ""];
      clearValidationError("poll");
    }

    return { success: true };
  }

  function addSeedOpinion(opinion: string): void {
    if (opinion.trim() !== "") {
      seedOpinions.value.push(opinion.trim());
    }
  }

  function updateSeedOpinion(index: number, value: string): void {
    if (index >= 0 && index < seedOpinions.value.length) {
      seedOpinions.value[index] = value;
    }
  }

  function removeSeedOpinion(index: number): void {
    if (index >= 0 && index < seedOpinions.value.length) {
      seedOpinions.value.splice(index, 1);
    }
  }

  // ============================================================================
  // Draft Management Functions
  // ============================================================================

  /**
   * Checks if the current draft has been modified from its default state
   * Compares refs directly - no store delegation
   */
  function isDraftModified(): boolean {
    const emptyDraft = createEmptyDraft();

    // Check basic content changes
    const hasContentChanges =
      title.value !== emptyDraft.title || content.value !== emptyDraft.content;

    // Check seed opinions changes
    const hasSeedOpinionsChanges =
      JSON.stringify(seedOpinions.value) !==
      JSON.stringify(emptyDraft.seedOpinions);

    // Check polling changes
    const hasPollChanges =
      pollEnabled.value !== emptyDraft.poll.enabled ||
      JSON.stringify(pollOptions.value) !==
        JSON.stringify(emptyDraft.poll.options);

    // Check post-as settings changes
    const hasPostAsChanges =
      postAs.value.postAsOrganization !==
        emptyDraft.postAs.postAsOrganization ||
      postAs.value.organizationName !== emptyDraft.postAs.organizationName;

    // Check privacy settings changes
    const hasPrivacyChanges =
      isPrivate.value !== emptyDraft.isPrivate ||
      requiresLogin.value !== emptyDraft.requiresLogin;

    // Check private conversation settings changes
    const hasPrivateSettingsChanges =
      privateConversationSettings.value.hasScheduledConversion !==
      emptyDraft.privateConversationSettings.hasScheduledConversion;

    // Check creation settings changes
    const hasCreationSettingsChanges =
      importSettings.value.importType !==
        emptyDraft.importSettings.importType ||
      importSettings.value.polisUrl !== emptyDraft.importSettings.polisUrl ||
      JSON.stringify(importSettings.value.csvFileMetadata) !==
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
   * Checks if user has content that would be lost when switching creation type
   */
  function hasFormContent(): boolean {
    return (
      title.value.trim() !== "" ||
      content.value.trim() !== "" ||
      (pollEnabled.value && pollOptions.value.some((opt) => opt.trim() !== ""))
    );
  }

  /**
   * Resets the conversation draft to its default empty state
   * Updates refs - watchers automatically sync to store if enabled
   */
  function resetDraft(): void {
    const emptyDraft = createEmptyDraft();

    title.value = emptyDraft.title;
    content.value = emptyDraft.content;
    pollEnabled.value = emptyDraft.poll.enabled;
    pollOptions.value = [...emptyDraft.poll.options];
    seedOpinions.value = [];
    isPrivate.value = emptyDraft.isPrivate;
    requiresLogin.value = emptyDraft.requiresLogin;
    requiresEventTicket.value = emptyDraft.requiresEventTicket;
    privateConversationSettings.value = {
      ...emptyDraft.privateConversationSettings,
    };
    postAs.value = { ...emptyDraft.postAs };
    importSettings.value = { ...emptyDraft.importSettings };

    clearAllValidationErrors();
  }

  // ============================================================================
  // Data Transfer Functions
  // ============================================================================

  /**
   * Initializes draft from provided data (for edit page or restoration)
   */
  function initializeFromData(data: ConversationFormState): void {
    title.value = data.title;
    content.value = data.content;
    pollEnabled.value = data.pollEnabled;
    pollOptions.value = [...data.pollOptions];
    isPrivate.value = data.isPrivate;
    requiresLogin.value = data.requiresLogin;
    requiresEventTicket.value = data.requiresEventTicket;
    privateConversationSettings.value = {
      ...data.privateConversationSettings,
    };

    clearAllValidationErrors();
  }

  /**
   * Exports current form state as a snapshot
   */
  function getDraftSnapshot(): ConversationFormState {
    return {
      title: title.value,
      content: content.value,
      pollEnabled: pollEnabled.value,
      pollOptions: [...pollOptions.value],
      isPrivate: isPrivate.value,
      requiresLogin: requiresLogin.value,
      requiresEventTicket: requiresEventTicket.value,
      privateConversationSettings: {
        ...privateConversationSettings.value,
      },
    };
  }

  // ============================================================================
  // Computed Properties
  // ============================================================================

  const isFormValid = computed(() => {
    return (
      validationState.value.title.isValid &&
      validationState.value.body.isValid &&
      validationState.value.poll.isValid
    );
  });

  const canProceedToReview = computed(() => {
    return validateForReview().isValid;
  });

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // State
    title,
    content,
    pollEnabled,
    pollOptions,
    seedOpinions,
    isPrivate,
    requiresLogin,
    requiresEventTicket,
    privateConversationSettings,
    postAs,
    importSettings,
    validationState,

    // Computed
    isFormValid,
    canProceedToReview,

    // Validation functions
    validateTitle,
    validateBody,
    validatePoll,
    validatePolisUrl,
    validateForReview,
    clearValidationError,
    clearAllValidationErrors,

    // Mutation functions
    updateTitle,
    updateContent,
    updatePollOption,
    addPollOption,
    removePollOption,
    togglePoll,
    addSeedOpinion,
    updateSeedOpinion,
    removeSeedOpinion,

    // Draft management functions
    createEmptyDraft,
    isDraftModified,
    hasFormContent,
    resetDraft,

    // Data transfer functions
    initializeFromData,
    getDraftSnapshot,
  };
}
