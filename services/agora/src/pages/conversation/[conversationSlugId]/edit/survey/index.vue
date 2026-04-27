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
      <ZKCard padding="1rem" class="intro-card">
        <div class="intro-card__title">{{ t("title") }}</div>
        <div class="intro-card__description">{{ t("description") }}</div>
        <q-toggle
          :model-value="isSurveyOptional"
          :label="t('optionalSurveyToggleLabel')"
          @update:model-value="(value) => updateSurveyOptional({ isOptional: value })"
        />
        <div class="intro-card__description">
          {{ isSurveyOptional ? t("optionalSurveyToggleHint") : t("requiredSurveyToggleHint") }}
        </div>
      </ZKCard>

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

      <div class="editor-card">
        <div v-if="surveyConfigValue === null || surveyConfigValue.questions.length === 0" class="empty-card">
          <div class="empty-card__title">{{ t("noSurveyTitle") }}</div>
          <div class="empty-card__description">{{ t("noSurveyDescription") }}</div>
        </div>

        <div v-for="(question, questionIndex) in surveyQuestions" :key="questionIndex" class="question-card">
          <div class="question-card__header">
            <div class="question-card__title">{{ t("questionTitle", { number: questionIndex + 1 }) }}</div>
            <q-btn
              flat
              no-caps
              color="negative"
              :label="t('removeLabel')"
              @click="requestRemoveQuestion({ questionIndex })"
            />
          </div>

          <q-select
            :model-value="question.questionType"
            outlined
            emit-value
            map-options
            :label="t('questionTypeLabel')"
            :options="questionTypeOptions"
            @update:model-value="(value) => updateQuestionType({ questionIndex, questionType: value })"
          />

          <q-select
            v-if="question.questionType !== 'free_text'"
            :model-value="question.choiceDisplay"
            outlined
            emit-value
            map-options
            :label="t('choiceDisplayLabel')"
            :options="choiceDisplayOptions"
            @update:model-value="(value) => updateQuestionChoiceDisplay({ questionIndex, choiceDisplay: value })"
          />

          <q-input
            :model-value="question.questionText"
            outlined
            autogrow
            :maxlength="500"
            :error="shouldShowQuestionTextError({ question })"
            :label="t('questionPromptLabel')"
            @update:model-value="(value) => updateQuestionText({ questionIndex, questionText: value })"
          />

          <div
            v-if="shouldShowQuestionSemanticToggle({ question })"
            class="semantic-change-block"
          >
            <q-toggle
              :model-value="question.textChangeIsSemantic === true"
              :label="t('questionSemanticChangeLabel')"
              @update:model-value="(value) => updateQuestionSemanticChange({ questionIndex, isSemantic: value === true })"
            />
            <div class="semantic-change-block__hint">
              {{ t("questionSemanticChangeHint") }}
            </div>
          </div>

          <q-toggle
            :model-value="isSurveyOptional ? false : question.isRequired"
            :disable="isSurveyOptional"
            :label="isSurveyOptional || !question.isRequired ? t('optionalLabel') : t('requiredLabel')"
            @update:model-value="(value) => updateQuestionRequired({ questionIndex, isRequired: value })"
          />
          <div v-if="isSurveyOptional" class="semantic-change-block__hint">
            {{ t("questionRequirementDisabledHint") }}
          </div>

          <div v-if="question.questionType === 'choice'" class="constraints-grid">
            <q-input
              :model-value="question.constraints.minSelections"
              v-bind="getChoiceConstraintInputAttrs({ optionCount: question.options.length })"
              outlined
              type="number"
              :label="t('minSelectionsLabel')"
              @update:model-value="(value) => updateChoiceConstraints({ questionIndex, minSelections: value, maxSelections: question.constraints.maxSelections })"
            />

            <q-input
              :model-value="question.constraints.maxSelections ?? ''"
              v-bind="getChoiceConstraintInputAttrs({ optionCount: question.options.length })"
              outlined
              type="number"
              :label="t('maxSelectionsLabel')"
              @update:model-value="(value) => updateChoiceConstraints({ questionIndex, minSelections: question.constraints.minSelections, maxSelections: value })"
            />
          </div>

          <div v-else-if="question.questionType === 'free_text'" class="constraints-stack">
            <q-select
              :model-value="question.constraints.type === 'free_text' ? question.constraints.inputMode : 'rich_text'"
              outlined
              emit-value
              map-options
              :label="templateTexts.answerFormatLabel"
              :options="freeTextInputModeOptions"
              @update:model-value="(value) => updateFreeTextInputMode({ questionIndex, inputMode: value })"
            />

            <div v-if="question.constraints.type === 'free_text' && question.constraints.inputMode === 'integer'" class="constraints-grid">
              <q-input
                :model-value="getIntegerConstraints({ constraints: question.constraints })?.minValue ?? 1"
                outlined
                type="number"
                :label="templateTexts.minValueLabel"
                @update:model-value="(value) => updateIntegerConstraints({ questionIndex, minValue: value, maxValue: getIntegerConstraints({ constraints: question.constraints })?.maxValue })"
              />

              <q-input
                :model-value="getIntegerConstraints({ constraints: question.constraints })?.maxValue ?? ''"
                outlined
                type="number"
                :label="templateTexts.maxValueLabel"
                @update:model-value="(value) => updateIntegerConstraints({ questionIndex, minValue: getIntegerConstraints({ constraints: question.constraints })?.minValue, maxValue: value })"
              />
            </div>

            <div v-else class="constraints-grid">
              <q-input
                :model-value="getRichTextConstraints({ constraints: question.constraints })?.minPlainTextLength ?? ''"
                outlined
                type="number"
                :label="t('minTextLengthLabel')"
                @update:model-value="(value) => updateRichTextConstraints({ questionIndex, minPlainTextLength: value, maxPlainTextLength: getRichTextConstraints({ constraints: question.constraints })?.maxPlainTextLength ?? 300 })"
              />

              <q-input
                :model-value="getRichTextConstraints({ constraints: question.constraints })?.maxPlainTextLength ?? 300"
                outlined
                type="number"
                :label="t('maxTextLengthLabel')"
                @update:model-value="(value) => updateRichTextConstraints({ questionIndex, minPlainTextLength: getRichTextConstraints({ constraints: question.constraints })?.minPlainTextLength, maxPlainTextLength: value })"
              />
            </div>

            <div class="semantic-change-block__hint">
              {{ question.constraints.type === 'free_text' && question.constraints.inputMode === 'integer' ? templateTexts.numericInputHelp : '' }}
            </div>
          </div>

          <div v-if="question.questionType !== 'free_text'" class="options-list">
            <div
              v-for="(option, optionIndex) in question.options ?? []"
              :id="getOptionInputId({ questionIndex, optionIndex })"
              :key="optionIndex"
              class="option-editor"
              @keydown.enter="handleOptionEditorEnter({ event: $event, questionIndex })"
            >
              <q-input
                :model-value="option.optionText"
                outlined
                :maxlength="200"
                :error="shouldShowOptionTextError({ question, option })"
                :label="t('optionLabel', { number: optionIndex + 1 })"
                @update:model-value="(value) => updateOptionText({ questionIndex, optionIndex, optionText: value })"
              >
                <template #append>
                  <q-btn
                    v-if="(question.options?.length ?? 0) > 2"
                    flat
                    round
                    dense
                    icon="mdi-close"
                    @click.stop="requestRemoveOption({ questionIndex, optionIndex })"
                  />
                </template>
              </q-input>

              <div
                v-if="shouldShowOptionSemanticToggle({ question, option })"
                class="semantic-change-block semantic-change-block--nested"
              >
                <q-toggle
                  :model-value="option.textChangeIsSemantic === true"
                  :label="t('optionSemanticChangeLabel')"
                  @update:model-value="(value) => updateOptionSemanticChange({ questionIndex, optionIndex, isSemantic: value === true })"
                />
                <div class="semantic-change-block__hint">
                  {{ t("optionSemanticChangeHint") }}
                </div>
              </div>
            </div>

            <q-btn flat no-caps color="primary" :label="t('addOptionLabel')" @click="addOption({ questionIndex })" />

            <ZKInfoBanner
              v-if="
                shouldShowLargeOptionWarning({
                  choiceDisplay: question.choiceDisplay,
                  optionCount: question.options?.length ?? 0,
                })
              "
              :message="
                t('largeOptionCountWarning', {
                  count: question.options?.length ?? 0,
                  threshold: largeOptionWarningThreshold,
                })
              "
            />
          </div>
        </div>

        <div class="editor-actions">
          <q-btn flat no-caps color="primary" :label="t('addQuestionLabel')" @click="addQuestion" />
          <q-btn flat no-caps color="primary" :label="templateTexts.addAgeGroupLabel" @click="addTemplateQuestion({ templateId: 'age_group' })" />
          <q-btn flat no-caps color="primary" :label="templateTexts.addAgeLabel" @click="addTemplateQuestion({ templateId: 'age' })" />
          <q-btn flat no-caps color="primary" :label="templateTexts.addSexAtBirthLabel" @click="addTemplateQuestion({ templateId: 'sex_at_birth' })" />
          <q-btn flat no-caps color="primary" :label="templateTexts.addGenderLabel" @click="addTemplateQuestion({ templateId: 'gender' })" />
          <q-btn
            v-if="originalSurveyConfig !== null"
            flat
            no-caps
            color="negative"
            :label="t('deleteButton')"
            :loading="isDeleting"
            @click="requestDeleteSurvey"
          />
        </div>
      </div>
    </div>

    <ZKConfirmDialog
      v-model="showRemoveDialog"
      :message="removeDialogMessage"
      :confirm-text="removeDialogConfirmText"
      :cancel-text="t('cancelLabel')"
      variant="destructive"
      @confirm="handleConfirmRemoval"
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
import PageLoadingSpinner from "src/components/ui/PageLoadingSpinner.vue";
import ZKCard from "src/components/ui-library/ZKCard.vue";
import ZKConfirmDialog from "src/components/ui-library/ZKConfirmDialog.vue";
import ZKInfoBanner from "src/components/ui-library/ZKInfoBanner.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { SupportedDisplayLanguageCodes } from "src/shared/languages";
import type {
  SurveyChoiceDisplay,
  SurveyConfig,
  SurveyQuestionConfig,
  SurveyQuestionConstraints,
  SurveyQuestionOption,
  SurveyQuestionType,
} from "src/shared/types/zod";
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
  createChoiceSurveyQuestionConstraints,
  createEmptySurveyOption,
  createEmptySurveyQuestion,
  createIntegerSurveyQuestionConstraints,
  createRichTextSurveyQuestionConstraints,
  normalizeChoiceSurveyQuestionConstraints,
  shouldWarnAboutLargeSurveyOptionSet,
  summarizeSurveyConfigChanges,
  SURVEY_LARGE_OPTION_WARNING_THRESHOLD,
} from "src/utils/survey/config";
import {
  createSurveyTemplateQuestion,
  type SurveyTemplateId,
} from "src/utils/survey/templates";
import { surveyTemplateTextTranslations } from "src/utils/survey/templates.i18n";
import { useNotify } from "src/utils/ui/notify";
import { computed, nextTick, onMounted, ref } from "vue";
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
const surveyConfig = ref<SurveyConfig | null>(null);
const originalSurveyConfig = ref<SurveyConfig | null>(null);
const surveyValidationErrorMessage = ref<string | null>(null);

