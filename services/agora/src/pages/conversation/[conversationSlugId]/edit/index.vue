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
        v-model:post-as="postAs"
        v-model:import-settings="importSettings"
        v-model:external-source-config="externalSourceConfig"
        v-model:title="title"
        v-model:content="content"
        v-model:conversation-type="conversationType"
        v-model:ai-labeling-enabled="aiLabelingEnabled"
        v-model:preferred-opinion-group-count="preferredOpinionGroupCount"
        :is-edit-mode="true"
        :can-add-event-ticket="canAddEventTicket"
        :can-change-event-ticket="canChangeEventTicket"
        :can-remove-event-ticket="canRemoveEventTicket"
        :can-use-analysis-variants-preference="canUseAnalysisVariantsPreference"
      />

      <ZKCard
        v-if="showPremiumEditRestrictedBanner"
        class="premium-restricted-banner"
        padding="1rem"
      >
        <q-icon name="mdi-lock-alert-outline" class="premium-restricted-icon" />
        <span>{{ t("premiumEditRestrictedBanner") }}</span>
      </ZKCard>

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
            v-model:plain-text="titlePlainText"
            :placeholder="t('titlePlaceholder')"
            :show-toolbar="false"
            :single-line="true"
            :disabled="!canEditConversationContent"
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
              v-model:plain-text="contentPlainText"
              :placeholder="t('bodyPlaceholder')"
              min-height="5rem"
              :show-toolbar="true"
              :single-line="false"
              :disabled="!canEditConversationContent"
              :max-length="MAX_LENGTH_CONVERSATION_BODY"
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
import { MAX_LENGTH_CONVERSATION_BODY, MAX_LENGTH_TITLE } from "src/shared/shared";
import type { GetConversationForEditResponse } from "src/shared/types/dto";
import type {
  ParticipationMode,
  PreferredOpinionGroupCount,
  SurveyConfig,
} from "src/shared/types/zod";
import { useBackendPostEditApi } from "src/utils/api/post/postEdit";
import { useUpdateConversationMutation } from "src/utils/api/post/useConversationMutations";
import { getConversationEditReturnPath } from "src/utils/router/conversationEditReturn";
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
const titlePlainText = ref("");

type EditPermissions = Extract<
  GetConversationForEditResponse,
  { success: true }
>["editPermissions"];
const editPermissions = ref<EditPermissions | null>(null);

const titleInputRef = ref<HTMLDivElement>();

// Store original state to detect changes
const originalState = ref<{
  title: string;
  content: string;
  isPrivate: boolean;
  participationMode: ParticipationMode;
  requiresEventTicket: string | undefined;
  aiLabelingEnabled: boolean;
  preferredOpinionGroupCount: PreferredOpinionGroupCount;
  surveyConfig: SurveyConfig | null;
}>({
  title: "",
  content: "",
  isPrivate: false,
  participationMode: "account_required",
  requiresEventTicket: undefined,
  aiLabelingEnabled: true,
  preferredOpinionGroupCount: null,
  surveyConfig: null,
});

const responseSurveyButtonLabel = computed(() => {
  return originalState.value.surveyConfig === null
    ? t("createSurveyButton")
    : t("editSurveyButton");
});
const isSurveyFeatureAllowed = computed(() => {
  return (
    editPermissions.value?.canEditSurvey === true ||
    (originalState.value.surveyConfig !== null &&
      editPermissions.value?.canDeleteSurvey === true)
  );
});
const canEditConversationContent = computed(() => {
  return editPermissions.value?.canEditConversationContent ?? true;
});
const canAddEventTicket = computed(() => {
  return editPermissions.value?.canAddEventTicket ?? true;
});
const canChangeEventTicket = computed(() => {
  return editPermissions.value?.canChangeEventTicket ?? true;
});
const canRemoveEventTicket = computed(() => {
  return editPermissions.value?.canRemoveEventTicket ?? true;
});
const canUseAnalysisVariantsPreference = computed(() => {
  return editPermissions.value?.canUseAnalysisVariantsPreference ?? false;
});
const showPremiumEditRestrictedBanner = computed(() => {
  return (editPermissions.value?.restrictedPremiumFeatures.length ?? 0) > 0;
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

  if (aiLabelingEnabled.value !== originalState.value.aiLabelingEnabled) {
    return true;
  }

  if (
    preferredOpinionGroupCount.value !==
    originalState.value.preferredOpinionGroupCount
  ) {
    return true;
  }

  return false;
});

// Use conversation draft composable (no store sync for edit page)
const {
  title,
  content,
  contentPlainText,
  isPrivate,
  participationMode,
  requiresEventTicket,
  aiLabelingEnabled,
  preferredOpinionGroupCount,
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
      conversationBodyPlainText: contentPlainText.value,
      isIndexed: !isPrivate.value,
      participationMode: participationMode.value,
      requiresEventTicket: requiresEventTicket.value,
      aiLabelingEnabled: aiLabelingEnabled.value,
      preferredOpinionGroupCount: preferredOpinionGroupCount.value,
    });

    if (response.success) {
      showNotifyMessage(t("updateSuccess"));
      const returnPath = getConversationEditReturnPath({
        conversationSlugId,
        returnTo: route.query.returnTo,
      });
      await router.push(returnPath);
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
        case "premium_access_expired": {
          errorMsg = t("premiumAccessExpiredError");
          break;
        }
        case "premium_access_required": {
          errorMsg = t("premiumAccessRequiredError");
          break;
        }
        case "plain_text_too_long":
        case "html_too_long": {
          errorMsg = t("updateError");
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
    query: route.query,
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

    initializeFromData({
      title: response.conversationTitle,
      content: response.conversationBody ?? "",
      contentPlainText: "",
      isPrivate: !response.isIndexed,
      participationMode: response.participationMode,
      requiresEventTicket: response.requiresEventTicket,
      aiLabelingEnabled: response.aiLabelingEnabled,
      preferredOpinionGroupCount: response.preferredOpinionGroupCount,
      surveyConfig: response.surveyConfig ?? null,
    });
    editPermissions.value = response.editPermissions;

    // Store original state for change detection
    originalState.value = {
      title: response.conversationTitle,
      content: response.conversationBody ?? "",
      isPrivate: !response.isIndexed,
      participationMode: response.participationMode,
      requiresEventTicket: response.requiresEventTicket,
      aiLabelingEnabled: response.aiLabelingEnabled,
      preferredOpinionGroupCount: response.preferredOpinionGroupCount,
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
.title-editor,
.editor-style {
  border: 1px solid #e0e0e0;
  border-radius: 6px;
}

.editor-style {
  margin-bottom: 2rem;
  font-size: 1rem;
}

.contentFlexStyle {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.premium-restricted-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: $color-text-weak;
}

.premium-restricted-icon {
  color: $warning;
  font-size: 1.25rem;
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
