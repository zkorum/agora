<template>
  <NewConversationLayout v-slot="{ isActive }">
    <Teleport v-if="isActive && !isNavigatingAway" to="#page-header">
      <DefaultMenuBar :click-to-scroll-top="false">
        <template #left>
          <BackButton :fallback-route="{ name: '/conversation/new/seed/' }" @click="handleBack" />
        </template>
        <template #right>
          <PrimeButton
            :label="t('publishButton')"
            :loading="isSubmitButtonLoading"
            @click="publishConversation"
          />
        </template>
      </DefaultMenuBar>
    </Teleport>

    <div class="container">
      <div class="intro-card">
        <div class="intro-card__title">{{ t("pageTitle") }}</div>
        <div class="intro-card__description">{{ t("pageDescription") }}</div>
        <q-toggle
          :model-value="isSurveyOptional"
          :label="t('optionalSurveyToggleLabel')"
          @update:model-value="(value) => updateSurveyOptional({ isOptional: value })"
        />
        <div class="intro-card__description">
          {{ isSurveyOptional ? t("optionalSurveyToggleHint") : t("requiredSurveyToggleHint") }}
        </div>
      </div>

      <div v-if="surveyConfigValue === null || surveyConfigValue.questions.length === 0" class="empty-card">
        <div class="empty-card__title">{{ t("noQuestionsTitle") }}</div>
        <div class="empty-card__description">{{ t("noQuestionsDescription") }}</div>
      </div>

      <div v-for="(question, questionIndex) in surveyQuestions" :key="questionIndex" class="question-card">
        <div class="question-card__header">
          <div>
            <div class="question-card__title">
              {{ t("questionLabel", { number: questionIndex + 1 }) }}
            </div>
            <div class="question-card__subtitle">
              {{ isSurveyOptional || !question.isRequired ? t("optionalLabel") : t("requiredLabel") }}
            </div>
          </div>

          <q-btn
            flat
            no-caps
            color="negative"
            :label="t('removeQuestionLabel')"
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

        <q-toggle
          :model-value="isSurveyOptional ? false : question.isRequired"
          :disable="isSurveyOptional"
          :label="isSurveyOptional || !question.isRequired ? t('optionalLabel') : t('requiredLabel')"
          @update:model-value="(value) => updateQuestionRequired({ questionIndex, isRequired: value })"
        />
        <div v-if="isSurveyOptional" class="constraints-help">
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

          <div class="constraints-help">
            {{ question.constraints.type === 'free_text' && question.constraints.inputMode === 'integer' ? templateTexts.numericInputHelp : t("freeTextHelp") }}
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
                  @click="requestRemoveOption({ questionIndex, optionIndex })"
                />
              </template>
            </q-input>
          </div>

          <q-btn
            flat
            no-caps
            color="primary"
            :label="t('addOptionLabel')"
            @click="addOption({ questionIndex })"
          />

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

      <div v-if="isSurveyAllowed" class="template-actions">
        <q-btn
          flat
          no-caps
          color="primary"
          class="add-question-button"
          :label="t('addQuestionButton')"
          @click="addQuestion"
        />
        <q-btn flat no-caps color="primary" :label="templateTexts.addAgeGroupLabel" @click="addTemplateQuestion({ templateId: 'age_group' })" />
        <q-btn flat no-caps color="primary" :label="templateTexts.addAgeLabel" @click="addTemplateQuestion({ templateId: 'age' })" />
        <q-btn flat no-caps color="primary" :label="templateTexts.addSexAtBirthLabel" @click="addTemplateQuestion({ templateId: 'sex_at_birth' })" />
        <q-btn flat no-caps color="primary" :label="templateTexts.addGenderLabel" @click="addTemplateQuestion({ templateId: 'gender' })" />
      </div>
    </div>

    <NewConversationRouteGuard
      ref="routeGuard"
      :allowed-routes="['/conversation/new/create/', '/conversation/new/seed/', '/welcome/']"
      :has-unsaved-changes="isDraftModified"
      :reset-draft="resetDraft"
    />

    <PreParticipationIntentionDialog
      v-model="showLoginDialog"
      :ok-callback="onLoginCallback"
      active-intention="newConversation"
    />

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
import PreParticipationIntentionDialog from "src/components/authentication/intention/PreParticipationIntentionDialog.vue";
import BackButton from "src/components/navigation/buttons/BackButton.vue";
import DefaultMenuBar from "src/components/navigation/header/DefaultMenuBar.vue";
import NewConversationLayout from "src/components/newConversation/NewConversationLayout.vue";
import NewConversationRouteGuard from "src/components/newConversation/NewConversationRouteGuard.vue";
import ZKConfirmDialog from "src/components/ui-library/ZKConfirmDialog.vue";
import ZKInfoBanner from "src/components/ui-library/ZKInfoBanner.vue";
import { useConversationDraft } from "src/composables/conversation/draft";
import { usePublishConversationDraft } from "src/composables/conversation/usePublishConversationDraft";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { SupportedDisplayLanguageCodes } from "src/shared/languages";
import type {
  SurveyChoiceDisplay,
  SurveyQuestionConfig,
  SurveyQuestionConstraints,
  SurveyQuestionOption,
  SurveyQuestionType,
} from "src/shared/types/zod";
import {
  checkFeatureAccess,
  DEFAULT_FEATURE_ALLOWED_ORGS,
  DEFAULT_FEATURE_ALLOWED_USERS,
} from "src/shared-app-api/featureAccess";
import { useAuthenticationStore } from "src/stores/authentication";
import { useLoginIntentionStore } from "src/stores/loginIntention";
import { useNewPostDraftsStore } from "src/stores/newConversationDrafts";
import {
  isHistoryBackToPath,
  navigateBackOrReplace,
} from "src/utils/nav/historyBack";
import { processEnv } from "src/utils/processEnv";
import {
  createChoiceSurveyQuestionConstraints,
  createEmptySurveyOption,
  createEmptySurveyQuestion,
  createIntegerSurveyQuestionConstraints,
  createRichTextSurveyQuestionConstraints,
  normalizeChoiceSurveyQuestionConstraints,
  shouldWarnAboutLargeSurveyOptionSet,
  SURVEY_LARGE_OPTION_WARNING_THRESHOLD,
} from "src/utils/survey/config";
import {
  createSurveyTemplateQuestion,
  type SurveyTemplateId,
} from "src/utils/survey/templates";
import { surveyTemplateTextTranslations } from "src/utils/survey/templates.i18n";
import { computed, nextTick, onMounted, ref } from "vue";
import { useRouter } from "vue-router";

