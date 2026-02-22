<template>
  <NewConversationLayout>
    <TopMenuWrapper>
      <div>
        <BackButton />
      </div>

      <PrimeButton
        :label="t('saveButton')"
        size="0.8rem"
        :loading="isSaveButtonLoading"
        :disabled="isSaveButtonLoading || !isDataLoaded || !hasUnsavedChanges || isTitleOverLimit || isBodyOverLimit"
        @click="onSave()"
      />
    </TopMenuWrapper>

    <div v-if="loadError" class="error-container">
      <ZKCard class="error-card" padding="1.5rem">
        <div class="error-content">
          <q-icon name="mdi-alert-circle" class="error-icon" />
          <div class="error-text">
            <div class="error-title">{{ errorTitle }}</div>
            <div class="error-message">{{ errorMessage }}</div>
          </div>
        </div>
      </ZKCard>
    </div>

    <div v-else-if="!isDataLoaded" class="loading-container">
      <q-spinner color="primary" size="3rem" />
    </div>

    <div v-else class="container">
      <NewConversationControlBar
        v-model:poll-enabled="pollEnabled"
        v-model:is-private="isPrivate"
        v-model:requires-login="requiresLogin"
        v-model:requires-event-ticket="requiresEventTicket"
        v-model:private-conversation-settings="privateConversationSettings"
        v-model:post-as="postAs"
        v-model:import-settings="importSettings"
        v-model:title="title"
        v-model:content="content"
        v-model:poll-options="pollOptions"
        :is-edit-mode="true"
      />

      <div class="contentFlexStyle">
        <div ref="titleInputRef">
          <div v-if="validationState.title.showError" class="titleErrorMessage">
            <q-icon name="mdi-alert-circle" class="titleErrorIcon" />
            {{ validationState.title.error }}
          </div>

          <Editor
            v-model="title"
            :placeholder="t('titlePlaceholder')"
            :show-toolbar="false"
            :single-line="true"
            :disabled="false"
            :max-length="MAX_LENGTH_TITLE"
            min-height="auto"
            class="title-editor"
            @update:model-value="updateTitle"
            @update:is-over-limit="(v: boolean) => (isTitleOverLimit = v)"
          />
        </div>

        <div>
          <div class="editor-style">
            <Editor
              v-model="content"
              :placeholder="t('bodyPlaceholder')"
              min-height="5rem"
              :show-toolbar="true"
              :single-line="false"
              :disabled="false"
              :max-length="MAX_LENGTH_BODY"
              @update:model-value="updateContent"
              @update:is-over-limit="(v: boolean) => (isBodyOverLimit = v)"
            />
          </div>

          <div v-if="pollEnabled">
            <PollComponent
              ref="pollComponentRef"
              v-model:poll-enabled="pollEnabled"
              v-model:poll-options="pollOptions"
              v-model:validation-error="pollValidationError"
              :readonly="isCurrentPollOriginal"
            />
          </div>
        </div>
      </div>
    </div>

    <ZKConfirmDialog
      v-model="showPollWarning"
      :message="pollWarningMessage"
      :confirm-text="t('pollChangeWarningConfirm')"
      :cancel-text="t('pollChangeWarningCancel')"
      variant="destructive"
      @confirm="handlePollWarningConfirm"
      @cancel="handlePollWarningCancel"
    />
  </NewConversationLayout>
</template>

<script setup lang="ts">
import Editor from "src/components/editor/Editor.vue";
import BackButton from "src/components/navigation/buttons/BackButton.vue";
import TopMenuWrapper from "src/components/navigation/header/TopMenuWrapper.vue";
import NewConversationControlBar from "src/components/newConversation/NewConversationControlBar.vue";
import NewConversationLayout from "src/components/newConversation/NewConversationLayout.vue";
import PollComponent from "src/components/newConversation/poll/PollComponent.vue";
import ZKCard from "src/components/ui-library/ZKCard.vue";
import ZKConfirmDialog from "src/components/ui-library/ZKConfirmDialog.vue";
import {
  useConversationDraft,
  type ValidationErrorField,
} from "src/composables/conversation/draft";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { MAX_LENGTH_BODY, MAX_LENGTH_TITLE } from "src/shared/shared";
import { useBackendPostEditApi } from "src/utils/api/post/postEdit";
import { useUpdateConversationMutation } from "src/utils/api/post/useConversationMutations";
import { useNotify } from "src/utils/ui/notify";
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import {
  type EditConversationTranslations,
  editConversationTranslations,
} from "./index.i18n";

const { t } = useComponentI18n<EditConversationTranslations>(
  editConversationTranslations
);

const route = useRoute("/conversation/[conversationSlugId]/edit/");
const router = useRouter();
const { showNotifyMessage } = useNotify();
const { getConversationForEdit } = useBackendPostEditApi();
const updateMutation = useUpdateConversationMutation();

