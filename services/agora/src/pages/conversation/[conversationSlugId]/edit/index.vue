<template>
  <NewConversationLayout v-slot="{ isActive }">
    <Teleport v-if="isActive" to="#page-header">
      <DefaultMenuBar :click-to-scroll-top="false">
        <template #left>
          <BackButton />
        </template>
        <template #right>
          <PrimeButton
            :label="t('saveButton')"
            :loading="isSaveButtonLoading"
            :disabled="isSaveButtonLoading || !isDataLoaded || !hasUnsavedChanges || isTitleOverLimit || isBodyOverLimit"
            @click="onSave()"
          />
        </template>
      </DefaultMenuBar>
    </Teleport>

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

    <PageLoadingSpinner v-else-if="!isDataLoaded" />

    <div v-else class="container">
      <NewConversationControlBar
        v-model:is-private="isPrivate"
        v-model:participation-mode="participationMode"
        v-model:requires-event-ticket="requiresEventTicket"
        v-model:private-conversation-settings="privateConversationSettings"
        v-model:post-as="postAs"
        v-model:import-settings="importSettings"
        v-model:external-source-config="externalSourceConfig"
        v-model:title="title"
        v-model:content="content"
        v-model:conversation-type="conversationType"
        :is-edit-mode="true"
      />

        <div class="contentFlexStyle">
          <div v-if="isSurveyFeatureAllowed" class="surveyActionRow">
            <q-btn
              flat
              no-caps
              color="primary"
              :label="responseSurveyButtonLabel"
              @click="openSurveyEditor"
            />
          </div>

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
            :show-character-count="true"
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
              :show-character-count="true"
              @update:model-value="updateContent"
              @update:is-over-limit="(v: boolean) => (isBodyOverLimit = v)"
            />
          </div>

        </div>
      </div>
    </div>
  </NewConversationLayout>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import Button from "primevue/button";
import Editor from "src/components/editor/Editor.vue";
import BackButton from "src/components/navigation/buttons/BackButton.vue";
import DefaultMenuBar from "src/components/navigation/header/DefaultMenuBar.vue";
import NewConversationControlBar from "src/components/newConversation/NewConversationControlBar.vue";
import NewConversationLayout from "src/components/newConversation/NewConversationLayout.vue";
import PageLoadingSpinner from "src/components/ui/PageLoadingSpinner.vue";
import ZKCard from "src/components/ui-library/ZKCard.vue";
import {
  useConversationDraft,
  type ValidationErrorField,
} from "src/composables/conversation/draft";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { MAX_LENGTH_BODY, MAX_LENGTH_TITLE } from "src/shared/shared";
import type { ParticipationMode, SurveyConfig } from "src/shared/types/zod";
import {
  checkFeatureManagementAccess,
  DEFAULT_FEATURE_ALLOWED_ORGS,
  DEFAULT_FEATURE_ALLOWED_USERS,
} from "src/shared-app-api/featureAccess";
import { useAuthenticationStore } from "src/stores/authentication";
import { useBackendPostEditApi } from "src/utils/api/post/postEdit";
import { useUpdateConversationMutation } from "src/utils/api/post/useConversationMutations";
import { processEnv } from "src/utils/processEnv";
import { getSingleRouteParam } from "src/utils/router/params";
import { useNotify } from "src/utils/ui/notify";
import { computed, nextTick, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import {
  type EditConversationTranslations,
  editConversationTranslations,
} from "./index.i18n";

defineOptions({
  components: {
    PrimeButton: Button,
  },
});

const { t } = useComponentI18n<EditConversationTranslations>(
  editConversationTranslations
);

const route = useRoute();
const router = useRouter();
const { userId } = storeToRefs(useAuthenticationStore());
const { showNotifyMessage } = useNotify();
const { getConversationForEdit } = useBackendPostEditApi();
const updateMutation = useUpdateConversationMutation();

const conversationSlugId = getSingleRouteParam(route.params.conversationSlugId);

const isSaveButtonLoading = ref(false);
const isTitleOverLimit = ref(false);
const isBodyOverLimit = ref(false);
const isDataLoaded = ref(false);
const loadError = ref(false);
const errorTitle = ref("");
const errorMessage = ref("");

const surveyPostAsOrganizationName = ref<string | undefined>(undefined);

const titleInputRef = ref<HTMLDivElement>();

// Store original state to detect changes
const originalState = ref<{
  title: string;
  content: string;
  isPrivate: boolean;
  participationMode: ParticipationMode;
  requiresEventTicket: string | undefined;
  privateConversationSettings: {
    hasScheduledConversion: boolean;
    conversionDate: Date;
  };
  surveyConfig: SurveyConfig | null;
}>({
  title: "",
  content: "",
  isPrivate: false,
  participationMode: "account_required",
  requiresEventTicket: undefined,
  privateConversationSettings: {
    hasScheduledConversion: false,
    conversionDate: new Date(),
  },
  surveyConfig: null,
});

const responseSurveyButtonLabel = computed(() => {
  return originalState.value.surveyConfig === null
    ? t("createSurveyButton")
    : t("editSurveyButton");
});
const isSurveyFeatureAllowed = computed(() => {
  const result = checkFeatureManagementAccess({
    hasExistingFeature: originalState.value.surveyConfig !== null,
    featureEnabled: processEnv.VITE_SURVEY_ENABLED === "true",
    isOrgOnly: processEnv.VITE_IS_SURVEY_ORG_ONLY === "true",
    allowedOrgs:
      processEnv.VITE_SURVEY_ALLOWED_ORGS ?? DEFAULT_FEATURE_ALLOWED_ORGS,
    allowedUsers:
      processEnv.VITE_SURVEY_ALLOWED_USERS ?? DEFAULT_FEATURE_ALLOWED_USERS,
    postAsOrganization: surveyPostAsOrganizationName.value !== undefined,
    organizationName: surveyPostAsOrganizationName.value ?? "",
    userId: userId.value ?? "",
  });

  return result.allowed;
});

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
    participationMode.value !== originalState.value.participationMode
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

  return false;
});