import {
  type ConversationSurveyStepTranslations,
  conversationSurveyStepTranslations,
} from "./index.i18n";

defineOptions({
  components: {
    PrimeButton: Button,
  },
});

const router = useRouter();
const { isLoggedIn, userId } = storeToRefs(useAuthenticationStore());
const { t, locale } = useComponentI18n<ConversationSurveyStepTranslations>(
  conversationSurveyStepTranslations
);

const { validateForReview, isDraftModified, resetDraft, surveyConfig } =
  useConversationDraft({ syncToStore: true });
const { conversationDraft } = storeToRefs(useNewPostDraftsStore());
const { publishConversationDraft } = usePublishConversationDraft();
const { createNewConversationIntention } = useLoginIntentionStore();

type PendingRemoval =
  | { type: "question"; questionIndex: number }
  | { type: "option"; questionIndex: number; optionIndex: number };

const routeGuard = ref<{ unlockRoute: () => void } | undefined>(undefined);
const showLoginDialog = ref(false);
const isSubmitButtonLoading = ref(false);
const isNavigatingAway = ref(false);
const surveyValidationErrorMessage = ref<string | null>(null);
const pendingRemoval = ref<PendingRemoval | null>(null);

const surveyConfigValue = computed(() => surveyConfig.value);

const surveyQuestions = computed(() => {
  return surveyConfig.value?.questions ?? [];
});
const isSurveyOptional = computed(() => {
  return surveyConfig.value?.isOptional === true;
});
const largeOptionWarningThreshold = SURVEY_LARGE_OPTION_WARNING_THRESHOLD;

function clearSurveyValidationError(): void {
  surveyValidationErrorMessage.value = null;
}

function showSurveyValidationError(): void {
  surveyValidationErrorMessage.value = t("surveyValidationError");
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
  }

  return "";
});

