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
            :loading="isSaving"
            :disabled="isSaveDisabled"
            @click="saveSurvey"
          />
        </template>
      </DefaultMenuBar>
    </Teleport>

    <PageLoadingSpinner v-if="isLoading" />

    <div v-else class="container">
      <SurveyConfigEditor
        v-model:survey-config="surveyConfig"
        body-card
        :texts="surveyEditorTexts"
        :display-language="locale"
        :original-survey-config="originalSurveyConfig"
        :show-validation-errors="surveyValidationErrorMessage !== null"
        @clear-validation-error="clearSurveyValidationError"
      >
        <template #between-intro-and-editor>
          <ZKCard padding="1rem" class="summary-card">
            <div class="summary-card__title">{{ t("changeSummaryTitle") }}</div>
            <div v-if="hasAnySummaryChanges" class="summary-card__list">
              <div>{{ t("addedQuestions", { count: changeSummary.addedQuestionCount }) }}</div>
              <div>{{ t("removedQuestions", { count: changeSummary.removedQuestionCount }) }}</div>
              <div>{{ t("updatedQuestions", { count: changeSummary.updatedQuestionCount }) }}</div>
              <div>{{ t("addedOptions", { count: changeSummary.addedOptionCount }) }}</div>
              <div>{{ t("removedOptions", { count: changeSummary.removedOptionCount }) }}</div>
              <div>{{ t("updatedOptions", { count: changeSummary.updatedOptionCount }) }}</div>
            </div>

            <div v-else class="summary-card__empty">{{ t("noChangesSummary") }}</div>
          </ZKCard>

          <SurveyCompletionCountsCard
            v-if="completionCountsQuery.data.value !== undefined"
            :has-survey="completionCountsQuery.data.value.hasSurvey"
            :counts="completionCountsQuery.data.value.counts"
          />
        </template>

        <template #actions>
          <q-btn
            v-if="originalSurveyConfig !== null"
            flat
            no-caps
            color="negative"
            :label="t('deleteButton')"
            :loading="isDeleting"
            @click="requestDeleteSurvey"
          />
        </template>
      </SurveyConfigEditor>
    </div>

    <ZKConfirmDialog
      v-model="showDeleteDialog"
      :message="t('confirmDeleteMessage')"
      :confirm-text="t('deleteButton')"
      :cancel-text="t('cancelLabel')"
      variant="destructive"
      @confirm="deleteSurvey"
    />
  </NewConversationLayout>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import Button from "primevue/button";
import BackButton from "src/components/navigation/buttons/BackButton.vue";
import DefaultMenuBar from "src/components/navigation/header/DefaultMenuBar.vue";
import NewConversationLayout from "src/components/newConversation/NewConversationLayout.vue";
import SurveyCompletionCountsCard from "src/components/survey/SurveyCompletionCountsCard.vue";
import SurveyConfigEditor from "src/components/survey/SurveyConfigEditor.vue";
import PageLoadingSpinner from "src/components/ui/PageLoadingSpinner.vue";
import ZKCard from "src/components/ui-library/ZKCard.vue";
import ZKConfirmDialog from "src/components/ui-library/ZKConfirmDialog.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { SurveyConfig } from "src/shared/types/zod";
import {
  checkFeatureManagementAccess,
  DEFAULT_FEATURE_ALLOWED_ORGS,
  DEFAULT_FEATURE_ALLOWED_USERS,
} from "src/shared-app-api/featureAccess";
import { useAuthenticationStore } from "src/stores/authentication";
import { useBackendPostEditApi } from "src/utils/api/post/postEdit";
import {
  useSurveyCompletionCountsQuery,
  useSurveyConfigDeleteMutation,
  useSurveyConfigUpdateMutation,
} from "src/utils/api/survey/useSurveyQueries";
import { processEnv } from "src/utils/processEnv";
import { getSingleRouteParam } from "src/utils/router/params";
import {
  areSurveyConfigsEqual,
  buildSurveyConfigForSave,
  cloneSurveyConfig,
  summarizeSurveyConfigChanges,
} from "src/utils/survey/config";
import { useNotify } from "src/utils/ui/notify";
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { type EditSurveyTranslations, editSurveyTranslations } from "./index.i18n";

defineOptions({
  components: {
    PrimeButton: Button,
  },
});