const conversationSlugId = route.params.conversationSlugId;

const isSaveButtonLoading = ref(false);
const isTitleOverLimit = ref(false);
const isBodyOverLimit = ref(false);
const isDataLoaded = ref(false);
const loadError = ref(false);
const errorTitle = ref("");
const errorMessage = ref("");

const showPollWarning = ref(false);
const pollWarningMessage = ref("");
const pendingSaveAction = ref<(() => Promise<void>) | undefined>(undefined);

const pollComponentRef = ref<InstanceType<typeof PollComponent>>();
const titleInputRef = ref<HTMLDivElement>();

// Store original state to detect changes
const originalState = ref<{
  title: string;
  content: string;
  isPrivate: boolean;
  requiresLogin: boolean;
  requiresEventTicket: string | undefined;
  privateConversationSettings: {
    hasScheduledConversion: boolean;
    conversionDate: Date;
  };
  poll: {
    enabled: boolean;
    options: string[];
  };
}>({
  title: "",
  content: "",
  isPrivate: false,
  requiresLogin: false,
  requiresEventTicket: undefined,
  privateConversationSettings: {
    hasScheduledConversion: false,
    conversionDate: new Date(),
  },
  poll: {
    enabled: false,
    options: [],
  },
});

// Track whether current poll is the original (for poll warnings)
const isCurrentPollOriginal = ref(false);

// Computed property to detect if any changes have been made
const hasUnsavedChanges = computed(() => {
  // Normalize whitespace for comparison (trim and collapse multiple spaces)
  const normalizeText = (text: string): string =>
    text.trim().replace(/\s+/g, " ");

  // Compare title (normalized)
  if (normalizeText(title.value) !== normalizeText(originalState.value.title)) {
    return true;
  }

  // Compare content (normalized)
  if (
    normalizeText(content.value) !== normalizeText(originalState.value.content)
  ) {
    return true;
  }

  // Compare privacy settings
  if (
    isPrivate.value !== originalState.value.isPrivate ||
    requiresLogin.value !== originalState.value.requiresLogin
  ) {
    return true;
  }

  // Compare event ticket requirement (string | undefined)
  if (requiresEventTicket.value !== originalState.value.requiresEventTicket) {
    return true;
  }

  // Compare scheduled conversion settings
  if (
    privateConversationSettings.value.hasScheduledConversion !==
    originalState.value.privateConversationSettings.hasScheduledConversion
  ) {
    return true;
  }

  if (
    privateConversationSettings.value.hasScheduledConversion &&
    originalState.value.privateConversationSettings.hasScheduledConversion
  ) {
    // Compare dates (ignore milliseconds)
    const currentDate =
      privateConversationSettings.value.conversionDate.getTime();
    const originalDate =
      originalState.value.privateConversationSettings.conversionDate.getTime();
    if (Math.abs(currentDate - originalDate) > 1000) {
      return true;
    }
  }

  // Compare poll state (both should be boolean after initialization)
  if (pollEnabled.value !== originalState.value.poll.enabled) {
    return true;
  }

  // If both have polls, compare options
  if (pollEnabled.value && originalState.value.poll.enabled) {
    if (pollOptions.value.length !== originalState.value.poll.options.length) {
      return true;
    }
    for (let i = 0; i < pollOptions.value.length; i++) {
      if (
        normalizeText(pollOptions.value[i]) !==
        normalizeText(originalState.value.poll.options[i])
      ) {
        return true;
      }
    }
  }

  return false;
});

// Use conversation draft composable (no store sync for edit page)
const {
  title,
  content,
  pollEnabled,
  pollOptions,
  isPrivate,
  requiresLogin,
  requiresEventTicket,
  privateConversationSettings,
  postAs,
  importSettings,
  validationState,
  validateTitle,
  validateBody,
  validatePoll,
  updateTitle,
  updateContent,
  initializeFromData,
} = useConversationDraft({ syncToStore: false });

// Extract poll validation error for passing to PollComponent
const pollValidationError = computed<string>({
  get: () => validationState.value.poll.error,
  set: (value: string) => {
    validationState.value.poll.error = value;
  },
});

async function scrollToTitleInput() {
  await nextTick();
  titleInputRef.value?.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
}

async function scrollToPollComponent() {
  await nextTick();
  pollComponentRef.value?.$el?.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
}

async function handleValidationError(
  errorField: ValidationErrorField
): Promise<void> {
  switch (errorField) {
    case "title":
      validateTitle();
      await scrollToTitleInput();
      break;
    case "poll":
      validatePoll();
      await scrollToPollComponent();
      break;
    case "body":
      validateBody();
      break;
    case "polisUrl":
      // Not applicable for edit page
      break;
  }
}

