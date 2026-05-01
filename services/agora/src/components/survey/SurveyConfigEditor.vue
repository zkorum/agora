<template>
  <div class="survey-config-editor">
    <div class="survey-config-editor__intro-card">
      <div class="survey-config-editor__title">{{ texts.title }}</div>
      <div class="survey-config-editor__description">{{ texts.description }}</div>
      <div v-if="hasSurveyQuestions" class="survey-config-editor__description">
        {{ texts.requiredSurveyToggleHint }}
      </div>
    </div>

    <slot name="between-intro-and-editor" />

    <div
      class="survey-config-editor__body"
      :class="{ 'survey-config-editor__body--card': bodyCard }"
    >
      <div v-if="!hasSurveyQuestions" class="survey-config-editor__empty-card">
        <div class="survey-config-editor__title">{{ texts.noQuestionsTitle }}</div>
        <div class="survey-config-editor__description">
          {{ texts.noQuestionsDescription }}
        </div>
      </div>

      <div
        v-for="(question, questionIndex) in surveyQuestions"
        :key="questionIndex"
        class="survey-config-editor__question-card"
      >
        <div class="survey-config-editor__question-header">
          <div>
            <div class="survey-config-editor__title">
              {{ texts.questionTitle({ number: questionIndex + 1 }) }}
            </div>
            <div class="survey-config-editor__description">
              {{ !question.isRequired ? texts.optionalLabel : texts.requiredLabel }}
            </div>
          </div>

          <q-btn
            flat
            no-caps
            color="negative"
            :label="texts.removeQuestionLabel"
            @click="requestRemoveQuestion({ questionIndex })"
          />
        </div>

        <q-select
          :model-value="question.questionType"
          outlined
          emit-value
          map-options
          :label="texts.questionTypeLabel"
          :options="questionTypeOptions"
          @update:model-value="(value) => updateQuestionType({ questionIndex, questionType: value })"
        />

        <q-select
          v-if="question.questionType !== 'free_text'"
          :model-value="question.choiceDisplay"
          outlined
          emit-value
          map-options
          :label="texts.choiceDisplayLabel"
          :options="choiceDisplayOptions"
          @update:model-value="(value) => updateQuestionChoiceDisplay({ questionIndex, choiceDisplay: value })"
        />

        <q-input
          :model-value="question.questionText"
          outlined
          autogrow
          :maxlength="500"
          :error="shouldShowQuestionTextError({ question })"
          :label="texts.questionPromptLabel"
          @update:model-value="(value) => updateQuestionText({ questionIndex, questionText: value })"
        />

        <div
          v-if="shouldShowQuestionSemanticToggle({ question })"
          class="survey-config-editor__help-block"
        >
          <q-toggle
            :model-value="question.textChangeIsSemantic === true"
            :label="texts.questionSemanticChangeLabel ?? ''"
            @update:model-value="(value) => updateQuestionSemanticChange({ questionIndex, isSemantic: value === true })"
          />
          <div class="survey-config-editor__help">
            {{ texts.questionSemanticChangeHint }}
          </div>
        </div>

        <q-toggle
          :model-value="question.isRequired"
          :label="!question.isRequired ? texts.optionalLabel : texts.requiredLabel"
          @update:model-value="(value) => updateQuestionRequired({ questionIndex, isRequired: value })"
        />

        <div v-if="question.questionType === 'choice'" class="survey-config-editor__constraints-grid">
          <q-input
            :model-value="question.constraints.minSelections"
            v-bind="getChoiceConstraintInputAttrs({ optionCount: question.options.length })"
            outlined
            type="number"
            :label="texts.minSelectionsLabel"
            @update:model-value="(value) => updateChoiceConstraints({ questionIndex, minSelections: value, maxSelections: question.constraints.maxSelections })"
          />

          <q-input
            :model-value="question.constraints.maxSelections ?? ''"
            v-bind="getChoiceConstraintInputAttrs({ optionCount: question.options.length })"
            outlined
            type="number"
            :label="texts.maxSelectionsLabel"
            @update:model-value="(value) => updateChoiceConstraints({ questionIndex, minSelections: question.constraints.minSelections, maxSelections: value })"
          />
        </div>

        <div v-else-if="question.questionType === 'free_text'" class="survey-config-editor__constraints-stack">
          <q-select
            :model-value="question.constraints.type === 'free_text' ? question.constraints.inputMode : 'rich_text'"
            outlined
            emit-value
            map-options
            :label="templateTexts.answerFormatLabel"
            :options="freeTextInputModeOptions"
            @update:model-value="(value) => updateFreeTextInputMode({ questionIndex, inputMode: value })"
          />

          <div
            v-if="question.constraints.type === 'free_text' && question.constraints.inputMode === 'integer'"
            class="survey-config-editor__constraints-grid"
          >
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

          <div v-else class="survey-config-editor__constraints-grid">
            <q-input
              :model-value="getRichTextConstraints({ constraints: question.constraints })?.minPlainTextLength ?? ''"
              outlined
              type="number"
              :label="texts.minTextLengthLabel"
              @update:model-value="(value) => updateRichTextConstraints({ questionIndex, minPlainTextLength: value, maxPlainTextLength: getRichTextConstraints({ constraints: question.constraints })?.maxPlainTextLength ?? 300 })"
            />

            <q-input
              :model-value="getRichTextConstraints({ constraints: question.constraints })?.maxPlainTextLength ?? 300"
              outlined
              type="number"
              :label="texts.maxTextLengthLabel"
              @update:model-value="(value) => updateRichTextConstraints({ questionIndex, minPlainTextLength: getRichTextConstraints({ constraints: question.constraints })?.minPlainTextLength, maxPlainTextLength: value })"
            />
          </div>

          <div
            v-if="getFreeTextHelp({ constraints: question.constraints }) !== ''"
            class="survey-config-editor__help"
          >
            {{ getFreeTextHelp({ constraints: question.constraints }) }}
          </div>
        </div>

        <div v-if="question.questionType !== 'free_text'" class="survey-config-editor__options-list">
          <div
            v-for="(option, optionIndex) in question.options ?? []"
            :id="getOptionInputId({ questionIndex, optionIndex })"
            :key="optionIndex"
            class="survey-config-editor__option-editor"
            @keydown.enter="handleOptionEditorEnter({ event: $event, questionIndex })"
          >
            <q-input
              :model-value="option.optionText"
              outlined
              :maxlength="200"
              :error="shouldShowOptionTextError({ question, option })"
              :label="texts.optionLabel({ number: optionIndex + 1 })"
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
              class="survey-config-editor__help-block survey-config-editor__help-block--nested"
            >
              <q-toggle
                :model-value="option.textChangeIsSemantic === true"
                :label="texts.optionSemanticChangeLabel ?? ''"
                @update:model-value="(value) => updateOptionSemanticChange({ questionIndex, optionIndex, isSemantic: value === true })"
              />
              <div class="survey-config-editor__help">
                {{ texts.optionSemanticChangeHint }}
              </div>
            </div>
          </div>

          <q-btn
            flat
            no-caps
            color="primary"
            :label="texts.addOptionLabel"
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
              texts.largeOptionCountWarning({
                count: question.options?.length ?? 0,
                threshold: largeOptionWarningThreshold,
              })
            "
          />
        </div>
      </div>

      <div v-if="showActions" class="survey-config-editor__actions">
        <q-btn
          flat
          no-caps
          color="primary"
          :label="texts.addQuestionLabel"
          @click="addQuestion"
        />
        <q-btn
          flat
          no-caps
          color="primary"
          :label="templateTexts.addAgeGroupLabel"
          @click="addTemplateQuestion({ templateId: 'age_group' })"
        />
        <q-btn
          flat
          no-caps
          color="primary"
          :label="templateTexts.addAgeLabel"
          @click="addTemplateQuestion({ templateId: 'age' })"
        />
        <q-btn
          flat
          no-caps
          color="primary"
          :label="templateTexts.addSexAtBirthLabel"
          @click="addTemplateQuestion({ templateId: 'sex_at_birth' })"
        />
        <q-btn
          flat
          no-caps
          color="primary"
          :label="templateTexts.addGenderLabel"
          @click="addTemplateQuestion({ templateId: 'gender' })"
        />
        <slot name="actions" />
      </div>
    </div>

    <ZKConfirmDialog
      v-model="showRemoveDialog"
      :message="removeDialogMessage"
      :confirm-text="removeDialogConfirmText"
      :cancel-text="texts.cancelLabel"
      variant="destructive"
      @confirm="handleConfirmRemoval"
    />
  </div>