type PendingRemoval =
  | { type: "question"; questionIndex: number }
  | { type: "option"; questionIndex: number; optionIndex: number }
  | { type: "survey" };

const pendingRemoval = ref<PendingRemoval | null>(null);

const surveyConfigValue = computed(() => surveyConfig.value);
const surveyQuestions = computed(() => surveyConfig.value?.questions ?? []);
const isSurveyOptional = computed(() => surveyConfig.value?.isOptional === true);
const largeOptionWarningThreshold = SURVEY_LARGE_OPTION_WARNING_THRESHOLD;
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

function shouldShowLargeOptionWarning({
  choiceDisplay,
  optionCount,
}: {
  choiceDisplay: SurveyChoiceDisplay;
  optionCount: number;
}): boolean {
  return shouldWarnAboutLargeSurveyOptionSet({ choiceDisplay, optionCount });
}

function clearSurveyValidationError(): void {
  surveyValidationErrorMessage.value = null;
}

function showSurveyValidationError(): void {
  surveyValidationErrorMessage.value = t("validationError");
}

function shouldShowQuestionTextError({
  question,
}: {
  question: SurveyQuestionConfig;
}): boolean {
  return (
    surveyValidationErrorMessage.value !== null && question.questionText.trim() === ""
  );
}

function shouldShowOptionTextError({
  question,
  option,
}: {
  question: SurveyQuestionConfig;
  option: SurveyQuestionOption;
}): boolean {
  return (
    surveyValidationErrorMessage.value !== null &&
    question.questionType === "choice" &&
    option.optionText.trim() === ""
  );
}

