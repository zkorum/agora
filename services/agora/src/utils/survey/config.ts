import {
  MAX_LENGTH_SURVEY_OPTION,
  MAX_LENGTH_SURVEY_QUESTION,
} from "src/shared/shared";
import type {
  SurveyChoiceDisplay,
  SurveyConfig,
  SurveyQuestionConfig,
  SurveyQuestionConstraints,
  SurveyQuestionFormItem,
  SurveyQuestionOption,
} from "src/shared/types/zod";
import { zodSurveyConfig } from "src/shared/types/zod";

export const SURVEY_CHOICE_DROPDOWN_OPTION_THRESHOLD = 8;
export const SURVEY_LARGE_OPTION_WARNING_THRESHOLD = 7;

export function shouldUseSurveyChoiceDropdown({
  choiceDisplay,
  optionCount,
  dropdownThreshold = SURVEY_CHOICE_DROPDOWN_OPTION_THRESHOLD,
}: {
  choiceDisplay: SurveyChoiceDisplay;
  optionCount: number;
  dropdownThreshold?: number;
}): boolean {
  if (choiceDisplay === "dropdown") {
    return true;
  }

  if (choiceDisplay === "list") {
    return false;
  }

  return optionCount > dropdownThreshold;
}

export function shouldWarnAboutLargeSurveyOptionSet({
  choiceDisplay,
  optionCount,
  warningThreshold = SURVEY_LARGE_OPTION_WARNING_THRESHOLD,
}: {
  choiceDisplay: SurveyChoiceDisplay;
  optionCount: number;
  warningThreshold?: number;
}): boolean {
  return choiceDisplay === "list" && optionCount > warningThreshold;
}

export function createRichTextSurveyQuestionConstraints(): Extract<
  SurveyQuestionConstraints,
  { type: "free_text"; inputMode: "rich_text" }
> {
  return {
    type: "free_text",
    inputMode: "rich_text",
    minPlainTextLength: 0,
    maxPlainTextLength: 300,
    maxHtmlLength: 3000,
  };
}

export function createChoiceSurveyQuestionConstraints(): Extract<
  SurveyQuestionConstraints,
  { type: "choice" }
> {
  return {
    type: "choice",
    minSelections: 1,
    maxSelections: 1,
  };
}

export function normalizeChoiceSurveyQuestionConstraints({
  minSelections,
  maxSelections,
  optionCount,
}: {
  minSelections: number;
  maxSelections: number | undefined;
  optionCount: number;
}): Extract<SurveyQuestionConstraints, { type: "choice" }> {
  const maxSelectableOptions = Math.max(optionCount, 1);
  const normalizedMinSelections = Math.min(
    Math.max(minSelections, 1),
    maxSelectableOptions
  );

  return {
    type: "choice",
    minSelections: normalizedMinSelections,
    maxSelections:
      maxSelections === undefined
        ? undefined
        : Math.min(
            Math.max(maxSelections, normalizedMinSelections),
            maxSelectableOptions
          ),
  };
}

export function isSingleSelectionChoiceQuestion({
  question,
}: {
  question: Pick<SurveyQuestionConfig | SurveyQuestionFormItem, "questionType" | "constraints">;
}): boolean {
  return (
    question.questionType === "choice" &&
    question.constraints.type === "choice" &&
    question.constraints.maxSelections === 1
  );
}

export function createIntegerSurveyQuestionConstraints(): Extract<
  SurveyQuestionConstraints,
  { type: "free_text"; inputMode: "integer" }
> {
  return {
    type: "free_text",
    inputMode: "integer",
    minValue: 1,
    maxValue: 120,
  };
}

export function isIntegerFreeTextQuestion({
  question,
}: {
  question: Pick<SurveyQuestionConfig | SurveyQuestionFormItem, "questionType" | "constraints">;
}): boolean {
  return (
    question.questionType === "free_text" &&
    question.constraints.type === "free_text" &&
    question.constraints.inputMode === "integer"
  );
}

export function createEmptySurveyOption({
  displayOrder,
}: {
  displayOrder: number;
}): SurveyQuestionOption {
  return {
    optionText: "",
    displayOrder,
  };
}