function validateSubmission(): {
  isValid: boolean;
  errorField?: ValidationErrorField;
} {
  // Validate title
  if (!validateTitle().success) {
    return { isValid: false, errorField: "title" };
  }

  // Validate body
  if (!validateBody().success) {
    return { isValid: false, errorField: "body" };
  }

  // Validate poll if enabled
  if (pollEnabled.value && !validatePoll().success) {
    return { isValid: false, errorField: "poll" };
  }

  return { isValid: true };
}

/**
 * Determines the appropriate poll action based on current and original poll state
 * Note: Poll options are immutable - they cannot be modified once created
 */
function determinePollAction():
  | { action: "none" }
  | { action: "keep" }
  | { action: "remove" }
  | { action: "replace"; options: string[] }
  | { action: "create"; options: string[] } {
  const originalPollEnabled = originalState.value.poll.enabled;

  // No poll now, no poll before → none (no-op)
  if (!pollEnabled.value && !originalPollEnabled) {
    return { action: "none" };
  }

  // No poll now, had poll before → remove
  if (!pollEnabled.value && originalPollEnabled) {
    return { action: "remove" };
  }

  // Has poll now, no poll before → create
  if (pollEnabled.value && !originalPollEnabled) {
    return { action: "create", options: pollOptions.value };
  }

  // Has poll now, had poll before
  if (pollEnabled.value && originalPollEnabled) {
    // If current poll is the original poll → keep
    if (isCurrentPollOriginal.value) {
      return { action: "keep" };
    }
    // If current poll is NOT the original (user removed and re-added) → replace
    // This creates a brand new poll, orphaning the old one
    return { action: "replace", options: pollOptions.value };
  }

  // Fallback (should never reach here)
  return { action: "none" };
}

async function performSave(): Promise<void> {
  try {
    const pollAction = determinePollAction();

    const response = await updateMutation.mutateAsync({
      conversationSlugId: conversationSlugId,
      conversationTitle: title.value,
      conversationBody: content.value,
      pollAction: pollAction,
      isIndexed: !isPrivate.value,
      isLoginRequired: requiresLogin.value,
      requiresEventTicket: requiresEventTicket.value,
      indexConversationAt: privateConversationSettings.value
        .hasScheduledConversion
        ? privateConversationSettings.value.conversionDate.toISOString()
        : undefined,
    });

    if (response.success) {
      showNotifyMessage(t("updateSuccess"));
      await router.push({
        name: "/conversation/[postSlugId]/",
        params: { postSlugId: conversationSlugId },
      });
    } else {
      // Map the error using discriminated union for type safety
      // Declare errorMsg outside switch to avoid lexical declaration error
      let errorMsg: string;

      switch (response.reason) {
        case "not_found": {
          errorMsg = t("notFoundError");
          break;
        }
        case "not_author": {
          errorMsg = t("notAuthorError");
          break;
        }
        case "conversation_locked": {
          errorMsg = t("conversationLockedError");
          break;
        }
        case "invalid_access_settings": {
          errorMsg = t("invalidAccessSettingsError");
          break;
        }
        case "poll_already_exists": {
          errorMsg = t("pollAlreadyExistsError");
          break;
        }
        case "poll_exists_use_keep_or_remove": {
          errorMsg = t("updateError"); // Generic fallback for internal error
          break;
        }
        case "no_poll_to_remove": {
          errorMsg = t("noPollToRemoveError");
          break;
        }
        case "no_poll_to_keep": {
          errorMsg = t("noPollToKeepError");
          break;
        }
        case "no_poll_to_replace": {
          errorMsg = t("noPollToReplaceError");
          break;
        }
        default: {
          // TypeScript exhaustiveness check - this should never be reached
          const _exhaustiveCheck: never = response.reason;
          errorMsg = t("updateError");
          break;
        }
      }

      showNotifyMessage(errorMsg);
    }
  } catch (error) {
    console.error("Error updating conversation:", error);
    showNotifyMessage(t("updateError"));
  } finally {
    isSaveButtonLoading.value = false;
  }
}

async function onSave(): Promise<void> {
  const validation = validateSubmission();
  if (!validation.isValid) {
    if (validation.errorField) {
      await handleValidationError(validation.errorField);
    }
    return;
  }

  isSaveButtonLoading.value = true;

  // Poll removal warnings are now handled immediately by the watcher
  // when the user clicks the X button on the poll component
  await performSave();
}

async function handlePollWarningConfirm(): Promise<void> {
  showPollWarning.value = false;

  // Mark that we no longer have the original poll
  if (isCurrentPollOriginal.value) {
    isCurrentPollOriginal.value = false;
  }

  if (pendingSaveAction.value !== undefined) {
    isSaveButtonLoading.value = true;
    await pendingSaveAction.value();
    pendingSaveAction.value = undefined;
  }
}

