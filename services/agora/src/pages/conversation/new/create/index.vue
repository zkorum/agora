<template>
  <NewConversationLayout v-slot="{ isActive }">
    <Teleport v-if="isActive && !isNavigatingAway" to="#page-header">
      <DefaultMenuBar :click-to-scroll-top="false">
        <template #left>
          <BackButton :fallback-route="{ name: '/' }" />
        </template>
        <template #right>
          <PrimeButton
            :label="
              isSubmitButtonLoading
                ? t('importButton')
                : conversationDraft.importSettings.importType !== null
                  ? t('importButton')
                  : t('nextButton')
            "
            :loading="isSubmitButtonLoading"
            :disabled="isSubmitButtonLoading || hasActiveImport || isTitleOverLimit || isBodyOverLimit || isManualTitleEmpty"
            @click="onSubmit()"
          />
        </template>
      </DefaultMenuBar>
    </Teleport>

    <div class="container">
      <NewConversationControlBar
        v-model:is-private="isPrivate"
        v-model:participation-mode="participationMode"
        v-model:requires-event-ticket="requiresEventTicket"
        v-model:post-as="postAs"
        v-model:conversation-type-config="conversationTypeConfig"
        v-model:import-settings="importSettings"
        v-model:external-source-config="externalSourceConfig"
        v-model:title="title"
        v-model:content="content"
        v-model:multilingual-setting="multilingualSetting"
        v-model:ai-labeling-enabled="aiLabelingEnabled"
        v-model:preferred-opinion-group-count="preferredOpinionGroupCount"
        :hide-language-setting="selectedProjectSlug !== undefined"
      >
        <template #extra-controls>
          <CreateConversationProjectLanguageSettings
            v-if="projectLanguageProjects.length > 0"
            v-model:selected-project-slug="selectedProjectSlug"
            v-model:inherit-project-languages="inheritProjectLanguages"
            v-model:override-multilingual-setting="multilingualSetting"
            :project-list="projectLanguageProjects"
          />
        </template>
      </NewConversationControlBar>

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
        <!-- GitHub config fields (inline) -->
        <div
          v-if="externalSourceConfig !== null"
          class="github-config-section"
        >
          <div class="github-config-header">
            <q-icon name="mdi-github" size="1.2rem" />
            <span>{{ t("githubConfig") }}</span>
          </div>
          <div class="github-config-fields">
            <div class="github-field">
              <label class="github-field-label">{{ t("githubRepository") }}</label>
              <input
                v-model="externalSourceConfig.repository"
                type="text"
                class="github-field-input"
                :placeholder="t('githubRepositoryPlaceholder')"
              />
            </div>
            <div class="github-field">
              <label class="github-field-label">{{ t("githubLabel") }}</label>
              <input
                v-model="externalSourceConfig.label"
                type="text"
                class="github-field-input"
                :placeholder="t('githubLabelPlaceholder')"
              />
            </div>
          </div>
        </div>

        <div
          v-if="conversationDraft.importSettings.importType === null"
          ref="titleInputRef"
        >
          <div v-if="showTitleError" class="titleErrorMessage">
            <q-icon name="mdi-alert-circle" class="titleErrorIcon" />
            {{ t('titleRequired') }}
          </div>

          <Editor
            v-model="title"
            v-model:plain-text="titlePlainText"
            :placeholder="t('titlePlaceholder')"
            :show-toolbar="false"
            :single-line="true"
            :disabled="false"
            :max-length="MAX_LENGTH_TITLE"
            :show-character-count="true"
            min-height="auto"
            class="title-editor"
            @update:model-value="updateTitle"
            @update:is-over-limit="(v: boolean) => (isTitleOverLimit = v)"
          />
        </div>
        <div v-else class="import-section">
          <PolisUrlInput
            v-if="conversationDraft.importSettings.importType === 'polis-url'"
            ref="polisUrlInputRef"
            v-model="importSettings.polisUrl"
            v-model:validation-error="validationState.polisUrl.error"
            v-model:show-validation-error="validationState.polisUrl.showError"
          />
          <PolisCsvUpload
            v-else-if="
              conversationDraft.importSettings.importType === 'csv-import'
            "
            ref="polisCsvUploadRef"
            v-model:csv-file-metadata="
              importSettings.csvFileMetadata
            "
          />
        </div>

        <div v-if="conversationDraft.importSettings.importType === null">
          <div class="editor-style">
            <Editor
              v-model="content"
              v-model:plain-text="contentPlainText"
              :placeholder="t('bodyPlaceholder')"
              min-height="5rem"
              :show-toolbar="true"
              :single-line="false"
              :disabled="false"
              :max-length="MAX_LENGTH_CONVERSATION_BODY"
              :show-character-count="true"
              @update:model-value="updateContent"
              @update:is-over-limit="(v: boolean) => (isBodyOverLimit = v)"
            />
          </div>
        </div>
      </div>
    </div>

    <NewConversationRouteGuard
      ref="routeGuardRef"
      :allowed-routes="['/conversation/new/seed/']"
      :has-unsaved-changes="isDraftModified"
      :reset-draft="resetDraft"
    />

    <PreParticipationIntentionDialog
      v-model="showLoginDialog"
      :ok-callback="onLoginCallback"
      active-intention="newConversation"
    />
  </NewConversationLayout>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import Button from "primevue/button";
