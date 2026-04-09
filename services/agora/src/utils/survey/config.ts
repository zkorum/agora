import {
  MAX_LENGTH_SURVEY_OPTION,
  MAX_LENGTH_SURVEY_QUESTION,
} from "src/shared/shared";
import type {
  SurveyConfig,
  SurveyQuestionConfig,
  SurveyQuestionConstraints,
  SurveyQuestionFormItem,
  SurveyQuestionOption,
  SurveyQuestionType,
} from "src/shared/types/zod";
import { zodSurveyConfig } from "src/shared/types/zod";

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
    questionType: "mono_choice",
    questionText: "",
    isRequired: true,
    displayOrder,
    constraints: {
      type: "mono_choice",
      minSelections: 1,
      maxSelections: 1,
    },
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

  const normalizedQuestions = surveyConfig.questions
    .map((question, questionIndex) => {
      const normalizedQuestion: SurveyQuestionConfig = {
        ...question,
        questionText: question.questionText.slice(0, MAX_LENGTH_SURVEY_QUESTION),
        displayOrder: questionIndex,
      };

      if (question.questionType === "free_text") {
        const richTextConstraints =
          question.constraints.type === "free_text" &&
          question.constraints.inputMode !== "integer"
            ? question.constraints
            : undefined;
        const freeTextQuestion: SurveyQuestionConfig = {
          ...normalizedQuestion,
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
          options: undefined,
        };

        return freeTextQuestion;
      }

      const baseOptions = (question.options ?? []).map((option, optionIndex) => ({
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

      if (question.questionType === "multi_choice") {
        const multiChoiceQuestion: SurveyQuestionConfig = {
          ...normalizedQuestion,
          constraints: {
            type: "multi_choice",
            minSelections:
              question.constraints.type === "multi_choice"
                ? question.constraints.minSelections
                : 1,
            maxSelections:
              question.constraints.type === "multi_choice"
                ? question.constraints.maxSelections
                : undefined,
          },
          options,
        };

        return multiChoiceQuestion;
      }

      const type: Extract<SurveyQuestionType, "mono_choice" | "select"> =
        question.questionType === "select" ? "select" : "mono_choice";

      const singleChoiceQuestion: SurveyQuestionConfig = {
        ...normalizedQuestion,
        questionType: type,
        constraints: {
          type,
          minSelections: 1,
          maxSelections: 1,
        },
        options,
      };

      return singleChoiceQuestion;
    })
    .filter((question) => {
      return question.questionText.trim() !== "";
    });

  if (normalizedQuestions.length === 0) {
    return null;
  }

  const candidateConfig = {
    questions: normalizedQuestions,
  } satisfies SurveyConfig;

  return zodSurveyConfig.parse(candidateConfig);
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

  const hasAnyQuestionContent = surveyConfig.questions.some((question) => {
    return question.questionText.trim() !== "";
  });

  if (!hasAnyQuestionContent) {
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
    case "mono_choice":
    case "select":
      return true;
    case "multi_choice":
      return (
        right.type === "multi_choice" &&
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
      areSurveyQuestionConstraintsEqual({
        left: question.constraints,
        right: otherQuestion.constraints,
      }) &&
      areSurveyQuestionOptionsEqual({
        left: question.options,
        right: otherQuestion.options,
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
      previousQuestion.questionText !== nextQuestion.questionText ||
      previousQuestion.isRequired !== nextQuestion.isRequired ||
      !areSurveyQuestionConstraintsEqual({
        left: previousQuestion.constraints,
        right: nextQuestion.constraints,
      });

    if (didQuestionChange) {
      updatedQuestionCount += 1;
    }

    const previousOptions = previousQuestion.options ?? [];
    const nextOptions = nextQuestion.options ?? [];

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
