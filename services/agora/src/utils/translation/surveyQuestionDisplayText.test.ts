import type { SurveyQuestionContentVariant } from "src/shared/types/zod";
import { describe, expect, it } from "vitest";

import {
  areSurveyQuestionContentsEqual,
  getSurveyQuestionSourceKey,
  resolveSurveyQuestionDisplayContent,
} from "./surveyQuestionDisplayText";
import type { SurveyQuestionContentTranslationPreview } from "./useContentTranslationPreview";

const originalContent: SurveyQuestionContentVariant = {
  questionText: "Favorite color?",
  options: [
    { optionSlugId: "red", optionText: "Red" },
    { optionSlugId: "blue", optionText: "Blue" },
  ],
};

function buildPreview({
  mode,
  translatedQuestionText = "Couleur preferee ?",
  translatedOptions = [
    { optionSlugId: "red", optionText: "Rouge" },
    { optionSlugId: "blue", optionText: "Bleu" },
  ],
}: {
  mode: "original" | "translated";
  translatedQuestionText?: string;
  translatedOptions?: Array<{ optionSlugId: string; optionText: string }>;
}): SurveyQuestionContentTranslationPreview {
  return {
    sourceVersion: "2d826a50-5f21-49e6-bf07-9ad86b17f9bb",
    originalContent,
    isAvailable: true,
    isLoadingInitialTranslation: false,
    mode,
    sourceLanguageLabel: "English",
    translationStatus: "completed",
    translatedQuestionText,
    translatedOptions,
  };
}

describe("resolveSurveyQuestionDisplayContent", () => {
  it("returns translated question and option text", () => {
    expect(
      resolveSurveyQuestionDisplayContent({
        originalContent,
        translationPreview: buildPreview({ mode: "translated" }),
      })
    ).toEqual({
      questionText: "Couleur preferee ?",
      options: [
        { optionSlugId: "red", optionText: "Rouge" },
        { optionSlugId: "blue", optionText: "Bleu" },
      ],
    });
  });

  it("falls back to source text for incomplete translated variants", () => {
    expect(
      resolveSurveyQuestionDisplayContent({
        originalContent,
        translationPreview: buildPreview({
          mode: "translated",
          translatedQuestionText: "",
          translatedOptions: [{ optionSlugId: "red", optionText: "Rouge" }],
        }),
      })
    ).toEqual({
      questionText: "Favorite color?",
      options: [
        { optionSlugId: "red", optionText: "Rouge" },
        { optionSlugId: "blue", optionText: "Blue" },
      ],
    });
  });

  it("returns source text in original mode", () => {
    expect(
      resolveSurveyQuestionDisplayContent({
        originalContent,
        translationPreview: buildPreview({ mode: "original" }),
      })
    ).toEqual(originalContent);
  });
});

describe("survey question source identity", () => {
  it("detects option-only source changes", () => {
    expect(
      areSurveyQuestionContentsEqual({
        left: originalContent,
        right: {
          ...originalContent,
          options: [
            { optionSlugId: "red", optionText: "Dark red" },
            { optionSlugId: "blue", optionText: "Blue" },
          ],
        },
      })
    ).toBe(false);
  });

  it("includes option text in the interaction source key", () => {
    const sourceVersion = "2d826a50-5f21-49e6-bf07-9ad86b17f9bb";
    const originalKey = getSurveyQuestionSourceKey({
      sourceVersion,
      content: originalContent,
    });
    const editedKey = getSurveyQuestionSourceKey({
      sourceVersion,
      content: {
        ...originalContent,
        options: [
          { optionSlugId: "red", optionText: "Dark red" },
          { optionSlugId: "blue", optionText: "Blue" },
        ],
      },
    });

    expect(editedKey).not.toBe(originalKey);
  });
});