</template>

<script setup lang="ts">
import ZKConfirmDialog from "src/components/ui-library/ZKConfirmDialog.vue";
import ZKInfoBanner from "src/components/ui-library/ZKInfoBanner.vue";
import {
  type SupportedDisplayLanguageCodes,
  ZodSupportedDisplayLanguageCodes,
} from "src/shared/languages";
import type {
  SurveyChoiceDisplay,
  SurveyConfig,
  SurveyQuestionConfig,
  SurveyQuestionConstraints,
  SurveyQuestionOption,
  SurveyQuestionType,
} from "src/shared/types/zod";
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
import { computed, nextTick, ref } from "vue";

interface SurveyConfigEditorTexts {
  title: string;
  description: string;
  requiredSurveyToggleHint: string;
  noQuestionsTitle: string;
  noQuestionsDescription: string;
  questionTitle: ({ number }: { number: number }) => string;
  optionalLabel: string;
  requiredLabel: string;
  removeQuestionLabel: string;
  questionTypeLabel: string;
  typeChoice: string;
  typeFreeText: string;
  choiceDisplayLabel: string;
  choiceDisplayAuto: string;
  choiceDisplayList: string;
  choiceDisplayDropdown: string;
  questionPromptLabel: string;
  minSelectionsLabel: string;
  maxSelectionsLabel: string;
  minTextLengthLabel: string;
  maxTextLengthLabel: string;
  freeTextHelp?: string;
  optionLabel: ({ number }: { number: number }) => string;
  addOptionLabel: string;
  addQuestionLabel: string;
  cancelLabel: string;
  confirmRemoveQuestionMessage: string;
  confirmRemoveOptionMessage: string;
  confirmRemoveQuestionButtonLabel: string;
  confirmRemoveOptionButtonLabel: string;
  largeOptionCountWarning: ({
    count,
    threshold,
  }: {
    count: number;
    threshold: number;
  }) => string;
  questionSemanticChangeLabel?: string;
  questionSemanticChangeHint?: string;
  optionSemanticChangeLabel?: string;
  optionSemanticChangeHint?: string;
}

