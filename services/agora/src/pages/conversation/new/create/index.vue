<template>
  <NewConversationLayout>
    <TopMenuWrapper>
      <div>
        <BackButton />
      </div>

      <ZKButton
        button-type="largeButton"
        color="primary"
        :label="conversationDraft.importSettings.isImportMode ? 'Post' : 'Next'"
        size="0.8rem"
        :loading="isSubmitButtonLoading"
        @click="onSubmit()"
      />
    </TopMenuWrapper>

    <div class="container">
      <NewConversationControlBar />

      <div class="contentFlexStyle">
        <div
          v-if="!conversationDraft.importSettings.isImportMode"
          ref="titleInputRef"
          :style="{ paddingLeft: '0.5rem' }"
        >
          <div v-if="validationState.title.showError" class="titleErrorMessage">
            <q-icon name="mdi-alert-circle" class="titleErrorIcon" />
            {{ validationState.title.error }}
          </div>

          <q-input
            v-model="conversationDraft.title"
            borderless
            no-error-icon
            placeholder="What do you want to ask?"
            type="textarea"
            autogrow
            :maxlength="MAX_LENGTH_TITLE"
            required
            :error="validationState.title.showError"
            class="large-text-input"
            @update:model-value="updateTitle"
          >
            <template #after>
              <div class="wordCountDiv">
                {{ conversationDraft.title.length }} /
                {{ MAX_LENGTH_TITLE }}
              </div>
            </template>
          </q-input>
        </div>
        <div v-else class="import-section">
          <PolisUrlInput
            ref="polisUrlInputRef"
            v-model="conversationDraft.importSettings.polisUrl"
          />
        </div>

        <div v-if="!conversationDraft.importSettings.isImportMode">
          <div class="editor-style">
            <ZKEditor
              v-model="conversationDraft.content"
              placeholder="Body text. Provide context or relevant resources. Make sure it's aligned with the main question!"
              min-height="5rem"
              :focus-editor="false"
              :show-toolbar="true"
              :add-background-color="false"
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
                  validateHtmlStringCharacterCount(
                    conversationDraft.content,
                    "conversation"
                  ).characterCount
                }}
              </span>
              &nbsp; / {{ MAX_LENGTH_BODY }}
            </div>
          </div>

          <div v-if="conversationDraft.poll.enabled">
            <PollComponent ref="pollComponentRef" />
          </div>
        </div>
      </div>
    </div>

    <NewConversationRouteGuard
      ref="routeGuardRef"
      :allowed-routes="['/conversation/new/review/']"
    />

    <PreLoginIntentionDialog
      v-model="showLoginDialog"
      :ok-callback="onLoginCallback"
      :active-intention="'newConversation'"
    />
  </NewConversationLayout>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useRouter } from "vue-router";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import TopMenuWrapper from "src/components/navigation/header/TopMenuWrapper.vue";
import ZKEditor from "src/components/ui-library/ZKEditor.vue";
import PolisUrlInput from "src/components/newConversation/PolisUrlInput.vue";
import {
  useNewPostDraftsStore,
  type ValidationErrorField,
} from "src/stores/newConversationDrafts";
import { useAuthenticationStore } from "src/stores/authentication";
import { useCommonApi } from "src/utils/api/common";
import {
  MAX_LENGTH_TITLE,
  MAX_LENGTH_BODY,
  validateHtmlStringCharacterCount,
} from "src/shared/shared";
import { storeToRefs } from "pinia";
import { useLoginIntentionStore } from "src/stores/loginIntention";
import NewConversationLayout from "src/components/newConversation/NewConversationLayout.vue";
import NewConversationControlBar from "src/components/newConversation/NewConversationControlBar.vue";
import NewConversationRouteGuard from "src/components/newConversation/NewConversationRouteGuard.vue";
import BackButton from "src/components/navigation/buttons/BackButton.vue";
import PreLoginIntentionDialog from "src/components/authentication/intention/PreLoginIntentionDialog.vue";
import PollComponent from "src/components/newConversation/PollComponent.vue";
import { useBackendPostApi } from "src/utils/api/post";

const isSubmitButtonLoading = ref(false);

const router = useRouter();

const { importConversation } = useBackendPostApi();

// Disable the warning since Vue template refs can be potentially null
// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
const routeGuardRef = ref<InstanceType<
  typeof NewConversationRouteGuard
> | null>(null);

// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
const pollComponentRef = ref<InstanceType<typeof PollComponent> | null>(null);
// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
const polisUrlInputRef = ref<InstanceType<typeof PolisUrlInput> | null>(null);
const titleInputRef = ref<HTMLDivElement | null>(null);

