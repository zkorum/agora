import type { SurveyAnswerDraft, SurveyQuestionFormItem } from "src/shared/types/zod";
import { describe, expect, it } from "vitest";

import { areSurveyAnswersEqual, isSurveyAnswerSubmittable, normalizeSurveyAnswer } from "./answer";

describe("areSurveyAnswersEqual", () => {
  it("treats multi-choice answers with the same selections as equal regardless of order", () => {
    const left: SurveyAnswerDraft = {
      questionType: "choice",
      optionSlugIds: ["option-b", "option-a"],
    };
    const right: SurveyAnswerDraft = {
      questionType: "choice",
      optionSlugIds: ["option-a", "option-b"],
    };

    expect(areSurveyAnswersEqual({ left, right })).toBe(true);
  });

  it("keeps single-choice answers order-sensitive through their single selected option", () => {
    const left: SurveyAnswerDraft = {
      questionType: "choice",
      optionSlugIds: ["option-a"],
    };
    const right: SurveyAnswerDraft = {
      questionType: "choice",
      optionSlugIds: ["option-b"],
    };

    expect(areSurveyAnswersEqual({ left, right })).toBe(false);
  });

  it("treats numeric free-text answers as submittable only when they are valid integers", () => {
    const integerQuestion: SurveyQuestionFormItem = {
      questionSlugId: "question1",
      questionType: "free_text",
      questionText: "What is your age?",
      isRequired: true,
      displayOrder: 0,
      constraints: {
        type: "free_text",
        inputMode: "integer",
        minValue: 1,
        maxValue: 120,
      },
      currentAnswer: undefined,
      isPassed: false,
      isMissingRequired: false,
      isStale: false,
      isCurrentAnswerValid: false,
      currentSemanticVersion: 1,
    };

    const normalizedAnswer = normalizeSurveyAnswer({
      question: integerQuestion,
      selectedSingleOptionSlugId: null,
      selectedMultiOptionSlugIds: [],
      textValueHtml: "34",
    });

    expect(normalizedAnswer).toEqual({
      questionType: "free_text",
      textValueHtml: "34",
    });
    expect(
      isSurveyAnswerSubmittable({
        question: integerQuestion,
        answer: normalizedAnswer,
      })
    ).toBe(true);
    expect(
      isSurveyAnswerSubmittable({
        question: integerQuestion,
        answer: {
          questionType: "free_text",
          textValueHtml: "12a",
        },
      })
    ).toBe(false);
  });
});