interface Props {
  texts: SurveyConfigEditorTexts;
  displayLanguage: string;
  bodyCard?: boolean;
  showActions?: boolean;
  showValidationErrors?: boolean;
  originalSurveyConfig?: SurveyConfig | null;
}

const props = withDefaults(defineProps<Props>(), {
  bodyCard: false,
  showActions: true,
  showValidationErrors: false,
  originalSurveyConfig: null,
});

const emit = defineEmits<{
  clearValidationError: [];
}>();

const surveyConfig = defineModel<SurveyConfig | null>("surveyConfig", {
  required: true,
});

type PendingRemoval =
  | { type: "question"; questionIndex: number }
  | { type: "option"; questionIndex: number; optionIndex: number };

const pendingRemoval = ref<PendingRemoval | null>(null);
const largeOptionWarningThreshold = SURVEY_LARGE_OPTION_WARNING_THRESHOLD;

const currentLocale = computed<SupportedDisplayLanguageCodes>(() => {
  const parsedLocale = ZodSupportedDisplayLanguageCodes.safeParse(props.displayLanguage);

  return parsedLocale.success ? parsedLocale.data : "en";
});
const templateTexts = computed(() => {
  return surveyTemplateTextTranslations[currentLocale.value];
});
const surveyQuestions = computed(() => {
  return surveyConfig.value?.questions ?? [];
});
const hasSurveyQuestions = computed(() => {
  return surveyQuestions.value.length > 0;
});
const questionTypeOptions = computed<Array<{ label: string; value: SurveyQuestionType }>>(
  () => [
    { label: props.texts.typeChoice, value: "choice" },
    { label: props.texts.typeFreeText, value: "free_text" },
  ]
);
const choiceDisplayOptions = computed<
  Array<{ label: string; value: SurveyChoiceDisplay }>