const removeDialogConfirmText = computed(() => {
  switch (pendingRemoval.value?.type) {
    case undefined:
      return t("removeQuestionLabel");
    case "question":
      return t("confirmRemoveQuestionButtonLabel");
    case "option":
      return t("confirmRemoveOptionButtonLabel");
  }

  return t("removeQuestionLabel");
});

const isSurveyAllowed = computed(() => {
  const result = checkFeatureAccess({
    featureEnabled: processEnv.VITE_SURVEY_ENABLED === "true",
    isOrgOnly: processEnv.VITE_IS_SURVEY_ORG_ONLY === "true",
    allowedOrgs:
      processEnv.VITE_SURVEY_ALLOWED_ORGS ?? DEFAULT_FEATURE_ALLOWED_ORGS,
    allowedUsers:
      processEnv.VITE_SURVEY_ALLOWED_USERS ?? DEFAULT_FEATURE_ALLOWED_USERS,
    postAsOrganization: conversationDraft.value.postAs.postAsOrganization,
    organizationName: conversationDraft.value.postAs.organizationName,
    userId: userId.value ?? "",
  });

  return result.allowed;
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
const freeTextInputModeOptions = computed<
  Array<{ label: string; value: "rich_text" | "integer" }>
>(() => [
  { label: templateTexts.value.answerFormatRichText, value: "rich_text" },
  { label: templateTexts.value.answerFormatNumber, value: "integer" },
]);
const templateTexts = computed(() => {
  const currentLocale = locale.value as SupportedDisplayLanguageCodes;
  return (
    surveyTemplateTextTranslations[currentLocale] ??
    surveyTemplateTextTranslations.en
  );
});

onMounted(async () => {
  if (!isSurveyAllowed.value) {
    routeGuard.value?.unlockRoute();
    isNavigatingAway.value = true;
    await router.replace({ name: "/conversation/new/seed/" });
  }
});

function onLoginCallback() {
  createNewConversationIntention();
}

async function handleBack(event: MouseEvent): Promise<void> {
  event.preventDefault();
  isNavigatingAway.value = true;

  const fallbackRoute = { name: "/conversation/new/seed/" } as const;
  await navigateBackOrReplace({
    router,
    fallbackRoute,
    shouldNavigateBack: isHistoryBackToPath({
      historyBack: window.history.state?.back,
      expectedPath: "/conversation/new/seed/",
    }),
  });
}

function ensureSurveyConfig(): void {
  if (!isSurveyAllowed.value) {
    return;
  }

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
    createEmptySurveyQuestion({
      displayOrder: surveyConfig.value.questions.length,
    })
  );
}

function shouldShowLargeOptionWarning({
  choiceDisplay,
  optionCount,
}: {
  choiceDisplay: SurveyChoiceDisplay;
  optionCount: number;
}): boolean {
  return shouldWarnAboutLargeSurveyOptionSet({ choiceDisplay, optionCount });
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

function reindexSurveyQuestion({
  question,
  displayOrder,
}: {
  question: SurveyQuestionConfig;
  displayOrder: number;
}): SurveyQuestionConfig {
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

function removeQuestion({ questionIndex }: { questionIndex: number }): void {
  clearSurveyValidationError();
  if (surveyConfig.value === null) {
    return;
  }

  surveyConfig.value.questions.splice(questionIndex, 1);
  if (surveyConfig.value.questions.length === 0) {
    surveyConfig.value = null;
    return;
  }

  surveyConfig.value.questions = surveyConfig.value.questions.map((question, index) =>
    reindexSurveyQuestion({ question, displayOrder: index })
  );
}

function updateQuestionText({
  questionIndex,
  questionText,
}: {
  questionIndex: number;
  questionText: string | number | null;
}): void {
  clearSurveyValidationError();
  if (surveyConfig.value === null) {
    return;
  }

  surveyConfig.value.questions[questionIndex].questionText = String(questionText ?? "");
}

function updateQuestionRequired({
  questionIndex,
  isRequired,
}: {
  questionIndex: number;
  isRequired: boolean | null;
}): void {
  clearSurveyValidationError();
  if (surveyConfig.value === null) {
    return;
  }

  surveyConfig.value.questions[questionIndex].isRequired = isRequired === true;
}

function updateQuestionType({
  questionIndex,
  questionType,
}: {
  questionIndex: number;
  questionType: SurveyQuestionType | null;
}): void {
  clearSurveyValidationError();
  if (surveyConfig.value === null) {
    return;
  }

  if (questionType === null) {
    return;
  }

  const nextType = questionType;
  const currentQuestion = surveyConfig.value.questions[questionIndex];
  const questionBase = {
    questionSlugId: currentQuestion.questionSlugId,
    questionText: currentQuestion.questionText,
    isRequired: currentQuestion.isRequired,
    displayOrder: currentQuestion.displayOrder,
    textChangeIsSemantic: currentQuestion.textChangeIsSemantic,
  };
  const currentChoiceDisplay =
    currentQuestion.questionType === "free_text"
      ? "auto"
      : currentQuestion.choiceDisplay;
  const currentOptions =
    currentQuestion.questionType === "free_text" ? [] : currentQuestion.options;
  const nextOptions =
    currentOptions.length >= 2
      ? currentOptions
      : [
          createEmptySurveyOption({ displayOrder: 0 }),
          createEmptySurveyOption({ displayOrder: 1 }),
        ];

  if (nextType === "free_text") {
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

function updateQuestionChoiceDisplay({
  questionIndex,
  choiceDisplay,
}: {
  questionIndex: number;
  choiceDisplay: SurveyChoiceDisplay | null;
}): void {
  clearSurveyValidationError();
  if (surveyConfig.value === null || choiceDisplay === null) {
    return;
  }

  const question = surveyConfig.value.questions[questionIndex];
  if (question.questionType === "free_text") {
    return;
  }

  question.choiceDisplay = choiceDisplay;
}

async function addOption({ questionIndex }: { questionIndex: number }): Promise<void> {
  clearSurveyValidationError();
  if (surveyConfig.value === null) {
    return;
  }

  const question = surveyConfig.value.questions[questionIndex];
  if (question.questionType === "free_text") {
    return;
  }

  question.options.push(
    createEmptySurveyOption({ displayOrder: question.options.length })
  );
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

function removeOption({
  questionIndex,
  optionIndex,
}: {
  questionIndex: number;
  optionIndex: number;
}): void {
  clearSurveyValidationError();
  if (surveyConfig.value === null) {
    return;
  }

  const question = surveyConfig.value.questions[questionIndex];
  if (question.questionType === "free_text" || question.options.length <= 2) {
    return;
  }

  question.options.splice(optionIndex, 1);
  question.options = question.options.map((option, index) => ({
    ...option,
    displayOrder: index,
  }));
  question.constraints = normalizeChoiceSurveyQuestionConstraints({
    minSelections: question.constraints.minSelections,
    maxSelections: question.constraints.maxSelections,
    optionCount: question.options.length,
  });
}

function updateOptionText({
  questionIndex,
  optionIndex,
  optionText,
}: {
  questionIndex: number;
  optionIndex: number;
  optionText: string | number | null;
}): void {
  clearSurveyValidationError();
  if (surveyConfig.value === null) {
    return;
  }

  const question = surveyConfig.value.questions[questionIndex];
  if (question.questionType === "free_text") {
    return;
  }

  const option = question.options[optionIndex];
  if (option === undefined) {
    return;
  }

  option.optionText = String(optionText ?? "");
}

function parseOptionalInteger(value: string | number | null): number | undefined {
  if (value === null || value === "") {
    return undefined;
  }

  const parsedValue = Number(value);
  if (!Number.isSafeInteger(parsedValue)) {
    return undefined;
  }

  return parsedValue;
}

function updateChoiceConstraints({
  questionIndex,
  minSelections,
  maxSelections,
}: {
  questionIndex: number;
  minSelections: string | number | null;
  maxSelections: string | number | null | undefined;
}): void {
  clearSurveyValidationError();
  if (surveyConfig.value === null) {
    return;
  }

  const question = surveyConfig.value.questions[questionIndex];
  if (question.questionType !== "choice") {
    return;
  }

  const parsedMinSelections = Math.max(parseOptionalInteger(minSelections) ?? 1, 1);
  const parsedMaxSelections = parseOptionalInteger(maxSelections ?? null);

  question.constraints = normalizeChoiceSurveyQuestionConstraints({
    minSelections: parsedMinSelections,
    maxSelections: parsedMaxSelections,
    optionCount: question.options.length,
  });
}

function updateFreeTextInputMode({
  questionIndex,
  inputMode,
}: {
  questionIndex: number;
  inputMode: "rich_text" | "integer" | null;
}): void {
  clearSurveyValidationError();
  if (surveyConfig.value === null) {
    return;
  }

  const question = surveyConfig.value.questions[questionIndex];
  if (question.questionType !== "free_text" || inputMode === null) {
    return;
  }

  question.constraints =
    inputMode === "integer"
      ? createIntegerSurveyQuestionConstraints()
      : createRichTextSurveyQuestionConstraints();
}

function updateRichTextConstraints({
  questionIndex,
  minPlainTextLength,
  maxPlainTextLength,
}: {
  questionIndex: number;
  minPlainTextLength: string | number | null | undefined;
  maxPlainTextLength: string | number | null;
}): void {
  clearSurveyValidationError();
  if (surveyConfig.value === null) {
    return;
  }

  const question = surveyConfig.value.questions[questionIndex];
  if (
    question.questionType !== "free_text" ||
    question.constraints.type !== "free_text" ||
    question.constraints.inputMode === "integer"
  ) {
    return;
  }

  const parsedMaxPlainTextLength = Math.max(
    parseOptionalInteger(maxPlainTextLength) ?? 300,
    1
  );

  question.constraints = {
    type: "free_text",
    inputMode: "rich_text",
    minPlainTextLength: parseOptionalInteger(minPlainTextLength ?? null),
    maxPlainTextLength: parsedMaxPlainTextLength,
    maxHtmlLength: parsedMaxPlainTextLength * 10,
  };
}

function updateIntegerConstraints({
  questionIndex,
  minValue,
  maxValue,
}: {
  questionIndex: number;
  minValue: string | number | null | undefined;
  maxValue: string | number | null | undefined;
}): void {
  clearSurveyValidationError();
  if (surveyConfig.value === null) {
    return;
  }

  const question = surveyConfig.value.questions[questionIndex];
  if (
    question.questionType !== "free_text" ||
    question.constraints.type !== "free_text" ||
    question.constraints.inputMode !== "integer"
  ) {
    return;
  }

  question.constraints = {
    type: "free_text",
    inputMode: "integer",
    minValue: Math.max(parseOptionalInteger(minValue ?? null) ?? 1, 1),
    maxValue: parseOptionalInteger(maxValue ?? null),
  };
}

function handleConfirmRemoval(): void {
  const target = pendingRemoval.value;
  pendingRemoval.value = null;
  switch (target?.type) {
    case undefined:
      return;
    case "question":
      removeQuestion({ questionIndex: target.questionIndex });
      return;
    case "option":
      removeOption({
        questionIndex: target.questionIndex,
        optionIndex: target.optionIndex,
      });
      return;
  }
}

async function publishConversation(): Promise<void> {
  if (!isLoggedIn.value) {
    showLoginDialog.value = true;
    return;
  }

  const validation = validateForReview();
  if (!validation.isValid) {
    routeGuard.value?.unlockRoute();
    isNavigatingAway.value = true;
    await router.replace({ name: "/conversation/new/create/" });
    return;
  }

  isSubmitButtonLoading.value = true;

  const wasPublished = await publishConversationDraft({
    conversationDraft: conversationDraft.value,
    surveyConfig: surveyConfig.value,
    invalidSurveyMessage: t("surveyValidationError"),
    defaultErrorMessage: t("publishError"),
    onInvalidSurvey: showSurveyValidationError,
    beforeSuccessNavigation: () => {
      routeGuard.value?.unlockRoute();
      isNavigatingAway.value = true;
    },
  });

  if (!wasPublished) {
    isSubmitButtonLoading.value = false;
  }
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
.empty-card,
.question-card {
  background: white;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
}

.intro-card__title,
.empty-card__title,
.question-card__title {
  color: #111827;
  font-size: 1rem;
  font-weight: 600;
}

.intro-card__description,
.empty-card__description,
.question-card__subtitle,
.constraints-help {
  color: #6b7280;
  font-size: 0.9rem;
  line-height: 1.4;
}

.question-card__header {
  align-items: flex-start;
  display: flex;
  justify-content: space-between;
  gap: 1rem;
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

.options-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.option-editor {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.template-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.add-question-button {
  align-self: flex-start;
}

@media (max-width: 700px) {
  .constraints-grid {
    grid-template-columns: 1fr;
  }
}
</style>
