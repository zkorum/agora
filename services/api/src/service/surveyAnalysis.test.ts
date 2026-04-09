import { describe, expect, it } from "vitest";
import {
    deriveSurveyGateStatusForAnalysis,
    doesSurveyRequireCompletion,
    isSurveyGateStatusEligibleForAnalysis,
    shouldRecomputeAnalysisForSurveyConfigChange,
    shouldRecomputeAnalysisForSurveyTransition,
    validateSurveyAnswerForAnalysis,
    type SurveyQuestionAnalysisRecord,
    type SurveyStoredAnswerAnalysisRecord,
} from "@/shared-backend/surveyAnalysis.js";

const requiredMonoChoiceQuestion: SurveyQuestionAnalysisRecord = {
    questionId: 1,
    questionType: "mono_choice",
    currentSemanticVersion: 2,
    isRequired: true,
    constraints: {
        type: "mono_choice",
        minSelections: 1,
        maxSelections: 1,
    },
    optionSlugIds: ["yes", "no"],
};

const optionalMonoChoiceQuestion: SurveyQuestionAnalysisRecord = {
    questionId: 2,
    questionType: "mono_choice",
    currentSemanticVersion: 1,
    isRequired: false,
    constraints: {
        type: "mono_choice",
        minSelections: 1,
        maxSelections: 1,
    },
    optionSlugIds: ["a", "b"],
};

const requiredIntegerFreeTextQuestion: SurveyQuestionAnalysisRecord = {
    questionId: 3,
    questionType: "free_text",
    currentSemanticVersion: 1,
    isRequired: true,
    constraints: {
        type: "free_text",
        inputMode: "integer",
        minValue: 1,
        maxValue: 120,
    },
    optionSlugIds: [],
};

describe("validateSurveyAnswerForAnalysis", () => {
    it("marks facilitator-invalidated answers as stale when semantic versions diverge", () => {
        const answer: SurveyStoredAnswerAnalysisRecord = {
            answeredQuestionSemanticVersion: 1,
            textValueHtml: null,
            optionSlugIds: ["yes"],
        };

        expect(
            validateSurveyAnswerForAnalysis({
                question: requiredMonoChoiceQuestion,
                answer,
            }),
        ).toBe(false);
    });

    it("accepts integer free-text answers only when they are in range", () => {
        expect(
            validateSurveyAnswerForAnalysis({
                question: requiredIntegerFreeTextQuestion,
                answer: {
                    answeredQuestionSemanticVersion: 1,
                    textValueHtml: "34",
                    optionSlugIds: [],
                },
            }),
        ).toBe(true);

        expect(
            validateSurveyAnswerForAnalysis({
                question: requiredIntegerFreeTextQuestion,
                answer: {
                    answeredQuestionSemanticVersion: 1,
                    textValueHtml: "0",
                    optionSlugIds: [],
                },
            }),
        ).toBe(false);

        expect(
            validateSurveyAnswerForAnalysis({
                question: requiredIntegerFreeTextQuestion,
                answer: {
                    answeredQuestionSemanticVersion: 1,
                    textValueHtml: "34.5",
                    optionSlugIds: [],
                },
            }),
        ).toBe(false);
    });
});