// Use conversation draft composable (no store sync for edit page)
const {
  title,
  content,
  isPrivate,
  participationMode,
  requiresEventTicket,
  privateConversationSettings,
  postAs,
  importSettings,
  externalSourceConfig,
  conversationType,
  validationState,
  validateTitle,
  validateBody,
  updateTitle,
  updateContent,
  initializeFromData,
} = useConversationDraft({ syncToStore: false });

async function scrollToTitleInput() {
  await nextTick();
  titleInputRef.value?.scrollIntoView({
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

  return { isValid: true };
}

async function performSave(): Promise<void> {
  try {
    const response = await updateMutation.mutateAsync({
      conversationSlugId: conversationSlugId,
      conversationTitle: title.value,
      conversationBody: content.value,
      isIndexed: !isPrivate.value,
      participationMode: participationMode.value,
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
  await performSave();
}

async function openSurveyEditor(): Promise<void> {
  await router.push({
    name: "/conversation/[conversationSlugId]/edit/survey/",
    params: { conversationSlugId },
  });
}

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
      isPrivate: !response.isIndexed,
      participationMode: response.participationMode,
      requiresEventTicket: response.requiresEventTicket,
      privateConversationSettings: {
        hasScheduledConversion: !!response.indexConversationAt,
        conversionDate: response.indexConversationAt
          ? new Date(response.indexConversationAt)
          : tomorrow,
      },
      surveyConfig: response.surveyConfig ?? null,
    });
    surveyPostAsOrganizationName.value = response.postAsOrganizationName;

    // Store original state for change detection
    originalState.value = {
      title: response.conversationTitle,
      content: response.conversationBody ?? "",
      isPrivate: !response.isIndexed,
      participationMode: response.participationMode,
      requiresEventTicket: response.requiresEventTicket,
      privateConversationSettings: {
        hasScheduledConversion: !!response.indexConversationAt,
        conversionDate: response.indexConversationAt
          ? new Date(response.indexConversationAt)
          : tomorrow,
      },
      surveyConfig: response.surveyConfig ?? null,
    };

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

</style>