const { t, locale } = useComponentI18n<EditSurveyTranslations>(editSurveyTranslations);
const { showNotifyMessage } = useNotify();
const route = useRoute();
const router = useRouter();
const { userId } = storeToRefs(useAuthenticationStore());
const { getConversationForEdit } = useBackendPostEditApi();

const conversationSlugId = getSingleRouteParam(route.params.conversationSlugId);
const isLoading = ref(true);
const isSaving = ref(false);
const isDeleting = ref(false);
const showDeleteDialog = ref(false);
const surveyConfig = ref<SurveyConfig | null>(null);
const originalSurveyConfig = ref<SurveyConfig | null>(null);
const surveyValidationErrorMessage = ref<string | null>(null);

const completionCountsQuery = useSurveyCompletionCountsQuery({
  conversationSlugId: computed(() => conversationSlugId),
  enabled: computed(() => !isLoading.value),
});
const updateSurveyConfigMutation = useSurveyConfigUpdateMutation({
  conversationSlugId: computed(() => conversationSlugId),
});
const deleteSurveyConfigMutation = useSurveyConfigDeleteMutation({
  conversationSlugId: computed(() => conversationSlugId),
});
const hasUnsavedChanges = computed(() => {
  return !areSurveyConfigsEqual({
    left: originalSurveyConfig.value,
    right: surveyConfig.value,
  });
});
const isSaveDisabled = computed(() => {
  return (
    isLoading.value ||
    isSaving.value ||
    isDeleting.value ||
    !hasUnsavedChanges.value
  );
});
const changeSummary = computed(() => {
  return summarizeSurveyConfigChanges({
    previousSurveyConfig: originalSurveyConfig.value,
    nextSurveyConfig: surveyConfig.value,
  });
});
const hasAnySummaryChanges = computed(() => {
  return (
    changeSummary.value.addedQuestionCount > 0 ||
    changeSummary.value.removedQuestionCount > 0 ||
    changeSummary.value.updatedQuestionCount > 0 ||
    changeSummary.value.addedOptionCount > 0 ||
    changeSummary.value.removedOptionCount > 0 ||
    changeSummary.value.updatedOptionCount > 0
  );
});
const surveyEditorTexts = computed(() => ({
  title: t("title"),
  description: t("description"),
  optionalSurveyToggleLabel: t("optionalSurveyToggleLabel"),
  optionalSurveyToggleHint: t("optionalSurveyToggleHint"),
  requiredSurveyToggleHint: t("requiredSurveyToggleHint"),
  noQuestionsTitle: t("noSurveyTitle"),
  noQuestionsDescription: t("noSurveyDescription"),
  questionTitle: ({ number }: { number: number }) =>
    t("questionTitle", { number }),
  optionalLabel: t("optionalLabel"),
  requiredLabel: t("requiredLabel"),
  removeQuestionLabel: t("removeLabel"),
  questionTypeLabel: t("questionTypeLabel"),
  typeChoice: t("typeChoice"),
  typeFreeText: t("typeFreeText"),
  choiceDisplayLabel: t("choiceDisplayLabel"),
  choiceDisplayAuto: t("choiceDisplayAuto"),
  choiceDisplayList: t("choiceDisplayList"),
  choiceDisplayDropdown: t("choiceDisplayDropdown"),
  questionPromptLabel: t("questionPromptLabel"),
  questionRequirementDisabledHint: t("questionRequirementDisabledHint"),
  minSelectionsLabel: t("minSelectionsLabel"),
  maxSelectionsLabel: t("maxSelectionsLabel"),
  minTextLengthLabel: t("minTextLengthLabel"),
  maxTextLengthLabel: t("maxTextLengthLabel"),
  optionLabel: ({ number }: { number: number }) => t("optionLabel", { number }),
  addOptionLabel: t("addOptionLabel"),
  addQuestionLabel: t("addQuestionLabel"),
  cancelLabel: t("cancelLabel"),
  confirmRemoveQuestionMessage: t("confirmRemoveQuestionMessage"),
  confirmRemoveOptionMessage: t("confirmRemoveOptionMessage"),
  confirmRemoveQuestionButtonLabel: t("confirmRemoveQuestionButtonLabel"),
  confirmRemoveOptionButtonLabel: t("confirmRemoveOptionButtonLabel"),
  largeOptionCountWarning: ({
    count,
    threshold,
  }: {
    count: number;
    threshold: number;
  }) => t("largeOptionCountWarning", { count, threshold }),
  questionSemanticChangeLabel: t("questionSemanticChangeLabel"),
  questionSemanticChangeHint: t("questionSemanticChangeHint"),
  optionSemanticChangeLabel: t("optionSemanticChangeLabel"),
  optionSemanticChangeHint: t("optionSemanticChangeHint"),
}));