import PreParticipationIntentionDialog from "src/components/authentication/intention/PreParticipationIntentionDialog.vue";
import ActiveImportBanner from "src/components/conversation/import/ActiveImportBanner.vue";
import BackButton from "src/components/navigation/buttons/BackButton.vue";
import DefaultMenuBar from "src/components/navigation/header/DefaultMenuBar.vue";
import type { CreateConversationProjectLanguageProject } from "src/components/newConversation/CreateConversationProjectLanguageSettings.vue";
import CreateConversationProjectLanguageSettings from "src/components/newConversation/CreateConversationProjectLanguageSettings.vue";
import PolisCsvUpload from "src/components/newConversation/import/csv/PolisCsvUpload.vue";
import PolisUrlInput from "src/components/newConversation/import/url/PolisUrlInput.vue";
import NewConversationControlBar from "src/components/newConversation/NewConversationControlBar.vue";
import NewConversationLayout from "src/components/newConversation/NewConversationLayout.vue";
import NewConversationRouteGuard from "src/components/newConversation/NewConversationRouteGuard.vue";
import {
  resolveSelectedOrganizationSlug,
  useConversationDraft,
  type ValidationErrorField,
} from "src/composables/conversation/draft";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { MAX_LENGTH_CONVERSATION_BODY, MAX_LENGTH_TITLE } from "src/shared/shared";
import type { GetConversationCreateProjectOptionsResponse } from "src/shared/types/dto";
import type { ConversationTypeConfig } from "src/shared/types/zod";
import { useAuthenticationStore } from "src/stores/authentication";
import { useLoginIntentionStore } from "src/stores/loginIntention";
import { useNewPostDraftsStore } from "src/stores/newConversationDrafts";
import { useUserStore } from "src/stores/user";
import { type AxiosErrorCode, useCommonApi } from "src/utils/api/common";
import { useActiveImportQuery } from "src/utils/api/conversationImport/useConversationImportQueries";
import { useBackendPostApi } from "src/utils/api/post/post";
import { isHistoryPathEqual } from "src/utils/nav/historyBack";
import { useNotify } from "src/utils/ui/notify";
import {
  computed,
  defineAsyncComponent,
  nextTick,
  onMounted,
  ref,
  watch,
} from "vue";
import { useRouter } from "vue-router";

import {
  type CreateConversationTranslations,
  createConversationTranslations,
} from "./index.i18n";

defineOptions({
  components: {
    PrimeButton: Button,
  },
});

const Editor = defineAsyncComponent(
  () => import("src/components/editor/Editor.vue")
);

type ProjectTargetFailureReason = Extract<
  GetConversationCreateProjectOptionsResponse,
  { success: false }
>["reason"];

const { t } = useComponentI18n<CreateConversationTranslations>(
  createConversationTranslations
);
const isNavigatingAway = ref(false);

// Use the conversation draft composable with store sync enabled
const {
  title,
  content,
  contentPlainText,
  multilingualSetting,
  selectedProjectSlug,
  inheritProjectLanguages,
  conversationType,
  rankingMode,
  isPrivate,
  participationMode,
  requiresEventTicket,
  aiLabelingEnabled,
  preferredOpinionGroupCount,
  postAs,
  importSettings,
  externalSourceConfig,
  validationState,
  validatePolisUrl,
  validateBody: validateBodyField,
  validateForReview,
  updateTitle,
  updateContent,
  isDraftModified,
  resetDraft,
} = useConversationDraft({ syncToStore: true });