>(() => [
  { label: props.texts.choiceDisplayAuto, value: "auto" },
  { label: props.texts.choiceDisplayList, value: "list" },
  { label: props.texts.choiceDisplayDropdown, value: "dropdown" },
]);
const freeTextInputModeOptions = computed<
  Array<{ label: string; value: "rich_text" | "integer" }>
>(() => [
  { label: templateTexts.value.answerFormatRichText, value: "rich_text" },
  { label: templateTexts.value.answerFormatNumber, value: "integer" },
]);

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
      return props.texts.confirmRemoveQuestionMessage;
    case "option":
      return props.texts.confirmRemoveOptionMessage;
  }

  return "";
});
const removeDialogConfirmText = computed(() => {
  switch (pendingRemoval.value?.type) {
    case undefined:
      return props.texts.removeQuestionLabel;
    case "question":
      return props.texts.confirmRemoveQuestionButtonLabel;
    case "option":
      return props.texts.confirmRemoveOptionButtonLabel;
  }

  return props.texts.removeQuestionLabel;
});

function clearSurveyValidationError(): void {
  emit("clearValidationError");
}

function addQuestion(): void {
  clearSurveyValidationError();
  const currentSurveyConfig = surveyConfig.value;
  if (currentSurveyConfig === null) {
    surveyConfig.value = {
      isOptional: false,
      questions: [createEmptySurveyQuestion({ displayOrder: 0 })],
    };
    return;
  }

  currentSurveyConfig.questions.push(
    createEmptySurveyQuestion({ displayOrder: currentSurveyConfig.questions.length })
  );
}

function addTemplateQuestion({ templateId }: { templateId: SurveyTemplateId }): void {
  clearSurveyValidationError();
  const currentSurveyConfig = surveyConfig.value;
  if (currentSurveyConfig === null) {
    surveyConfig.value = {
      isOptional: false,
      questions: [
        createSurveyTemplateQuestion({
          templateId,
          displayOrder: 0,
          displayLanguage: currentLocale.value,
        }),
      ],
    };
    return;
  }

  currentSurveyConfig.questions.push(
    createSurveyTemplateQuestion({
      templateId,
      displayOrder: currentSurveyConfig.questions.length,
      displayLanguage: currentLocale.value,
    })
  );
}

function shouldShowQuestionTextError({
  question,
}: {
  question: SurveyQuestionConfig;
}): boolean {
  return props.showValidationErrors && question.questionText.trim() === "";
}

function shouldShowOptionTextError({
  question,
  option,
}: {
  question: SurveyQuestionConfig;
  option: SurveyQuestionOption;
}): boolean {
  return (
    props.showValidationErrors &&
    question.questionType === "choice" &&
    option.optionText.trim() === ""
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
  if (!(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)) {
    return;
  }

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
}): Extract<
  SurveyQuestionConstraints,
  { type: "free_text"; inputMode: "integer" }
> | undefined {
  return constraints.type === "free_text" && constraints.inputMode === "integer"
    ? constraints
    : undefined;
}

function getRichTextConstraints({
  constraints,
}: {
  constraints: SurveyQuestionConstraints;
}): Extract<
  SurveyQuestionConstraints,
  { type: "free_text"; inputMode: "rich_text" }
> | undefined {
  return constraints.type === "free_text" && constraints.inputMode !== "integer"
    ? constraints
    : undefined;
}

function getFreeTextHelp({
  constraints,
}: {
  constraints: SurveyQuestionConstraints;
}): string {
  if (constraints.type === "free_text" && constraints.inputMode === "integer") {
    return templateTexts.value.numericInputHelp;
  }

  return props.texts.freeTextHelp ?? "";
}