export function createEmptySurveyQuestion({
  displayOrder,
}: {
  displayOrder: number;
}): SurveyQuestionConfig {
  return {
    questionType: "choice",
    choiceDisplay: "auto",
    questionText: "",
    isRequired: true,
    displayOrder,
    constraints: createChoiceSurveyQuestionConstraints(),
    options: [
      createEmptySurveyOption({ displayOrder: 0 }),
      createEmptySurveyOption({ displayOrder: 1 }),
    ],
  };
}

export function normalizeSurveyConfig({
  surveyConfig,
}: {
  surveyConfig: SurveyConfig | null;
}): SurveyConfig | null {
  if (surveyConfig === null) {
    return null;
  }

  const normalizedQuestions = surveyConfig.questions.map((question, questionIndex) => {
      const questionBase = {
        questionSlugId: question.questionSlugId,
        questionText: question.questionText.slice(0, MAX_LENGTH_SURVEY_QUESTION),
        isRequired: question.isRequired,
        displayOrder: questionIndex,
        textChangeIsSemantic: question.textChangeIsSemantic,
      };

      if (question.questionType === "free_text") {
        const richTextConstraints =
          question.constraints.type === "free_text" &&
          question.constraints.inputMode !== "integer"
            ? question.constraints
            : undefined;
        const freeTextQuestion = {
          ...questionBase,
          questionType: "free_text",
          constraints:
            question.constraints.type === "free_text" &&
            question.constraints.inputMode === "integer"
              ? {
                  type: "free_text",
                  inputMode: "integer",
                  minValue: question.constraints.minValue,
                  maxValue: question.constraints.maxValue,
                }
              : {
                  type: "free_text",
                  inputMode: "rich_text",
                  minPlainTextLength: richTextConstraints?.minPlainTextLength,
                  maxPlainTextLength: richTextConstraints?.maxPlainTextLength ?? 300,
                  maxHtmlLength: richTextConstraints?.maxHtmlLength ?? 3000,
                },
        } satisfies Extract<SurveyQuestionConfig, { questionType: "free_text" }>;

        return freeTextQuestion;
      }

      const baseOptions = question.options.map((option, optionIndex) => ({
        ...option,
        optionText: option.optionText.slice(0, MAX_LENGTH_SURVEY_OPTION),
        displayOrder: optionIndex,
      }));
      const options =
        baseOptions.length >= 2
          ? baseOptions
          : [
              ...baseOptions,
              ...Array.from({ length: 2 - baseOptions.length }, (_, index) => {
                return createEmptySurveyOption({
                  displayOrder: baseOptions.length + index,
                });
              }),
            ];

      const choiceQuestion = {
        ...questionBase,
        questionType: "choice",
        choiceDisplay: question.choiceDisplay,
        constraints: normalizeChoiceSurveyQuestionConstraints({
          minSelections: question.constraints.minSelections,
          maxSelections: question.constraints.maxSelections,
          optionCount: options.length,
        }),
        options,
      } satisfies Extract<SurveyQuestionConfig, { questionType: "choice" }>;

      return choiceQuestion;
    });

  if (normalizedQuestions.length === 0) {
    return null;
  }

  const candidateConfig = {
    questions: normalizedQuestions,
  } satisfies SurveyConfig;

  return candidateConfig;
}

export function cloneSurveyConfig({
  surveyConfig,
}: {
  surveyConfig: SurveyConfig | null;
}): SurveyConfig | null {
  if (surveyConfig === null) {
    return null;
  }

  return structuredClone(surveyConfig);
}

