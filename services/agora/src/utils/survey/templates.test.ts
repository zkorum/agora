import { describe, expect, it } from "vitest";

import { createSurveyTemplateQuestion } from "./templates";

describe("createSurveyTemplateQuestion", () => {
  it("creates a localized age group choice template", () => {
    const question = createSurveyTemplateQuestion({
      templateId: "age_group",
      displayOrder: 0,
      displayLanguage: "fr",
    });

    expect(question.questionType).toBe("choice");
    if (question.questionType !== "choice") {
      throw new Error("Expected choice template");
    }
    expect(question.questionText).toBe("Quelle est votre tranche d'âge ?");
    expect(question.options.map((option) => option.optionText)).toEqual([
      "18-24",
      "25-34",
      "35-44",
      "45-54",
      "55-64",
      "65+",
    ]);
  });
});