const {
  createEmptyDraft,
  validatePolisUrlField,
  validatePollField,
  validateForReview,
  updateTitle,
  updateContent,
  validationState,
} = useNewPostDraftsStore();
const { conversationDraft } = storeToRefs(useNewPostDraftsStore());

const { createNewConversationIntention } = useLoginIntentionStore();
const { isLoggedIn } = storeToRefs(useAuthenticationStore());
const { handleAxiosErrorStatusCodes } = useCommonApi();

const showLoginDialog = ref(false);

function onLoginCallback() {
  createNewConversationIntention();
}

function scrollToPollingRef() {
  if (conversationDraft.value.poll.enabled) {
    setTimeout(function () {
      pollComponentRef.value?.$el?.scrollIntoView({
        behavior: "smooth",
        inline: "start",
      });
    }, 100);
  } else {
    conversationDraft.value.poll.options = createEmptyDraft().poll.options;
  }
}

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

function validateSubmission(): {
  isValid: boolean;
  errorField?: ValidationErrorField;
} {
  if (conversationDraft.value.importSettings.isImportMode) {
    const polisValidation = validatePolisUrlField();
    if (!polisValidation.success) {
      return { isValid: false, errorField: "polisUrl" };
    }
  } else {
    const validation = validateForReview();
    if (!validation.isValid) {
      return {
        isValid: false,
        errorField: validation.firstErrorField,
      };
    }
  }
  return { isValid: true };
}

function handleValidationError(errorField: ValidationErrorField): void {
  switch (errorField) {
    case "title":
      scrollToTitleInput();
      break;
    case "poll":
      validatePollField();
      scrollToPollComponent();
      break;
    case "body":
      // Body validation errors are handled inline in the editor
      break;
    case "polisUrl":
      // Polis URL validation errors are handled in the PolisUrlInput component
      break;
  }
}

async function handleImportSubmission(): Promise<void> {
  const response = await importConversation({
    polisUrl: conversationDraft.value.importSettings.polisUrl,
    postAsOrganizationName: conversationDraft.value.postAs.organizationName,
    targetIsoConvertDateString: conversationDraft.value
      .privateConversationSettings.hasScheduledConversion
      ? conversationDraft.value.privateConversationSettings.conversionDate.toISOString()
      : undefined,
    isIndexed: !conversationDraft.value.isPrivate,
    isLoginRequired: conversationDraft.value.isPrivate
      ? conversationDraft.value.privateConversationSettings.requiresLogin
      : false,
    pollingOptionList: undefined, // intentionally left out since we don't support polling while in import mode
  });

  if (response.status === "success") {
    conversationDraft.value = createEmptyDraft();
    await router.replace({
      name: "/conversation/[postSlugId]",
      params: { postSlugId: response.data.conversationSlugId },
    });
  } else {
    handleAxiosErrorStatusCodes({
      axiosErrorCode: response.code,
      defaultMessage: "Error while trying to import conversation from Polis",
    });
  }
}

async function handleRegularSubmission(): Promise<void> {
  routeGuardRef.value?.unlockRoute();
  await router.push({ name: "/conversation/new/review/" });
}

async function onSubmit(): Promise<void> {
  if (!isLoggedIn.value) {
    showLoginDialog.value = true;
    return;
  }

  const validation = validateSubmission();
  if (!validation.isValid) {
    if (validation.errorField) {
      handleValidationError(validation.errorField);
    }
    return;
  }

  isSubmitButtonLoading.value = true;
  try {
    if (conversationDraft.value.importSettings.isImportMode) {
      await handleImportSubmission();
    } else {
      await handleRegularSubmission();
    }
  } finally {
    isSubmitButtonLoading.value = false;
  }
}

watch(
  () => conversationDraft.value.poll.enabled,
  (enablePolling) => {
    if (enablePolling === true) {
      scrollToPollingRef();
    }
  }
);
</script>

<style scoped lang="scss">
.title-style {
  font-size: 1.1rem;
  font-weight: 600;
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
  font-weight: bold;
}

.bodySizeWarningIcon {
  font-size: 1rem;
  padding-right: 0.5rem;
}

.cardBackground {
  background-color: white;
}

.organizationSection {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.organizationFlexList {
  display: flex;
  flex-direction: column;
  gap: 1rem;
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

.large-text-input :deep(.q-field__control) {
  font-size: 1.2rem;
}

.large-text-input :deep(.q-field__native) {
  font-weight: 500;
}
</style>