export function buildSurveyConfigForSave({
  surveyConfig,
}: {
  surveyConfig: SurveyConfig | null;
}):
  | {
      success: true;
      surveyConfig: SurveyConfig | null;
    }
  | {
      success: false;
      error: string;
    } {
  if (surveyConfig === null) {
    return {
      success: true,
      surveyConfig: null,
    };
  }

  if (surveyConfig.questions.length === 0) {
    return {
      success: true,
      surveyConfig: null,
    };
  }

  const hasEmptyQuestionText = surveyConfig.questions.some((question) => {
    return question.questionText.trim() === "";
  });

  if (hasEmptyQuestionText) {
    return {
      success: false,
      error: "Every survey question needs a prompt.",
    };
  }

  const hasInvalidChoiceOptions = surveyConfig.questions.some((question) => {
    return (
      question.questionType === "choice" &&
      (question.options.length < 2 ||
        question.options.some((option) => option.optionText.trim() === ""))
    );
  });

  if (hasInvalidChoiceOptions) {
    return {
      success: false,
      error: "Every choice option needs text.",
    };
  }

  const parsedConfig = zodSurveyConfig.safeParse(
    normalizeSurveyConfig({ surveyConfig })
  );

  if (!parsedConfig.success) {
    return {
      success: false,
      error: "Please complete all survey questions before publishing.",
    };
  }

  return {
    success: true,
    surveyConfig: parsedConfig.data,
  };
}

function areSurveyQuestionOptionsEqual({
  left,
  right,
}: {
  left: readonly SurveyQuestionOption[] | undefined;
  right: readonly SurveyQuestionOption[] | undefined;
}): boolean {
  if (left === undefined || right === undefined) {
    return left === right;
  }

  if (left.length !== right.length) {
    return false;
  }

  return left.every((option, index) => {
    const otherOption = right[index];

    return (
      option.optionSlugId === otherOption.optionSlugId &&
      option.optionText === otherOption.optionText &&
      option.displayOrder === otherOption.displayOrder &&
      option.textChangeIsSemantic === otherOption.textChangeIsSemantic
    );
  });
}

function getSurveyQuestionOptions({
  question,
}: {
  question: SurveyQuestionConfig;
}): readonly SurveyQuestionOption[] {
  return question.questionType === "free_text" ? [] : question.options;
}

function areSurveyQuestionChoiceDisplaysEqual({
  left,
  right,
}: {
  left: SurveyQuestionConfig;
  right: SurveyQuestionConfig;
}): boolean {
  if (left.questionType === "free_text" || right.questionType === "free_text") {
    return true;
  }

  return left.choiceDisplay === right.choiceDisplay;
}

function areSurveyQuestionConstraintsEqual({
  left,
  right,
}: {
  left: SurveyQuestionConstraints;
  right: SurveyQuestionConstraints;
}): boolean {
  if (left.type !== right.type) {
    return false;
  }

  switch (left.type) {
    case "choice":
      return (
        right.type === "choice" &&
        left.minSelections === right.minSelections &&
        left.maxSelections === right.maxSelections
      );
    case "free_text":
      return (
        right.type === "free_text" &&
        left.inputMode === right.inputMode &&
        (left.inputMode === "integer"
          ? right.inputMode === "integer" &&
            left.minValue === right.minValue &&
            left.maxValue === right.maxValue
          : right.inputMode !== "integer" &&
            left.minPlainTextLength === right.minPlainTextLength &&
            left.maxPlainTextLength === right.maxPlainTextLength &&
            left.maxHtmlLength === right.maxHtmlLength)
      );
  }
}

function areSurveyQuestionsEqual({
  left,
  right,
}: {
  left: readonly SurveyQuestionConfig[];
  right: readonly SurveyQuestionConfig[];
}): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((question, index) => {
    const otherQuestion = right[index];

    return (
      question.questionSlugId === otherQuestion.questionSlugId &&
      question.questionType === otherQuestion.questionType &&
      question.questionText === otherQuestion.questionText &&
      question.isRequired === otherQuestion.isRequired &&
      question.displayOrder === otherQuestion.displayOrder &&
      question.textChangeIsSemantic === otherQuestion.textChangeIsSemantic &&
      areSurveyQuestionChoiceDisplaysEqual({
        left: question,
        right: otherQuestion,
      }) &&
      areSurveyQuestionConstraintsEqual({
        left: question.constraints,
        right: otherQuestion.constraints,
      }) &&
      areSurveyQuestionOptionsEqual({
        left: getSurveyQuestionOptions({ question }),
        right: getSurveyQuestionOptions({ question: otherQuestion }),
      })
    );
  });
}

export function areSurveyConfigsEqual({
  left,
  right,
}: {
  left: SurveyConfig | null;
  right: SurveyConfig | null;
}): boolean {
  if (left === null || right === null) {
    return left === right;
  }

  return areSurveyQuestionsEqual({
    left: left.questions,
    right: right.questions,
  });
}

