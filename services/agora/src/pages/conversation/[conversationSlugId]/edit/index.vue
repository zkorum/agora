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
        :disabled="isSaveButtonLoading || !isDataLoaded"
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
            :max-length="MAX_LENGTH_TITLE"
            min-height="auto"
            :disabled="false"
            class="title-editor"
            @update:model-value="updateTitle"
          />

          <div class="wordCountDiv" :style="{ paddingLeft: '0.5rem' }">
            {{ title.length }} / {{ MAX_LENGTH_TITLE }}
          </div>
        </div>

        <div>
          <div class="editor-style">
            <Editor
              v-model="content"
              :placeholder="t('bodyPlaceholder')"
              min-height="5rem"
              :show-toolbar="true"
              :single-line="false"
              :max-length="MAX_LENGTH_BODY"
              :disabled="false"
              @update:model-value="updateContent"
            />

            <div class="wordCountDiv">
              <q-icon
                v-if="validationState.body.showError"
                name="mdi-alert-circle"
                class="bodySizeWarningIcon"
              />
              <span
                :class="{
                  wordCountWarning: validationState.body.showError,
                }"
                >{{
                  validateHtmlStringCharacterCount(content, "conversation")
                    .characterCount
                }}
              </span>
              &nbsp; / {{ MAX_LENGTH_BODY }}
            </div>
          </div>

          <div v-if="pollEnabled">
            <PollComponent
              ref="pollComponentRef"
              v-model:poll-enabled="pollEnabled"
              v-model:poll-options="pollOptions"
              v-model:validation-error="pollValidationError"
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
import {
  MAX_LENGTH_BODY,
  MAX_LENGTH_TITLE,
  validateHtmlStringCharacterCount,
} from "src/shared/shared";
import { useHomeFeedStore } from "src/stores/homeFeed";
import { useBackendPostEditApi } from "src/utils/api/post/postEdit";
import { useNotify } from "src/utils/ui/notify";
import { computed, onMounted, ref } from "vue";
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
const { getConversationForEdit, updateConversation } = useBackendPostEditApi();
const { resetPostData } = useHomeFeedStore();

const conversationSlugId = route.params.conversationSlugId;

const isSaveButtonLoading = ref(false);
const isDataLoaded = ref(false);
const loadError = ref(false);
const errorTitle = ref("");
const errorMessage = ref("");

const showPollWarning = ref(false);
const pollWarningMessage = ref("");
const pendingSaveAction = ref<(() => Promise<void>) | null>(null);

// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
const pollComponentRef = ref<InstanceType<typeof PollComponent> | null>(null);
const titleInputRef = ref<HTMLDivElement | null>(null);

// Store original poll state to detect changes
const originalPollState = ref<{
  enabled: boolean;
  options: string[];
}>({
  enabled: false,
  options: [],
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
const pollValidationError = computed({
  get: () => validationState.value.poll.error,
  set: (value) => {
    validationState.value.poll.error = value;
  },
});

function scrollToTitleInput() {
  setTimeout(function () {
    titleInputRef.value?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, 100);
}

function scrollToPollComponent() {
  setTimeout(function () {
    pollComponentRef.value?.$el?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, 100);
}

function handleValidationError(errorField: ValidationErrorField): void {
  switch (errorField) {
    case "title":
      validateTitle();
      scrollToTitleInput();
      break;
    case "poll":
      validatePoll();
      scrollToPollComponent();
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

function hasPollChanged(): boolean {
  const current = { enabled: pollEnabled.value, options: pollOptions.value };
  const original = originalPollState.value;

  // Check if poll was added or removed
  if (current.enabled !== original.enabled) {
    return true;
  }

  // If poll is enabled, check if options changed
  if (current.enabled) {
    if (current.options.length !== original.options.length) {
      return true;
    }

    for (let i = 0; i < current.options.length; i++) {
      if (current.options[i] !== original.options[i]) {
        return true;
      }
    }
  }

  return false;
}

async function performSave(): Promise<void> {
  if (!conversationSlugId) {
    showNotifyMessage(t("updateError"));
    isSaveButtonLoading.value = false;
    return;
  }

  try {
    const response = await updateConversation({
      conversationSlugId: conversationSlugId,
      conversationTitle: title.value,
      conversationBody: content.value,
      pollingOptionList: pollEnabled.value ? pollOptions.value : undefined,
      removePoll: !pollEnabled.value && originalPollState.value.enabled,
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
      // Invalidate home feed cache to ensure fresh data
      await resetPostData();
      // Navigate back to conversation view
      await router.push({
        name: "/conversation/[postSlugId]",
        params: { postSlugId: conversationSlugId },
      });
    } else {
      let errorMsg = t("updateError");
      if (response.reason === "not_found") {
        errorMsg = t("notFoundError");
      } else if (response.reason === "not_author") {
        errorMsg = t("notAuthorError");
      } else if (response.reason === "conversation_locked") {
        errorMsg = t("conversationLockedError");
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
      handleValidationError(validation.errorField);
    }
    return;
  }

  isSaveButtonLoading.value = true;

  // Check if poll changed
  if (hasPollChanged()) {
    // Show warning dialog
    if (pollEnabled.value) {
      pollWarningMessage.value = t("pollChangeWarningMessage");
    } else {
      pollWarningMessage.value = t("removePollWarningMessage");
    }

    pendingSaveAction.value = performSave;
    showPollWarning.value = true;
    isSaveButtonLoading.value = false;
  } else {
    await performSave();
  }
}

async function handlePollWarningConfirm(): Promise<void> {
  showPollWarning.value = false;
  if (pendingSaveAction.value) {
    isSaveButtonLoading.value = true;
    await pendingSaveAction.value();
    pendingSaveAction.value = null;
  }
}

function handlePollWarningCancel(): void {
  showPollWarning.value = false;
  pendingSaveAction.value = null;
}

onMounted(async () => {
  try {
    if (!conversationSlugId) {
      loadError.value = true;
      errorTitle.value = t("notFoundError");
      errorMessage.value = t("loadingError");
      return;
    }

    const response = await getConversationForEdit(conversationSlugId);

    if (!response.success) {
      loadError.value = true;
      if (response.reason === "not_found") {
        errorTitle.value = t("notFoundError");
        errorMessage.value = t("loadingError");
      } else if (response.reason === "not_author") {
        errorTitle.value = t("notAuthorError");
        errorMessage.value = t("notAuthorError");
      }
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

    // Store original poll state for change detection
    if (response.hasPoll && response.pollingOptionList) {
      originalPollState.value = {
        enabled: true,
        options: [...response.pollingOptionList],
      };
    } else {
      originalPollState.value = {
        enabled: false,
        options: [],
      };
    }

    isDataLoaded.value = true;
  } catch (error) {
    console.error("Error loading conversation for edit:", error);
    loadError.value = true;
    errorTitle.value = t("loadingError");
    errorMessage.value = t("loadingError");
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

.wordCountDiv {
  display: flex;
  justify-content: right;
  align-items: center;
  color: $color-text-weak;
  font-size: 1rem;
}

.wordCountWarning {
  color: $negative;
  font-weight: var(--font-weight-bold);
}

.bodySizeWarningIcon {
  font-size: 1rem;
  padding-right: 0.5rem;
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