function getOriginalQuestion({
  question,
}: {
  question: SurveyQuestionConfig;
}): SurveyQuestionConfig | undefined {
  if (question.questionSlugId === undefined) {
    return undefined;
  }

  return props.originalSurveyConfig?.questions.find((candidate) => {
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
  if (
    props.texts.questionSemanticChangeLabel === undefined ||
    props.texts.questionSemanticChangeHint === undefined
  ) {
    return false;
  }

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
  if (
    props.texts.optionSemanticChangeLabel === undefined ||
    props.texts.optionSemanticChangeHint === undefined
  ) {
    return false;
  }

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
  syncQuestionSemanticChangeFlag({ questionIndex });
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
  if (surveyConfig.value === null || questionType === null) {
    return;
  }

  const currentQuestion = surveyConfig.value.questions[questionIndex];
  const questionBase = {
    questionSlugId: currentQuestion.questionSlugId,
    questionText: currentQuestion.questionText,
    isRequired: currentQuestion.isRequired,
    displayOrder: currentQuestion.displayOrder,
    textChangeIsSemantic: currentQuestion.textChangeIsSemantic,
  };
  const currentChoiceDisplay =
    currentQuestion.questionType === "free_text" ? "auto" : currentQuestion.choiceDisplay;
  const currentOptions =
    currentQuestion.questionType === "free_text" ? [] : currentQuestion.options;
  const nextOptions =
    currentOptions.length >= 2
      ? currentOptions
      : [
          createEmptySurveyOption({ displayOrder: 0 }),
          createEmptySurveyOption({ displayOrder: 1 }),
        ];

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

function updateQuestionChoiceDisplay({
  questionIndex,
  choiceDisplay,
}: {
  questionIndex: number;
  choiceDisplay: SurveyChoiceDisplay | null;
}): void {
  clearSurveyValidationError();
  const question = surveyConfig.value?.questions[questionIndex];
  if (question === undefined || question.questionType === "free_text" || choiceDisplay === null) {
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
  const question = surveyConfig.value?.questions[questionIndex];
  if (question === undefined || question.questionType === "free_text") {
    return;
  }

  const option = question.options[optionIndex];
  if (option === undefined) {
    return;
  }

  option.optionText = String(optionText ?? "");
  syncOptionSemanticChangeFlag({ questionIndex, optionIndex });
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
  const question = surveyConfig.value?.questions[questionIndex];
  if (question === undefined || question.questionType !== "choice") {
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
  const question = surveyConfig.value?.questions[questionIndex];
  if (question === undefined || question.questionType !== "free_text" || inputMode === null) {
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
  const question = surveyConfig.value?.questions[questionIndex];
  if (
    question === undefined ||
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
  const question = surveyConfig.value?.questions[questionIndex];
  if (
    question === undefined ||
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
</script>

<style scoped lang="scss">
.survey-config-editor {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.survey-config-editor__intro-card,
.survey-config-editor__empty-card,
.survey-config-editor__question-card,
.survey-config-editor__body--card {
  background: white;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
}

.survey-config-editor__body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.survey-config-editor__title {
  color: #111827;
  font-size: 1rem;
  font-weight: 600;
}

.survey-config-editor__description,
.survey-config-editor__help {
  color: #6b7280;
  font-size: 0.9rem;
  line-height: 1.4;
}

.survey-config-editor__question-header,
.survey-config-editor__actions {
  align-items: flex-start;
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.survey-config-editor__question-header {
  justify-content: space-between;
}

.survey-config-editor__actions {
  gap: 0.5rem;
}

.survey-config-editor__constraints-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.survey-config-editor__constraints-stack,
.survey-config-editor__options-list,
.survey-config-editor__option-editor,
.survey-config-editor__help-block {
  display: flex;
  flex-direction: column;
}

.survey-config-editor__constraints-stack {
  gap: 1rem;
}

.survey-config-editor__options-list {
  gap: 0.75rem;
}

.survey-config-editor__option-editor,
.survey-config-editor__help-block {
  gap: 0.35rem;
}

.survey-config-editor__help-block {
  margin-top: -0.35rem;
}

.survey-config-editor__help-block--nested {
  padding-inline-start: 0.5rem;
}

@media (max-width: 700px) {
  .survey-config-editor__constraints-grid {
    grid-template-columns: 1fr;
  }

  .survey-config-editor__question-header {
    flex-direction: column;
  }
}
</style>