function getOptionInputId({
  questionIndex,
  optionIndex,
}: {
  questionIndex: number;
  optionIndex: number;
}): string {
  return `survey-option-input-${questionIndex}-${optionIndex}`;
}

function getChoiceConstraintInputAttrs({
  optionCount,
}: {
  optionCount: number;
}): { min: number; max: number } {
  return { min: 1, max: optionCount };
}

async function handleOptionEditorEnter({
  event,
  questionIndex,
}: {
  event: KeyboardEvent;
  questionIndex: number;
}): Promise<void> {
  if (!(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)) return;
  event.preventDefault();
  await addOption({ questionIndex });
}

async function focusOptionInput({
  questionIndex,
  optionIndex,
}: {
  questionIndex: number;
  optionIndex: number;
}): Promise<void> {
  await nextTick();
  const input = document
    .getElementById(getOptionInputId({ questionIndex, optionIndex }))
    ?.querySelector<HTMLInputElement>("input");
  input?.focus();
}
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
const showRemoveDialog = computed({
  get: () => pendingRemoval.value !== null,
  set: (value: boolean) => {
    if (!value) {
      pendingRemoval.value = null;
    }
  },
});
const removeDialogMessage = computed(() => {
  switch (pendingRemoval.value?.type) {
    case undefined:
      return "";
    case "question":
      return t("confirmRemoveQuestionMessage");
    case "option":
      return t("confirmRemoveOptionMessage");
    case "survey":
      return t("confirmDeleteMessage");
  }

  return "";
});
const removeDialogConfirmText = computed(() => {
  switch (pendingRemoval.value?.type) {
    case undefined:
      return t("removeLabel");
    case "question":
      return t("confirmRemoveQuestionButtonLabel");
    case "option":
      return t("confirmRemoveOptionButtonLabel");
    case "survey":
      return t("deleteButton");
  }

  return t("removeLabel");
});