export interface SurveyConfigChangeSummary {
  addedQuestionCount: number;
  removedQuestionCount: number;
  updatedQuestionCount: number;
  addedOptionCount: number;
  removedOptionCount: number;
  updatedOptionCount: number;
}

function getQuestionKey({
  question,
  fallbackIndex,
}: {
  question: SurveyQuestionConfig;
  fallbackIndex: number;
}): string {
  return question.questionSlugId ?? `new-${String(fallbackIndex)}`;
}

function getOptionKey({
  option,
  questionKey,
  fallbackIndex,
}: {
  option: SurveyQuestionOption;
  questionKey: string;
  fallbackIndex: number;
}): string {
  return option.optionSlugId ?? `${questionKey}-new-option-${String(fallbackIndex)}`;
}

export function summarizeSurveyConfigChanges({
  previousSurveyConfig,
  nextSurveyConfig,
}: {
  previousSurveyConfig: SurveyConfig | null;
  nextSurveyConfig: SurveyConfig | null;
}): SurveyConfigChangeSummary {
  const previousQuestions = previousSurveyConfig?.questions ?? [];
  const nextQuestions = nextSurveyConfig?.questions ?? [];

  const previousByKey = new Map(
    previousQuestions.map((question, index) => {
      return [getQuestionKey({ question, fallbackIndex: index }), question] as const;
    })
  );
  const nextByKey = new Map(
    nextQuestions.map((question, index) => {
      return [getQuestionKey({ question, fallbackIndex: index }), question] as const;
    })
  );

  let addedQuestionCount = 0;
  let removedQuestionCount = 0;
  let updatedQuestionCount = 0;
  let addedOptionCount = 0;
  let removedOptionCount = 0;
  let updatedOptionCount = 0;

  for (const [key, nextQuestion] of nextByKey) {
    const previousQuestion = previousByKey.get(key);

    if (previousQuestion === undefined) {
      addedQuestionCount += 1;
      continue;
    }

    const didQuestionChange =
      previousQuestion.questionType !== nextQuestion.questionType ||
      !areSurveyQuestionChoiceDisplaysEqual({
        left: previousQuestion,
        right: nextQuestion,
      }) ||
      previousQuestion.questionText !== nextQuestion.questionText ||
      previousQuestion.isRequired !== nextQuestion.isRequired ||
      !areSurveyQuestionConstraintsEqual({
        left: previousQuestion.constraints,
        right: nextQuestion.constraints,
      });

    if (didQuestionChange) {
      updatedQuestionCount += 1;
    }

    const previousOptions = getSurveyQuestionOptions({ question: previousQuestion });
    const nextOptions = getSurveyQuestionOptions({ question: nextQuestion });

    const previousOptionsByKey = new Map(
      previousOptions.map((option, index) => {
        return [
          getOptionKey({ option, questionKey: key, fallbackIndex: index }),
          option,
        ] as const;
      })
    );
    const nextOptionsByKey = new Map(
      nextOptions.map((option, index) => {
        return [
          getOptionKey({ option, questionKey: key, fallbackIndex: index }),
          option,
        ] as const;
      })
    );

    for (const [optionKey, nextOption] of nextOptionsByKey) {
      const previousOption = previousOptionsByKey.get(optionKey);

      if (previousOption === undefined) {
        addedOptionCount += 1;
        continue;
      }

      if (
        previousOption.optionText !== nextOption.optionText ||
        previousOption.textChangeIsSemantic !== nextOption.textChangeIsSemantic
      ) {
        updatedOptionCount += 1;
      }
    }

    for (const optionKey of previousOptionsByKey.keys()) {
      if (!nextOptionsByKey.has(optionKey)) {
        removedOptionCount += 1;
      }
    }
  }

  for (const key of previousByKey.keys()) {
    if (!nextByKey.has(key)) {
      removedQuestionCount += 1;
    }
  }

  return {
    addedQuestionCount,
    removedQuestionCount,
    updatedQuestionCount,
    addedOptionCount,
    removedOptionCount,
    updatedOptionCount,
  };
}