const isSubmitButtonLoading = ref(false);
const isTitleOverLimit = ref(false);
const isBodyOverLimit = ref(false);
const titlePlainText = ref("");

function getConversationTypeConfig(): ConversationTypeConfig {
  if (conversationType.value === "ranking") {
    return {
      conversationType: "ranking",
      rankingMode: rankingMode.value ?? "bws",
    };
  }

  return { conversationType: "polis" };
}

const conversationTypeConfig = computed({
  get: getConversationTypeConfig,
  set: (value: ConversationTypeConfig) => {
    conversationType.value = value.conversationType;
    rankingMode.value =
      value.conversationType === "ranking" ? value.rankingMode : undefined;
  },
});

const isManualTitleEmpty = computed(
  () =>
    conversationDraft.value.importSettings.importType === null &&
    title.value.trim() === ""
);

const isTitleDirty = ref(false);

watch(title, (newTitle) => {
  if (newTitle.trim() !== "") {
    isTitleDirty.value = true;
  }
});

const showTitleError = computed(
  () => isTitleDirty.value && isManualTitleEmpty.value
);

const router = useRouter();

const {
  fetchConversationCreateProjectOptions,
  importConversation,
  importConversationFromCsv,
} = useBackendPostApi();
const projectLanguageProjects = ref<CreateConversationProjectLanguageProject[]>([]);
let projectOptionsRequestId = 0;

// Disable the warning since Vue template refs can be potentially null
// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
const routeGuardRef = ref<InstanceType<
  typeof NewConversationRouteGuard
> | null>(null);

// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
const polisUrlInputRef = ref<InstanceType<typeof PolisUrlInput> | null>(null);
// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
const polisCsvUploadRef = ref<InstanceType<typeof PolisCsvUpload> | null>(null);
const titleInputRef = ref<HTMLDivElement | null>(null);

const { conversationDraft } = storeToRefs(useNewPostDraftsStore());
const { profileData } = storeToRefs(useUserStore());

const { createNewConversationIntention } = useLoginIntentionStore();
const { isLoggedIn } = storeToRefs(useAuthenticationStore());
const { handleAxiosErrorStatusCodes } = useCommonApi();
const { showNotifyMessage } = useNotify();

const showLoginDialog = ref(false);

// Active import query - only enabled when logged in and on CSV import mode
const activeImportQuery = useActiveImportQuery({
  enabled: computed(
    () =>
      isLoggedIn.value &&
      conversationDraft.value.importSettings.importType === "csv-import"
  ),
});

watch(
  () => ({
    isLoggedIn: isLoggedIn.value,
    postAsOrganization: postAs.value.postAsOrganization,
    organizationName: postAs.value.organizationName,
    profileDataLoaded: profileData.value.dataLoaded,
    organizationList: profileData.value.organizationList,
  }),
  async ({
    isLoggedIn,
    postAsOrganization,
    organizationName,
    profileDataLoaded,
    organizationList,
  }) => {
    const requestId = ++projectOptionsRequestId;
    projectLanguageProjects.value = [];
    selectedProjectSlug.value = undefined;
    inheritProjectLanguages.value = false;

    if (
      !isLoggedIn ||
      !postAsOrganization ||
      organizationName === "" ||
      !profileDataLoaded
    ) {
      return;
    }

    const organizationSlug = resolveSelectedOrganizationSlug({
      organizationIdentifier: organizationName,
      organizationList,
    });
    if (organizationSlug === undefined) {
      postAs.value = {
        postAsOrganization: false,
        organizationName: "",
      };
      return;
    }

    if (organizationSlug !== organizationName) {
      postAs.value = {
        postAsOrganization: true,
        organizationName: organizationSlug,
      };
      return;
    }

    const response = await fetchConversationCreateProjectOptions({
      postAsOrganizationSlug: organizationSlug,
    });
    if (requestId !== projectOptionsRequestId) {
      return;
    }

    if (!response.success) {
      showProjectTargetFailure(response.reason);
      return;
    }

    projectLanguageProjects.value = response.projectList.map((project) => ({
      slug: project.projectSlug,
      title: project.projectTitle,
      defaultLanguageCode: project.defaultLanguageCode,
      languageSettings: project.languageSettings,
    }));
  },
  { immediate: true }
);