onMounted(async () => {
  const response = await getConversationForEdit(conversationSlugId);

  if (!response.success) {
    showNotifyMessage(t("loadError"));
    await router.replace({
      name: "/conversation/[conversationSlugId]/edit/",
      params: { conversationSlugId },
    });
    return;
  }

  const surveyAccess = checkFeatureManagementAccess({
    hasExistingFeature: response.surveyConfig !== null,
    featureEnabled: processEnv.VITE_SURVEY_ENABLED === "true",
    isOrgOnly: processEnv.VITE_IS_SURVEY_ORG_ONLY === "true",
    allowedOrgs:
      processEnv.VITE_SURVEY_ALLOWED_ORGS ?? DEFAULT_FEATURE_ALLOWED_ORGS,
    allowedUsers:
      processEnv.VITE_SURVEY_ALLOWED_USERS ?? DEFAULT_FEATURE_ALLOWED_USERS,
    postAsOrganization: response.postAsOrganizationName !== undefined,
    organizationName: response.postAsOrganizationName ?? "",
    userId: userId.value ?? "",
  });
  if (!surveyAccess.allowed) {
    await router.replace({
      name: "/conversation/[conversationSlugId]/edit/",
      params: { conversationSlugId },
    });
    return;
  }

  surveyConfig.value = cloneSurveyConfig({
    surveyConfig: response.surveyConfig ?? null,
  });
  originalSurveyConfig.value = cloneSurveyConfig({
    surveyConfig: response.surveyConfig ?? null,
  });
  isLoading.value = false;
});

function clearSurveyValidationError(): void {
  surveyValidationErrorMessage.value = null;
}

function showSurveyValidationError(): void {
  surveyValidationErrorMessage.value = t("validationError");
}

async function redirectToConversation(): Promise<void> {
  await router.replace({
    name: "/conversation/[postSlugId]/",
    params: { postSlugId: conversationSlugId },
  });
}

function requestDeleteSurvey(): void {
  showDeleteDialog.value = true;
}

async function saveSurvey(): Promise<void> {
  const normalizedSurveyConfigResult = buildSurveyConfigForSave({
    surveyConfig: surveyConfig.value,
  });
  if (!normalizedSurveyConfigResult.success) {
    showNotifyMessage(t("validationError"));
    showSurveyValidationError();
    return;
  }

  if (normalizedSurveyConfigResult.surveyConfig === null) {
    if (originalSurveyConfig.value !== null) {
      requestDeleteSurvey();
      return;
    }

    await redirectToConversation();
    return;
  }

  isSaving.value = true;

  try {
    await updateSurveyConfigMutation.mutateAsync({
      surveyConfig: normalizedSurveyConfigResult.surveyConfig,
    });
  } catch {
    isSaving.value = false;
    showNotifyMessage(t("saveError"));
    return;
  }

  isSaving.value = false;

  originalSurveyConfig.value = cloneSurveyConfig({
    surveyConfig: normalizedSurveyConfigResult.surveyConfig,
  });
  surveyConfig.value = cloneSurveyConfig({
    surveyConfig: normalizedSurveyConfigResult.surveyConfig,
  });
  await redirectToConversation();
}

async function deleteSurvey(): Promise<void> {
  isDeleting.value = true;

  try {
    await deleteSurveyConfigMutation.mutateAsync();
  } catch {
    isDeleting.value = false;
    showNotifyMessage(t("deleteError"));
    return;
  }

  isDeleting.value = false;

  surveyConfig.value = null;
  originalSurveyConfig.value = null;
  await redirectToConversation();
}
</script>

<style scoped lang="scss">
.container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-bottom: 1rem;
  padding-top: 0.5rem;
}

.summary-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.summary-card__title {
  font-size: 1rem;
  font-weight: 600;
}

.summary-card__empty {
  color: #6b7280;
  line-height: 1.4;
}

.summary-card__list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
</style>
