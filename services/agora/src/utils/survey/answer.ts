import { htmlToCountedText } from "src/shared/shared";
import type {
  SurveyAnswerDraft,
  SurveyAnswerSubmission,
  SurveyQuestionFormItem,
} from "src/shared/types/zod";

import { isIntegerFreeTextQuestion } from "./config";

export function getSurveyFreeTextCharacterCount({
  textValueHtml,
}: {
  textValueHtml: string;
}): number {
  return htmlToCountedText(textValueHtml).length;
}

export function normalizeSurveyAnswer({
  question,
  selectedSingleOptionSlugId,
  selectedMultiOptionSlugIds,
  textValueHtml,
}: {
  question: SurveyQuestionFormItem;
  selectedSingleOptionSlugId: string | null;
  selectedMultiOptionSlugIds: readonly string[];
  textValueHtml: string;
}): SurveyAnswerSubmission | undefined {
  switch (question.questionType) {
    case "mono_choice":
    case "select":
      if (selectedSingleOptionSlugId === null) {
        return undefined;
      }
      return {
        questionType: question.questionType,
        optionSlugIds: [selectedSingleOptionSlugId],
      };
    case "multi_choice":
      if (selectedMultiOptionSlugIds.length === 0) {
        return undefined;
      }
      return {
        questionType: "multi_choice",
        optionSlugIds: [...selectedMultiOptionSlugIds],
      };
    case "free_text": {
      const hasContent = isIntegerFreeTextQuestion({ question })
        ? textValueHtml.trim().length > 0
        : getSurveyFreeTextCharacterCount({ textValueHtml }) > 0;
      if (!hasContent) {
        return undefined;
      }
      return {
        questionType: "free_text",
        textValueHtml,
      };
    }
  }
}

export function areSurveyAnswersEqual({
  left,
  right,
}: {
  left: SurveyAnswerDraft | undefined;
  right: SurveyAnswerDraft | undefined;
}): boolean {
  if (left === undefined || right === undefined) {
    return left === right;
  }

  if (left.questionType !== right.questionType) {
    return false;
  }

  switch (left.questionType) {
    case "free_text":
      return right.questionType === "free_text"
        ? left.textValueHtml === right.textValueHtml
        : false;
    case "mono_choice":
    case "select":
      if (right.questionType === "free_text") {
        return false;
      }

      return (
        left.optionSlugIds.length === right.optionSlugIds.length &&
        left.optionSlugIds.every((optionSlugId, index) => {
          return optionSlugId === right.optionSlugIds[index];
        })
      );
    case "multi_choice": {
      if (right.questionType !== "multi_choice") {
        return false;
      }

      const leftOptionSlugIds = [...left.optionSlugIds].sort();
      const rightOptionSlugIds = [...right.optionSlugIds].sort();

      return (
        leftOptionSlugIds.length === rightOptionSlugIds.length &&
        leftOptionSlugIds.every((optionSlugId, index) => {
          return optionSlugId === rightOptionSlugIds[index];
        })
      );
    }
  }

  return false;
}

export function isSurveyAnswerSubmittable({
  question,
  answer,
}: {
  question: SurveyQuestionFormItem;
  answer: SurveyAnswerSubmission | undefined;
}): boolean {
  if (answer === undefined) {
    return false;
  }

  const isIntegerTextAnswerValid = ({
    textValueHtml,
    minValue,
    maxValue,
  }: {
    textValueHtml: string;
    minValue: number;
    maxValue: number | undefined;
  }): boolean => {
    if (!/^\d+$/.test(textValueHtml)) {
      return false;
    }

    const parsedValue = Number(textValueHtml);
    if (!Number.isSafeInteger(parsedValue)) {
      return false;
    }

    return parsedValue >= minValue && (maxValue === undefined || parsedValue <= maxValue);
  };

  switch (answer.questionType) {
    case "mono_choice":
    case "select":
      return answer.optionSlugIds.length === 1;
    case "multi_choice": {
      if (question.constraints.type !== "multi_choice") {
        return false;
      }

      const withinMaxSelections =
        question.constraints.maxSelections === undefined ||
        answer.optionSlugIds.length <= question.constraints.maxSelections;

      return (
        answer.optionSlugIds.length >= question.constraints.minSelections &&
        withinMaxSelections
      );
    }
    case "free_text": {
      if (question.constraints.type !== "free_text") {
        return false;
      }

      if (question.constraints.inputMode === "integer") {
        return isIntegerTextAnswerValid({
          textValueHtml: answer.textValueHtml,
          minValue: question.constraints.minValue,
          maxValue: question.constraints.maxValue,
        });
      }

      const plainTextCharacterCount = getSurveyFreeTextCharacterCount({
        textValueHtml: answer.textValueHtml,
      });
      const minimumLength = Math.max(
        question.constraints.minPlainTextLength ?? 0,
        1
      );

      return (
        answer.textValueHtml.length <= question.constraints.maxHtmlLength &&
        plainTextCharacterCount >= minimumLength &&
        plainTextCharacterCount <= question.constraints.maxPlainTextLength
      );
    }
  }
}
