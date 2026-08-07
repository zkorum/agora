import type { SurveyQuestionContentVariant } from "src/shared/types/zod";

import type { SurveyQuestionContentTranslationPreview } from "./useContentTranslationPreview";

export function areSurveyQuestionContentsEqual({
  left,
  right,
}: {
  left: SurveyQuestionContentVariant | undefined;
  right: SurveyQuestionContentVariant;
}): boolean {
  return (
    left?.questionText === right.questionText &&
    left.options.length === right.options.length &&
    left.options.every(
      (option, index) =>
        option.optionSlugId === right.options[index]?.optionSlugId &&
        option.optionText === right.options[index]?.optionText
    )
  );
}

export function getSurveyQuestionSourceKey({
  sourceVersion,
  content,
}: {
  sourceVersion: string | undefined;
  content: SurveyQuestionContentVariant;
}): string | undefined {
  return sourceVersion === undefined
    ? undefined
    : JSON.stringify({ sourceVersion, content });
}

export function resolveSurveyQuestionDisplayContent({
  originalContent,
  translationPreview,
}: {
  originalContent: SurveyQuestionContentVariant;
  translationPreview: SurveyQuestionContentTranslationPreview | undefined;
}): SurveyQuestionContentVariant {
  if (
    translationPreview?.mode !== "translated" ||
    translationPreview.translationStatus !== "completed"
  ) {
    return originalContent;
  }

  const translatedOptionsBySlugId = new Map(
    translationPreview.translatedOptions.map((option) => [
      option.optionSlugId,
      option.optionText,
    ])
  );
  return {
    questionText:
      translationPreview.translatedQuestionText.length > 0
        ? translationPreview.translatedQuestionText
        : originalContent.questionText,
    options: originalContent.options.map((option) => ({
      ...option,
      optionText:
        translatedOptionsBySlugId.get(option.optionSlugId) ?? option.optionText,
    })),
  };
}