describe("deriveSurveyGateStatusForAnalysis", () => {
    it("returns complete_valid when all required answers are current and valid", () => {
        expect(
            deriveSurveyGateStatusForAnalysis({
                hasSurvey: true,
                questions: [requiredMonoChoiceQuestion],
                answersByQuestionId: new Map([
                    [
                        requiredMonoChoiceQuestion.questionId,
                        {
                            answeredQuestionSemanticVersion: 2,
                            textValueHtml: null,
                            optionSlugIds: ["yes"],
                        },
                    ],
                ]),
                withdrawnAt: null,
            }),
        ).toBe("complete_valid");
    });

    it("returns needs_update when a previously complete answer becomes stale", () => {
        expect(
            deriveSurveyGateStatusForAnalysis({
                hasSurvey: true,
                questions: [requiredMonoChoiceQuestion],
                answersByQuestionId: new Map([
                    [
                        requiredMonoChoiceQuestion.questionId,
                        {
                            answeredQuestionSemanticVersion: 1,
                            textValueHtml: null,
                            optionSlugIds: ["yes"],
                        },
                    ],
                ]),
                withdrawnAt: null,
            }),
        ).toBe("needs_update");
    });

    it("treats untouched optional-only surveys as not_started", () => {
        expect(
            deriveSurveyGateStatusForAnalysis({
                hasSurvey: true,
                questions: [optionalMonoChoiceQuestion],
                answersByQuestionId: new Map(),
                withdrawnAt: null,
            }),
        ).toBe("not_started");
    });

    it("treats optional-only surveys as complete once the optional question is passed", () => {
        expect(
            deriveSurveyGateStatusForAnalysis({
                hasSurvey: true,
                questions: [optionalMonoChoiceQuestion],
                answersByQuestionId: new Map([
                    [
                        optionalMonoChoiceQuestion.questionId,
                        {
                            answeredQuestionSemanticVersion: 1,
                            textValueHtml: null,
                            optionSlugIds: [],
                        },
                    ],
                ]),
                withdrawnAt: null,
            }),
        ).toBe("complete_valid");
    });
});

describe("analysis eligibility helpers", () => {
    it("treats only no_survey and complete_valid as analysis-eligible", () => {
        expect(
            isSurveyGateStatusEligibleForAnalysis({
                surveyGateStatus: "no_survey",
            }),
        ).toBe(true);
        expect(
            isSurveyGateStatusEligibleForAnalysis({
                surveyGateStatus: "complete_valid",
            }),
        ).toBe(true);
        expect(
            isSurveyGateStatusEligibleForAnalysis({
                surveyGateStatus: "withdrawn",
            }),
        ).toBe(false);
        expect(
            isSurveyGateStatusEligibleForAnalysis({
                surveyGateStatus: "needs_update",
            }),
        ).toBe(false);
    });

    it("recomputes analysis when eligibility changes because a survey is withdrawn or invalidated", () => {
        expect(
            shouldRecomputeAnalysisForSurveyTransition({
                previousSurveyGateStatus: "complete_valid",
                nextSurveyGateStatus: "withdrawn",
            }),
        ).toBe(true);
        expect(
            shouldRecomputeAnalysisForSurveyTransition({
                previousSurveyGateStatus: "complete_valid",
                nextSurveyGateStatus: "needs_update",
            }),
        ).toBe(true);
    });

    it("does not recompute analysis when survey status changes but eligibility does not", () => {
        expect(
            shouldRecomputeAnalysisForSurveyTransition({
                previousSurveyGateStatus: "not_started",
                nextSurveyGateStatus: "in_progress",
            }),
        ).toBe(false);
        expect(
            shouldRecomputeAnalysisForSurveyTransition({
                previousSurveyGateStatus: "complete_valid",
                nextSurveyGateStatus: "complete_valid",
            }),
        ).toBe(false);
    });

    it("recomputes analysis only when survey completion requirements change", () => {
        expect(
            shouldRecomputeAnalysisForSurveyConfigChange({
                previousRequiresSurvey: false,
                nextRequiresSurvey: true,
                didRequiredQuestionSemanticChange: true,
            }),
        ).toBe(true);
        expect(
            shouldRecomputeAnalysisForSurveyConfigChange({
                previousRequiresSurvey: true,
                nextRequiresSurvey: false,
                didRequiredQuestionSemanticChange: true,
            }),
        ).toBe(true);
        expect(
            shouldRecomputeAnalysisForSurveyConfigChange({
                previousRequiresSurvey: false,
                nextRequiresSurvey: false,
                didRequiredQuestionSemanticChange: true,
            }),
        ).toBe(false);
        expect(
            shouldRecomputeAnalysisForSurveyConfigChange({
                previousRequiresSurvey: true,
                nextRequiresSurvey: true,
                didRequiredQuestionSemanticChange: false,
            }),
        ).toBe(false);
    });

    it("distinguishes optional-only from required surveys", () => {
        expect(doesSurveyRequireCompletion({ requiredQuestionCount: 0 })).toBe(false);
        expect(doesSurveyRequireCompletion({ requiredQuestionCount: 1 })).toBe(true);
    });
});
