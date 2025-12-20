<template>
  <NewConversationLayout>
    <TopMenuWrapper>
      <div>
        <BackButton />
      </div>

      <PrimeButton
        :label="
          isSubmitButtonLoading
            ? t('importButton')
            : conversationDraft.importSettings.importType !== null
              ? t('importButton')
              : t('nextButton')
        "
        size="0.8rem"
        :loading="isSubmitButtonLoading"
        :disabled="isSubmitButtonLoading || hasActiveImport"
        @click="onSubmit()"
      />
    </TopMenuWrapper>

    <div class="container">
      <NewConversationControlBar />

      <!-- Active Import Banner -->
      <ActiveImportBanner
        v-if="
          hasActiveImport &&
          conversationDraft.importSettings.importType === 'csv-import' &&
          activeImportQuery.data.value?.hasActiveImport
        "
        :import-slug-id="activeImportQuery.data.value.importSlugId"
      />

      <div class="contentFlexStyle">
        <div
          v-if="conversationDraft.importSettings.importType === null"
          ref="titleInputRef"
          :style="{ paddingLeft: '0.5rem' }"
        >
          <div v-if="validationState.title.showError" class="titleErrorMessage">
            <q-icon name="mdi-alert-circle" class="titleErrorIcon" />
            {{ validationState.title.error }}
          </div>

          <!-- @vue-expect-error Quasar q-input types modelValue as string | number | null -->
          <q-input
            v-model="conversationDraft.title"
            borderless
            no-error-icon
            :placeholder="t('titlePlaceholder')"
            type="textarea"
            autogrow
            rows="1"
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
            v-if="conversationDraft.importSettings.importType === 'polis-url'"
            ref="polisUrlInputRef"
            v-model="conversationDraft.importSettings.polisUrl"
          />
          <PolisCsvUpload
            v-else-if="
              conversationDraft.importSettings.importType === 'csv-import'
            "
            ref="polisCsvUploadRef"
          />
        </div>

        <div v-if="conversationDraft.importSettings.importType === null">
          <div class="editor-style">
            <Editor
              v-model="conversationDraft.content"
              :placeholder="t('bodyPlaceholder')"
              min-height="5rem"
              :show-toolbar="true"
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
      active-intention="newConversation"
    />
  </NewConversationLayout>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import PreLoginIntentionDialog from "src/components/authentication/intention/PreLoginIntentionDialog.vue";
import ActiveImportBanner from "src/components/conversation/import/ActiveImportBanner.vue";
import BackButton from "src/components/navigation/buttons/BackButton.vue";
import TopMenuWrapper from "src/components/navigation/header/TopMenuWrapper.vue";
import Editor from "src/components/editor/Editor.vue";
import PolisCsvUpload from "src/components/newConversation/import/csv/PolisCsvUpload.vue";
import PolisUrlInput from "src/components/newConversation/import/url/PolisUrlInput.vue";
import NewConversationControlBar from "src/components/newConversation/NewConversationControlBar.vue";
import NewConversationLayout from "src/components/newConversation/NewConversationLayout.vue";
import NewConversationRouteGuard from "src/components/newConversation/NewConversationRouteGuard.vue";
import PollComponent from "src/components/newConversation/poll/PollComponent.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  MAX_LENGTH_BODY,
  MAX_LENGTH_TITLE,
  validateHtmlStringCharacterCount,
} from "src/shared/shared";
import { useAuthenticationStore } from "src/stores/authentication";
import { useLoginIntentionStore } from "src/stores/loginIntention";
import {
  useNewPostDraftsStore,
  type ValidationErrorField,
} from "src/stores/newConversationDrafts";
import { type AxiosErrorCode, useCommonApi } from "src/utils/api/common";
import { useActiveImportQuery } from "src/utils/api/conversationImport/useConversationImportQueries";
import { useBackendPostApi } from "src/utils/api/post/post";
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";

import {
  type CreateConversationTranslations,
  createConversationTranslations,
} from "./index.i18n";

const { t } = useComponentI18n<CreateConversationTranslations>(
  createConversationTranslations
);

const isSubmitButtonLoading = ref(false);

const router = useRouter();

const { importConversation, importConversationFromCsv } = useBackendPostApi();

// Disable the warning since Vue template refs can be potentially null
// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
const routeGuardRef = ref<InstanceType<
  typeof NewConversationRouteGuard
> | null>(null);

// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
const pollComponentRef = ref<InstanceType<typeof PollComponent> | null>(null);
// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
const polisUrlInputRef = ref<InstanceType<typeof PolisUrlInput> | null>(null);
// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
const polisCsvUploadRef = ref<InstanceType<typeof PolisCsvUpload> | null>(null);
const titleInputRef = ref<HTMLDivElement | null>(null);

