import type { SurveyConfig } from "src/shared/types/zod";
import { describe, expect, it } from "vitest";

import { buildSurveyConfigForSave } from "./config";

function createChoiceSurveyConfig(): SurveyConfig {
  return {
    isOptional: false,
    questions: [
      {
        questionType: "choice",
        choiceDisplay: "auto",
        questionText: "Pick one",
        isRequired: true,
        displayOrder: 0,
        constraints: {
          type: "choice",
          minSelections: 1,
          maxSelections: 1,
        },
        options: [
          { optionText: "A", displayOrder: 0 },
          { optionText: "B", displayOrder: 1 },
        ],
      },
    ],
  };
}

describe("buildSurveyConfigForSave", () => {
  it("rejects an added empty question instead of dropping the survey", () => {
    const surveyConfig = createChoiceSurveyConfig();
    surveyConfig.questions[0].questionText = "";

    expect(buildSurveyConfigForSave({ surveyConfig })).toMatchObject({
      success: false,
    });
  });

  it("rejects empty choice options", () => {
    const surveyConfig = createChoiceSurveyConfig();
    if (surveyConfig.questions[0].questionType !== "choice") {
      throw new Error("Expected choice question");
    }
    surveyConfig.questions[0].options[1].optionText = "";

    expect(buildSurveyConfigForSave({ surveyConfig })).toMatchObject({
      success: false,
    });
  });

  it("clamps maximum selections to the number of options", () => {
    const surveyConfig = createChoiceSurveyConfig();
    if (surveyConfig.questions[0].questionType !== "choice") {
      throw new Error("Expected choice question");
    }
    surveyConfig.questions[0].constraints.maxSelections = 4;

    const result = buildSurveyConfigForSave({ surveyConfig });

    expect(result.success).toBe(true);
    if (!result.success || result.surveyConfig === null) {
      throw new Error("Expected valid survey config");
    }
    const question = result.surveyConfig.questions[0];
    if (question.questionType !== "choice") {
      throw new Error("Expected choice question");
    }
    expect(question.constraints.maxSelections).toBe(2);
  });
});
