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
import {
  areConversationMultilingualSettingsEqual,
  createEmptyDraft,
} from "src/composables/conversation/draft/conversationDraft.utils";
import {
  checkFeatureAccess,
  DEFAULT_FEATURE_ALLOWED_ORGS,
  DEFAULT_FEATURE_ALLOWED_USERS,
} from "src/shared-app-api/featureAccess";
import { useAuthenticationStore } from "src/stores/authentication";
import { processEnv } from "src/utils/processEnv";
import { areSurveyConfigsEqual } from "src/utils/survey/config";
import { watch } from "vue";

export const useNewPostDraftsStore = defineStore("newPostDrafts", () => {
  const authStore = useAuthenticationStore();

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

    return result.data;
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
            const serializableDraft: SerializableConversationDraft = draft;
            return JSON.stringify(serializableDraft);
          } catch (error) {
            console.error("Failed to serialize conversation draft:", error);
            // Fallback to empty draft
            const emptyDraft = createEmptyDraft();
            const fallbackData: SerializableConversationDraft = emptyDraft;
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
      current.content !== emptyDraft.content ||
      current.contentPlainText !== emptyDraft.contentPlainText;

    const hasMultilingualSettingChanges =
      !areConversationMultilingualSettingsEqual({
        left: current.multilingualSetting,
        right: emptyDraft.multilingualSetting,
      });
    const hasProjectSelectionChanges =
      current.selectedProjectSlug !== emptyDraft.selectedProjectSlug ||
      current.inheritProjectLanguages !== emptyDraft.inheritProjectLanguages;

    // Check seed opinions changes
    const hasSeedOpinionsChanges =
      JSON.stringify(current.seedOpinions) !==
      JSON.stringify(emptyDraft.seedOpinions);

    // Check conversation type changes
    const hasConversationTypeChanges =
      current.conversationType !== emptyDraft.conversationType ||
      current.rankingMode !== emptyDraft.rankingMode;

    // Check post-as settings changes
    const hasPostAsChanges =
      current.postAs.postAsOrganization !==
        emptyDraft.postAs.postAsOrganization ||
      current.postAs.organizationName !== emptyDraft.postAs.organizationName;

    // Check privacy settings changes
    const hasPrivacyChanges =
      current.isPrivate !== emptyDraft.isPrivate ||
      current.participationMode !== emptyDraft.participationMode;

    const hasAiLabelingChanges =
      current.aiLabelingEnabled !== emptyDraft.aiLabelingEnabled;

    const hasPreferredOpinionGroupCountChanges =
      current.preferredOpinionGroupCount !==
      emptyDraft.preferredOpinionGroupCount;

    // Check creation settings changes
    const hasCreationSettingsChanges =
      current.importSettings.importType !==
        emptyDraft.importSettings.importType ||
      current.importSettings.polisUrl !== emptyDraft.importSettings.polisUrl ||
      JSON.stringify(current.importSettings.csvFileMetadata) !==
        JSON.stringify(emptyDraft.importSettings.csvFileMetadata);

    const hasSurveyConfigChanges =
      !areSurveyConfigsEqual({
        left: current.surveyConfig,
        right: emptyDraft.surveyConfig,
      });

    return (
      hasContentChanges ||
      hasMultilingualSettingChanges ||
      hasProjectSelectionChanges ||
      hasSeedOpinionsChanges ||
      hasConversationTypeChanges ||
      hasPostAsChanges ||
      hasPrivacyChanges ||
      hasAiLabelingChanges ||
      hasPreferredOpinionGroupCountChanges ||
      hasCreationSettingsChanges ||
      hasSurveyConfigChanges
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
      draft.content.trim() !== ""
    );
  }

  /**
   * Clears content fields when switching to non-manual creation type
   */
  function clearContentFields(): void {
    conversationDraft.value.title = "";
    conversationDraft.value.content = "";
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

  function clearImportDraft(): void {
    conversationDraft.value.importSettings.importType = null;
    conversationDraft.value.importSettings.polisUrl = "";
    conversationDraft.value.importSettings.csvFileMetadata = {
      summary: null,
      comments: null,
      votes: null,
    };
  }

  function canEvaluateCurrentActorRestrictions(): boolean {
    return (
      conversationDraft.value.postAs.postAsOrganization || authStore.userId !== undefined
    );
  }

  function isImportAllowedForCurrentActor(): boolean {
    const result = checkFeatureAccess({
      featureEnabled: true,
      isOrgOnly: processEnv.VITE_IS_ORG_IMPORT_ONLY === "true",
      allowedOrgs:
        processEnv.VITE_IMPORT_ALLOWED_ORGS ?? DEFAULT_FEATURE_ALLOWED_ORGS,
      allowedUsers:
        processEnv.VITE_IMPORT_ALLOWED_USERS ?? DEFAULT_FEATURE_ALLOWED_USERS,
      postAsOrganization: conversationDraft.value.postAs.postAsOrganization,
      organizationName: conversationDraft.value.postAs.organizationName,
      userId: authStore.userId ?? "",
    });

    return result.allowed;
  }

  function normalizeRestrictedFeatureDraftState(): void {
    if (!canEvaluateCurrentActorRestrictions()) {
      return;
    }

    if (
      conversationDraft.value.importSettings.importType !== null &&
      !isImportAllowedForCurrentActor()
    ) {
      clearImportDraft();
    }

  }

  // ============================================================================
  // Watchers
  // ============================================================================

  normalizeRestrictedFeatureDraftState();

  watch(
    () => ({
      postAsOrganization: conversationDraft.value.postAs.postAsOrganization,
      organizationName: conversationDraft.value.postAs.organizationName,
      userId: authStore.userId,
    }),
    () => {
      normalizeRestrictedFeatureDraftState();
    }
  );

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
    addInitialOpinion,
    togglePrivacy,

    // Import type management functions
    setImportType,
    setImportTypeWithClearing,
    clearContentFields,
  };
});
