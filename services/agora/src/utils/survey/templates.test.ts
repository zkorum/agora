import { describe, expect, it } from "vitest";

import { createSurveyTemplateQuestion } from "./templates";

describe("createSurveyTemplateQuestion", () => {
  it("creates a localized age group mono-choice template", () => {
    const question = createSurveyTemplateQuestion({
      templateId: "age_group",
      displayOrder: 0,
      displayLanguage: "fr",
    });

    expect(question.questionType).toBe("mono_choice");
    expect(question.questionText).toBe("Quelle est votre tranche d'âge ?");
    expect(question.options?.map((option) => option.optionText)).toEqual([
      "18-24",
      "25-34",
      "35-44",
      "45-54",
      "55-64",
      "65+",
    ]);
  });

  it("creates an integer free-text age template", () => {
    const question = createSurveyTemplateQuestion({
      templateId: "age",
      displayOrder: 1,
      displayLanguage: "en",
    });

    expect(question.questionType).toBe("free_text");
    expect(question.constraints).toEqual({
      type: "free_text",
      inputMode: "integer",
      minValue: 1,
      maxValue: 120,
    });
    expect(question.options).toBeUndefined();
  });
});