function handlePollWarningCancel(): void {
  showPollWarning.value = false;

  // Restore poll to its previous state
  if (pendingSaveAction.value === undefined) {
    // This was triggered by the watcher, restore the poll
    pollEnabled.value = true;
    pollOptions.value = [...originalState.value.poll.options];
  }

  pendingSaveAction.value = undefined;
}

// Watch for poll changes to show immediate warning when removing original poll
watch(pollEnabled, (newValue, oldValue) => {
  // Only trigger when poll is disabled (removed)
  if (oldValue && !newValue && isCurrentPollOriginal.value) {
    // Show warning immediately when removing the original poll
    pollWarningMessage.value = t("removePollWarningMessage");
    pendingSaveAction.value = undefined; // No save action, just confirming removal
    showPollWarning.value = true;
  }
});

onMounted(async () => {
  try {
    if (!conversationSlugId) {
      loadError.value = true;
      errorTitle.value = t("notFoundErrorTitle");
      errorMessage.value = t("notFoundErrorMessage");
      return;
    }

    const response = await getConversationForEdit(conversationSlugId);

    if (!response.success) {
      loadError.value = true;
      if (response.reason === "not_found") {
        errorTitle.value = t("notFoundErrorTitle");
        errorMessage.value = t("notFoundErrorMessage");
      } else if (response.reason === "not_author") {
        errorTitle.value = t("notAuthorErrorTitle");
        errorMessage.value = t("notAuthorErrorMessage");
      }
      return;
    }

    // Check if conversation is locked
    if (response.isLocked) {
      loadError.value = true;
      errorTitle.value = t("conversationLockedErrorTitle");
      errorMessage.value = t("conversationLockedErrorMessage");
      return;
    }

    // Populate the form with loaded data using initializeFromData
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    initializeFromData({
      title: response.conversationTitle,
      content: response.conversationBody ?? "",
      pollEnabled: response.hasPoll ?? false,
      pollOptions: response.pollingOptionList ?? ["", ""],
      isPrivate: !response.isIndexed,
      requiresLogin: response.isLoginRequired,
      requiresEventTicket: response.requiresEventTicket,
      privateConversationSettings: {
        hasScheduledConversion: !!response.indexConversationAt,
        conversionDate: response.indexConversationAt
          ? new Date(response.indexConversationAt)
          : tomorrow,
      },
    });

    // Store original state for change detection
    originalState.value = {
      title: response.conversationTitle,
      content: response.conversationBody ?? "",
      isPrivate: !response.isIndexed,
      requiresLogin: response.isLoginRequired,
      requiresEventTicket: response.requiresEventTicket,
      privateConversationSettings: {
        hasScheduledConversion: !!response.indexConversationAt,
        conversionDate: response.indexConversationAt
          ? new Date(response.indexConversationAt)
          : tomorrow,
      },
      poll: {
        enabled: response.hasPoll ?? false,
        options: response.pollingOptionList
          ? [...response.pollingOptionList]
          : [],
      },
    };

    // Track if current poll is the original
    // Only set to true if poll actually exists
    isCurrentPollOriginal.value =
      (response.hasPoll ?? false) &&
      (response.pollingOptionList?.length ?? 0) > 0;

    isDataLoaded.value = true;
  } catch (error) {
    console.error("Error loading conversation for edit:", error);
    loadError.value = true;
    errorTitle.value = t("loadingErrorTitle");
    errorMessage.value = t("loadingErrorMessage");
  }
});
</script>

<style scoped lang="scss">
.title-style {
  font-size: 1.1rem;
  font-weight: var(--font-weight-semibold);
  padding-left: 0.5rem;
  padding-right: 0.5rem;
}

.editor-style {
  padding-bottom: 2rem;
  font-size: 1rem;
}

.contentFlexStyle {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.container {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  padding-top: 2rem;
  padding-bottom: 8rem;
}

.titleErrorMessage {
  display: flex;
  align-items: center;
  color: $negative;
  font-size: 0.9rem;
}

.titleErrorIcon {
  font-size: 1rem;
  margin-right: 0.5rem;
}

.error-container {
  padding: 2rem;
  display: flex;
  justify-content: center;
}

.error-card {
  max-width: 600px;
  width: 100%;
}

.error-content {
  display: flex;
  gap: 1rem;
  align-items: start;
  padding: 1rem;
}

.error-icon {
  font-size: 2rem;
  color: $negative;
  flex-shrink: 0;
}

.error-text {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.error-title {
  font-size: 1.2rem;
  font-weight: var(--font-weight-semibold);
  color: $negative;
}

.error-message {
  font-size: 1rem;
  color: $color-text-weak;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}
</style>