const hasActiveImport = computed(() => {
  return activeImportQuery.data.value?.hasActiveImport ?? false;
});

function showProjectTargetFailure(reason: ProjectTargetFailureReason): void {
  if (reason === "organization_not_available") {
    showNotifyMessage(t("organizationUnavailable"));
    return;
  }

  if (reason === "missing_conversation_create_capability") {
    showNotifyMessage(t("missingProjectCreateCapability"));
  }
}

function hasForwardSeedEntry(): boolean {
  return isHistoryPathEqual({
    historyPath: window.history.state?.forward,
    expectedPath: "/conversation/new/seed/",
  });
}

function normalizeCreateHistoryState(): void {
  if (!hasForwardSeedEntry()) {
    return;
  }

  router.options.history.replace(router.options.history.location, {
    ...router.options.history.state,
    forward: null,
  });
}

function onLoginCallback() {
  // Unlock route to prevent ExitRoutePrompt from showing
  // The user already saw "Your draft will be restored" in the login dialog
  routeGuardRef.value?.unlockRoute();
  createNewConversationIntention();
}

function scrollToTitleInput() {
  setTimeout(function () {
    titleInputRef.value?.scrollIntoView({
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
    const polisValidation = validatePolisUrl();
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
      scrollToTitleInput();
      break;
    case "body":
      validateBodyField();
      // Body validation errors are handled inline in the editor
      break;
    case "polisUrl":
      validatePolisUrl();
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
  const languageSettingsSource =
    conversationDraft.value.selectedProjectSlug !== undefined &&
    conversationDraft.value.inheritProjectLanguages
      ? "project_inherited"
      : "conversation_override";

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
        projectSlug: conversationDraft.value.selectedProjectSlug,
        languageSettingsSource,
        postAsOrganizationSlug: conversationDraft.value.postAs.organizationName,
        isIndexed: !conversationDraft.value.isPrivate,
        participationMode: conversationDraft.value.participationMode,
        multilingualSetting: conversationDraft.value.multilingualSetting,
        requiresEventTicket: conversationDraft.value.requiresEventTicket,
        aiLabelingEnabled: conversationDraft.value.aiLabelingEnabled,
        preferredOpinionGroupCount:
          conversationDraft.value.preferredOpinionGroupCount,
      });

      if (!response.success) {
        showProjectTargetFailure(response.reason);
        return;
      }

      resetDraft();
      // CSV import is async - redirect to import status page to poll for completion
      isNavigatingAway.value = true;
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
      projectSlug: conversationDraft.value.selectedProjectSlug,
      languageSettingsSource,
      postAsOrganizationSlug: conversationDraft.value.postAs.organizationName,
      isIndexed: !conversationDraft.value.isPrivate,
      participationMode: conversationDraft.value.participationMode,
      multilingualSetting: conversationDraft.value.multilingualSetting,
      requiresEventTicket: conversationDraft.value.requiresEventTicket,
      aiLabelingEnabled: conversationDraft.value.aiLabelingEnabled,
      preferredOpinionGroupCount:
        conversationDraft.value.preferredOpinionGroupCount,
    });

    if (response.status === "success") {
      if (!response.data.success) {
        showProjectTargetFailure(response.data.reason);
        return;
      }

      resetDraft();
      // URL import is now async - redirect to import status page to poll for completion
      isNavigatingAway.value = true;
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
  isNavigatingAway.value = true;
  await nextTick();
  await router.push({
    name: "/conversation/new/seed/",
  });
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

onMounted(() => {
  normalizeCreateHistoryState();
});
</script>

<style scoped lang="scss">
.title-editor,
.editor-style {
  border: 1px solid #e0e0e0;
  border-radius: 6px;
}

.editor-style {
  margin-bottom: 2rem;
  font-size: 1rem;
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
  padding-top: 0.5rem;
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

.github-config-section {
  background: white;
  border-radius: 20px;
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.github-config-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: var(--font-weight-medium);
  font-size: 0.95rem;
  color: #24292f;
}

.github-config-fields {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.github-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.github-field-label {
  font-size: 0.8rem;
  font-weight: var(--font-weight-medium);
  color: $color-text-weak;
}

.github-field-input {
  border: 1px solid #d8d6de;
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  font-size: 0.9rem;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;

  &:focus {
    border-color: $primary;
  }
}
</style>