const {
  createEmptyDraft,
  validatePolisUrlField,
  validatePollField,
  validateTitleField,
  validateBodyField,
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

// Active import query - only enabled when logged in and on CSV import mode
const activeImportQuery = useActiveImportQuery({
  enabled: computed(
    () =>
      isLoggedIn.value &&
      conversationDraft.value.importSettings.importType === "csv-import"
  ),
});

const hasActiveImport = computed(() => {
  return activeImportQuery.data.value?.hasActiveImport ?? false;
});

function onLoginCallback() {
  // Unlock route to prevent ExitRoutePrompt from showing
  // The user already saw "Your draft will be restored" in the login dialog
  routeGuardRef.value?.unlockRoute();
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
  if (conversationDraft.value.importSettings.importType === "polis-url") {
    const polisValidation = validatePolisUrlField();
    if (!polisValidation.success) {
      return { isValid: false, errorField: "polisUrl" };
    }
  } else if (
    conversationDraft.value.importSettings.importType === "csv-import"
  ) {
    // CSV validation is handled by the PolisCsvUpload component
    if (!polisCsvUploadRef.value?.isValid()) {
      return { isValid: false };
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
      validateTitleField();
      scrollToTitleInput();
      break;
    case "poll":
      validatePollField();
      scrollToPollComponent();
      break;
    case "body":
      validateBodyField();
      // Body validation errors are handled inline in the editor
      break;
    case "polisUrl":
      validatePolisUrlField();
      scrollToPolisUrlInput();
      break;
  }
}

function scrollToPolisUrlInput() {
  setTimeout(function () {
    polisUrlInputRef.value?.$el?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, 100);
}

function scrollToCsvUpload() {
  setTimeout(function () {
    polisCsvUploadRef.value?.$el?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, 100);
}

async function handleImportSubmission(): Promise<void> {
  if (conversationDraft.value.importSettings.importType === "csv-import") {
    // CSV Import - use the CSV endpoint
    const files = polisCsvUploadRef.value?.getFiles();
    if (!files?.summary || !files?.comments || !files?.votes) {
      handleAxiosErrorStatusCodes({
        axiosErrorCode: "ERR_BAD_REQUEST",
        defaultMessage: "Missing required CSV files",
      });
      return;
    }

    try {
      const response = await importConversationFromCsv({
        summaryFile: files.summary,
        commentsFile: files.comments,
        votesFile: files.votes,
        postAsOrganizationName: conversationDraft.value.postAs.organizationName,
        targetIsoConvertDateString: conversationDraft.value
          .privateConversationSettings.hasScheduledConversion
          ? conversationDraft.value.privateConversationSettings.conversionDate.toISOString()
          : undefined,
        isIndexed: !conversationDraft.value.isPrivate,
        isLoginRequired: conversationDraft.value.requiresLogin,
        requiresEventTicket: conversationDraft.value.requiresEventTicket,
      });

      conversationDraft.value = createEmptyDraft();
      // CSV import is async - redirect to import status page to poll for completion
      await router.replace({
        name: "/conversation/import/[importSlugId]",
        params: { importSlugId: response.importSlugId },
      });
    } catch (error: unknown) {
      // Handle backend errors (org restriction, validation failures, etc.)
      const axiosError = error as { code?: AxiosErrorCode };
      handleAxiosErrorStatusCodes({
        axiosErrorCode: axiosError.code ?? "ERR_BAD_RESPONSE",
        defaultMessage: "Error while importing conversation from CSV",
      });
      // Don't clear the draft on error - let user fix and retry
    }
  } else {
    // URL Import - use the URL endpoint
    const response = await importConversation({
      polisUrl: conversationDraft.value.importSettings.polisUrl,
      postAsOrganizationName: conversationDraft.value.postAs.organizationName,
      targetIsoConvertDateString: conversationDraft.value
        .privateConversationSettings.hasScheduledConversion
        ? conversationDraft.value.privateConversationSettings.conversionDate.toISOString()
        : undefined,
      isIndexed: !conversationDraft.value.isPrivate,
      isLoginRequired: conversationDraft.value.requiresLogin,
      requiresEventTicket: conversationDraft.value.requiresEventTicket,
    });

    if (response.status === "success") {
      conversationDraft.value = createEmptyDraft();
      // URL import is now async - redirect to import status page to poll for completion
      await router.replace({
        name: "/conversation/import/[importSlugId]",
        params: { importSlugId: response.data.importSlugId },
      });
    } else {
      handleAxiosErrorStatusCodes({
        axiosErrorCode: response.code,
        defaultMessage: "Error while trying to import conversation from Polis",
      });
    }
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
    } else if (
      conversationDraft.value.importSettings.importType === "csv-import"
    ) {
      // CSV validation failed - scroll to the upload component
      scrollToCsvUpload();
    }
    return;
  }

  isSubmitButtonLoading.value = true;
  try {
    if (conversationDraft.value.importSettings.importType !== null) {
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
  font-weight: var(--font-weight-medium);
  line-height: 1.5;
}
</style>
