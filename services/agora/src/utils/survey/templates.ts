import type { SupportedDisplayLanguageCodes } from "src/shared/languages";
import type { SurveyQuestionConfig, SurveyQuestionOption } from "src/shared/types/zod";

import {
  createIntegerSurveyQuestionConstraints,
  createRichTextSurveyQuestionConstraints,
} from "./config";
import {
  type SurveyTemplateTextTranslations,
  surveyTemplateTextTranslations,
} from "./templates.i18n";

export type SurveyTemplateId = "age_group" | "age" | "sex_at_birth" | "gender";

const AGE_GROUP_OPTIONS = ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"];

function createSurveyTemplateOptions({
  optionTexts,
}: {
  optionTexts: readonly string[];
}): SurveyQuestionOption[] {
  return optionTexts.map((optionText, displayOrder) => ({
    optionText,
    displayOrder,
  }));
}

function getSurveyTemplateTranslations({
  displayLanguage,
}: {
  displayLanguage: SupportedDisplayLanguageCodes;
}): SurveyTemplateTextTranslations {
  return surveyTemplateTextTranslations[displayLanguage] ?? surveyTemplateTextTranslations.en;
}

export function createSurveyTemplateQuestion({
  templateId,
  displayOrder,
  displayLanguage,
}: {
  templateId: SurveyTemplateId;
  displayOrder: number;
  displayLanguage: SupportedDisplayLanguageCodes;
}): SurveyQuestionConfig {
  const translations = getSurveyTemplateTranslations({ displayLanguage });

  switch (templateId) {
    case "age_group":
      return {
        questionType: "mono_choice",
        questionText: translations.ageGroupPrompt,
        isRequired: true,
        displayOrder,
        constraints: {
          type: "mono_choice",
          minSelections: 1,
          maxSelections: 1,
        },
        options: createSurveyTemplateOptions({ optionTexts: AGE_GROUP_OPTIONS }),
      };
    case "age":
      return {
        questionType: "free_text",
        questionText: translations.agePrompt,
        isRequired: true,
        displayOrder,
        constraints: createIntegerSurveyQuestionConstraints(),
        options: undefined,
      };
    case "sex_at_birth":
      return {
        questionType: "mono_choice",
        questionText: translations.sexAtBirthPrompt,
        isRequired: true,
        displayOrder,
        constraints: {
          type: "mono_choice",
          minSelections: 1,
          maxSelections: 1,
        },
        options: createSurveyTemplateOptions({
          optionTexts: [translations.femaleOption, translations.maleOption],
        }),
      };
    case "gender":
      return {
        questionType: "mono_choice",
        questionText: translations.genderPrompt,
        isRequired: true,
        displayOrder,
        constraints: {
          type: "mono_choice",
          minSelections: 1,
          maxSelections: 1,
        },
        options: createSurveyTemplateOptions({
          optionTexts: [
            translations.womanOption,
            translations.manOption,
            translations.nonBinaryOption,
            translations.anotherGenderOption,
          ],
        }),
      };
  }
}

export function createManualFreeTextQuestion({
  displayOrder,
}: {
  displayOrder: number;
}): SurveyQuestionConfig {
  return {
    questionType: "free_text",
    questionText: "",
    isRequired: true,
    displayOrder,
    constraints: createRichTextSurveyQuestionConstraints(),
    options: undefined,
  };
}