const questionTypeOptions: Array<{ label: string; value: SurveyQuestionType }> = [
  { label: t("typeChoice"), value: "choice" },
  { label: t("typeFreeText"), value: "free_text" },
];
const choiceDisplayOptions: Array<{ label: string; value: SurveyChoiceDisplay }> = [
  { label: t("choiceDisplayAuto"), value: "auto" },
  { label: t("choiceDisplayList"), value: "list" },
  { label: t("choiceDisplayDropdown"), value: "dropdown" },
];
const templateTexts = computed(() => {
  const currentLocale = locale.value as SupportedDisplayLanguageCodes;
  return (
    surveyTemplateTextTranslations[currentLocale] ??
    surveyTemplateTextTranslations.en
  );
});
const freeTextInputModeOptions = computed<
  Array<{ label: string; value: "rich_text" | "integer" }>
>(() => [
  { label: templateTexts.value.answerFormatRichText, value: "rich_text" },
  { label: templateTexts.value.answerFormatNumber, value: "integer" },
]);

onMounted(async () => {
  const response = await getConversationForEdit(conversationSlugId);

  if (!response.success) {
    showNotifyMessage(t("loadError"));
    await router.replace({ name: "/conversation/[conversationSlugId]/edit/", params: { conversationSlugId } });
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

async function redirectToConversation(): Promise<void> {
  await router.replace({
    name: "/conversation/[postSlugId]/",
    params: { postSlugId: conversationSlugId },
  });
}

function getOriginalQuestion({
  question,
}: {
  question: SurveyQuestionConfig;
}): SurveyQuestionConfig | undefined {
  if (question.questionSlugId === undefined) {
    return undefined;
  }

  return originalSurveyConfig.value?.questions.find((candidate) => {
    return candidate.questionSlugId === question.questionSlugId;
  });
}

function getOriginalOption({
  question,
  option,
}: {
  question: SurveyQuestionConfig;
  option: SurveyQuestionOption;
}): SurveyQuestionOption | undefined {
  if (option.optionSlugId === undefined) {
    return undefined;
  }

  const originalQuestion = getOriginalQuestion({ question });
  if (originalQuestion === undefined || originalQuestion.questionType === "free_text") {
    return undefined;
  }

  return originalQuestion.options.find((candidate) => {
    return candidate.optionSlugId === option.optionSlugId;
  });
}

function shouldShowQuestionSemanticToggle({
  question,
}: {
  question: SurveyQuestionConfig;
}): boolean {
  const originalQuestion = getOriginalQuestion({ question });

  return (
    originalQuestion !== undefined &&
    originalQuestion.questionText !== question.questionText
  );
}

function shouldShowOptionSemanticToggle({
  question,
  option,
}: {
  question: SurveyQuestionConfig;
  option: SurveyQuestionOption;
}): boolean {
  const originalOption = getOriginalOption({ question, option });

  return originalOption !== undefined && originalOption.optionText !== option.optionText;
}

function syncQuestionSemanticChangeFlag({ questionIndex }: { questionIndex: number }): void {
  const question = surveyConfig.value?.questions[questionIndex];
  if (question === undefined) {
    return;
  }

  if (!shouldShowQuestionSemanticToggle({ question })) {
    question.textChangeIsSemantic = undefined;
  }
}

function syncOptionSemanticChangeFlag({
  questionIndex,
  optionIndex,
}: {
  questionIndex: number;
  optionIndex: number;
}): void {
  const question = surveyConfig.value?.questions[questionIndex];
  if (question === undefined || question.questionType === "free_text") {
    return;
  }

  const option = question.options[optionIndex];
  if (option === undefined) {
    return;
  }

  if (!shouldShowOptionSemanticToggle({ question, option })) {
    option.textChangeIsSemantic = undefined;
  }
}

function updateQuestionSemanticChange({
  questionIndex,
  isSemantic,
}: {
  questionIndex: number;
  isSemantic: boolean;
}): void {
  const question = surveyConfig.value?.questions[questionIndex];
  if (question === undefined) {
    return;
  }

  question.textChangeIsSemantic = isSemantic ? true : undefined;
}

function updateOptionSemanticChange({
  questionIndex,
  optionIndex,
  isSemantic,
}: {
  questionIndex: number;
  optionIndex: number;
  isSemantic: boolean;
}): void {
  const question = surveyConfig.value?.questions[questionIndex];
  if (question === undefined || question.questionType === "free_text") {
    return;
  }

  const option = question.options[optionIndex];
  if (option === undefined) {
    return;
  }

  option.textChangeIsSemantic = isSemantic ? true : undefined;
}

function ensureSurveyConfig(): void {
  if (surveyConfig.value === null) {
    surveyConfig.value = { isOptional: false, questions: [] };
  }
}

function updateSurveyOptional({ isOptional }: { isOptional: boolean | null }): void {
  ensureSurveyConfig();
  if (surveyConfig.value === null) {
    return;
  }

  surveyConfig.value.isOptional = isOptional === true;
}

function addQuestion(): void {
  clearSurveyValidationError();
  ensureSurveyConfig();
  surveyConfig.value?.questions.push(
    createEmptySurveyQuestion({ displayOrder: surveyConfig.value.questions.length })
  );
}

function addTemplateQuestion({ templateId }: { templateId: SurveyTemplateId }): void {
  clearSurveyValidationError();
  ensureSurveyConfig();
  surveyConfig.value?.questions.push(
    createSurveyTemplateQuestion({
      templateId,
      displayOrder: surveyConfig.value.questions.length,
      displayLanguage: locale.value as SupportedDisplayLanguageCodes,
    })
  );
}

function getIntegerConstraints({
  constraints,
}: {
  constraints: SurveyQuestionConstraints;
}): Extract<SurveyQuestionConstraints, { type: "free_text"; inputMode: "integer" }> | undefined {
  return constraints.type === "free_text" && constraints.inputMode === "integer"
    ? constraints
    : undefined;
}

function getRichTextConstraints({
  constraints,
}: {
  constraints: SurveyQuestionConstraints;
}): Extract<SurveyQuestionConstraints, { type: "free_text"; inputMode: "rich_text" }> | undefined {
  return constraints.type === "free_text" && constraints.inputMode !== "integer"
    ? constraints
    : undefined;
}

function reindexSurveyQuestion({ question, displayOrder }: { question: SurveyQuestionConfig; displayOrder: number }): SurveyQuestionConfig {
  if (question.questionType === "free_text") {
    return {
      ...question,
      displayOrder,
    };
  }

  return {
    ...question,
    displayOrder,
    options: question.options.map((option, optionIndex) => ({
      ...option,
      displayOrder: optionIndex,
    })),
  };
}

function requestRemoveQuestion({ questionIndex }: { questionIndex: number }): void {
  pendingRemoval.value = { type: "question", questionIndex };
}

function performRemoveQuestion({ questionIndex }: { questionIndex: number }): void {
  clearSurveyValidationError();
  if (surveyConfig.value === null) return;
  surveyConfig.value.questions.splice(questionIndex, 1);
  if (surveyConfig.value.questions.length === 0) {
    surveyConfig.value = null;
    return;
  }
  surveyConfig.value.questions = surveyConfig.value.questions.map((question, index) =>
    reindexSurveyQuestion({ question, displayOrder: index })
  );
}

function updateQuestionText({ questionIndex, questionText }: { questionIndex: number; questionText: string | number | null }): void {
  clearSurveyValidationError();
  if (surveyConfig.value === null) return;
  surveyConfig.value.questions[questionIndex].questionText = String(questionText ?? "");
  syncQuestionSemanticChangeFlag({ questionIndex });
}

function updateQuestionRequired({ questionIndex, isRequired }: { questionIndex: number; isRequired: boolean | null }): void {
  clearSurveyValidationError();
  if (surveyConfig.value === null) return;
  surveyConfig.value.questions[questionIndex].isRequired = isRequired === true;
}

function updateQuestionType({ questionIndex, questionType }: { questionIndex: number; questionType: SurveyQuestionType | null }): void {
  clearSurveyValidationError();
  if (surveyConfig.value === null || questionType === null) return;

  const currentQuestion = surveyConfig.value.questions[questionIndex];
  const questionBase = {
    questionSlugId: currentQuestion.questionSlugId,
    questionText: currentQuestion.questionText,
    isRequired: currentQuestion.isRequired,
    displayOrder: currentQuestion.displayOrder,
    textChangeIsSemantic: currentQuestion.textChangeIsSemantic,
  };
  const currentChoiceDisplay = currentQuestion.questionType === "free_text"
    ? "auto"
    : currentQuestion.choiceDisplay;
  const currentOptions = currentQuestion.questionType === "free_text"
    ? []
    : currentQuestion.options;
  const nextOptions = currentOptions.length >= 2
    ? currentOptions
    : [createEmptySurveyOption({ displayOrder: 0 }), createEmptySurveyOption({ displayOrder: 1 })];

  if (questionType === "free_text") {
    surveyConfig.value.questions[questionIndex] = {
      ...questionBase,
      questionType: "free_text",
      constraints: createRichTextSurveyQuestionConstraints(),
    };
    return;
  }

  surveyConfig.value.questions[questionIndex] = {
    ...questionBase,
    questionType: "choice",
    choiceDisplay: currentChoiceDisplay,
    constraints: createChoiceSurveyQuestionConstraints(),
    options: nextOptions,
  };
}

function updateQuestionChoiceDisplay({ questionIndex, choiceDisplay }: { questionIndex: number; choiceDisplay: SurveyChoiceDisplay | null }): void {
  clearSurveyValidationError();
  const question = surveyConfig.value?.questions[questionIndex];
  if (question === undefined || question.questionType === "free_text" || choiceDisplay === null) return;
  question.choiceDisplay = choiceDisplay;
}

async function addOption({ questionIndex }: { questionIndex: number }): Promise<void> {
  clearSurveyValidationError();
  if (surveyConfig.value === null) return;
  const question = surveyConfig.value.questions[questionIndex];
  if (question.questionType === "free_text") return;
  question.options.push(createEmptySurveyOption({ displayOrder: question.options.length }));
  await focusOptionInput({
    questionIndex,
    optionIndex: question.options.length - 1,
  });
}

function requestRemoveOption({
  questionIndex,
  optionIndex,
}: {
  questionIndex: number;
  optionIndex: number;
}): void {
  pendingRemoval.value = { type: "option", questionIndex, optionIndex };
}

function performRemoveOption({ questionIndex, optionIndex }: { questionIndex: number; optionIndex: number }): void {
  clearSurveyValidationError();
  if (surveyConfig.value === null) return;
  const question = surveyConfig.value.questions[questionIndex];
  if (question.questionType === "free_text" || question.options.length <= 2) return;
  question.options.splice(optionIndex, 1);
  question.options = question.options.map((option, index) => ({ ...option, displayOrder: index }));
  question.constraints = normalizeChoiceSurveyQuestionConstraints({
    minSelections: question.constraints.minSelections,
    maxSelections: question.constraints.maxSelections,
    optionCount: question.options.length,
  });
}

function updateOptionText({ questionIndex, optionIndex, optionText }: { questionIndex: number; optionIndex: number; optionText: string | number | null }): void {
  clearSurveyValidationError();
  const question = surveyConfig.value?.questions[questionIndex];
  if (question === undefined || question.questionType === "free_text") return;
  const option = question.options[optionIndex];
  if (option === undefined) return;
  option.optionText = String(optionText ?? "");
  syncOptionSemanticChangeFlag({ questionIndex, optionIndex });
}

function parseOptionalInteger(value: string | number | null): number | undefined {
  if (value === null || value === "") return undefined;
  const parsedValue = Number(value);
  if (!Number.isSafeInteger(parsedValue)) return undefined;
  return parsedValue;
}

function updateChoiceConstraints({ questionIndex, minSelections, maxSelections }: { questionIndex: number; minSelections: string | number | null; maxSelections: string | number | null | undefined }): void {
  clearSurveyValidationError();
  const question = surveyConfig.value?.questions[questionIndex];
  if (question === undefined || question.questionType !== "choice") return;
  const parsedMinSelections = Math.max(parseOptionalInteger(minSelections) ?? 1, 1);
  const parsedMaxSelections = parseOptionalInteger(maxSelections ?? null);
  question.constraints = normalizeChoiceSurveyQuestionConstraints({
    minSelections: parsedMinSelections,
    maxSelections: parsedMaxSelections,
    optionCount: question.options.length,
  });
}

function updateFreeTextInputMode({ questionIndex, inputMode }: { questionIndex: number; inputMode: "rich_text" | "integer" | null }): void {
  clearSurveyValidationError();
  const question = surveyConfig.value?.questions[questionIndex];
  if (question === undefined || question.questionType !== "free_text" || inputMode === null) return;
  question.constraints = inputMode === "integer"
    ? createIntegerSurveyQuestionConstraints()
    : createRichTextSurveyQuestionConstraints();
}

function updateRichTextConstraints({ questionIndex, minPlainTextLength, maxPlainTextLength }: { questionIndex: number; minPlainTextLength: string | number | null | undefined; maxPlainTextLength: string | number | null }): void {
  clearSurveyValidationError();
  const question = surveyConfig.value?.questions[questionIndex];
  if (
    question === undefined ||
    question.questionType !== "free_text" ||
    question.constraints.type !== "free_text" ||
    question.constraints.inputMode === "integer"
  ) return;
  const parsedMaxPlainTextLength = Math.max(parseOptionalInteger(maxPlainTextLength) ?? 300, 1);
  question.constraints = {
    type: "free_text",
    inputMode: "rich_text",
    minPlainTextLength: parseOptionalInteger(minPlainTextLength ?? null),
    maxPlainTextLength: parsedMaxPlainTextLength,
    maxHtmlLength: parsedMaxPlainTextLength * 10,
  };
}

function updateIntegerConstraints({ questionIndex, minValue, maxValue }: { questionIndex: number; minValue: string | number | null | undefined; maxValue: string | number | null | undefined }): void {
  clearSurveyValidationError();
  const question = surveyConfig.value?.questions[questionIndex];
  if (
    question === undefined ||
    question.questionType !== "free_text" ||
    question.constraints.type !== "free_text" ||
    question.constraints.inputMode !== "integer"
  ) return;
  question.constraints = {
    type: "free_text",
    inputMode: "integer",
    minValue: Math.max(parseOptionalInteger(minValue ?? null) ?? 1, 1),
    maxValue: parseOptionalInteger(maxValue ?? null),
  };
}

function requestDeleteSurvey(): void {
  pendingRemoval.value = { type: "survey" };
}

async function handleConfirmRemoval(): Promise<void> {
  const target = pendingRemoval.value;
  pendingRemoval.value = null;

  if (target === null) {
    return;
  }

  switch (target.type) {
    case "question":
      performRemoveQuestion({ questionIndex: target.questionIndex });
      return;
    case "option":
      performRemoveOption({
        questionIndex: target.questionIndex,
        optionIndex: target.optionIndex,
      });
      return;
    case "survey":
      await deleteSurvey();
      return;
  }
}

async function saveSurvey(): Promise<void> {
  const normalizedSurveyConfigResult = buildSurveyConfigForSave({ surveyConfig: surveyConfig.value });
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

.intro-card,
.summary-card,
.editor-card,
.empty-card,
.question-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.intro-card__title,
.summary-card__title,
.question-card__title,
.empty-card__title {
  font-size: 1rem;
  font-weight: 600;
}

.intro-card__description,
.empty-card__description,
.summary-card__empty,
.semantic-change-block__hint {
  color: #6b7280;
  line-height: 1.4;
}

.question-card,
.editor-card {
  background: white;
  border-radius: 16px;
  padding: 1rem;
}

.question-card__header,
.editor-actions {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.constraints-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.constraints-stack {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.options-list,
.summary-card__list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.option-editor,
.semantic-change-block {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.semantic-change-block {
  margin-top: -0.35rem;
}

.semantic-change-block--nested {
  padding-inline-start: 0.5rem;
}

@media (max-width: 700px) {
  .constraints-grid {
    grid-template-columns: 1fr;
  }

  .question-card__header,
  .editor-actions {
    flex-direction: column;
  }
}
</style>
