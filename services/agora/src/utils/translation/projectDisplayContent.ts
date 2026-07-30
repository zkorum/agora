import type {
  ProjectContentVariant,
  ProjectDisplayedContent,
} from "src/shared/types/zod";

import type { ProjectContentTranslationPreview } from "./useContentTranslationPreview";

export function resolveProjectTranslationPreview({
  requestedPreview,
  initialPreview,
}: {
  requestedPreview: ProjectContentTranslationPreview | undefined;
  initialPreview: ProjectContentTranslationPreview | undefined;
}): ProjectContentTranslationPreview | undefined {
  if (requestedPreview === undefined) {
    return initialPreview;
  }
  const requestedContent =
    requestedPreview.mode === "translated"
      ? requestedPreview.translatedContent
      : requestedPreview.originalContent;
  if (
    requestedContent === undefined &&
    initialPreview !== undefined &&
    initialPreview.mode !== requestedPreview.mode
  ) {
    return {
      ...initialPreview,
      sourceLanguageLabel:
        requestedPreview.sourceLanguageLabel ??
        initialPreview.sourceLanguageLabel,
      translationStatus: requestedPreview.translationStatus,
    };
  }
  return requestedPreview;
}

export function resolveProjectContentVariant({
  displayContent,
  translationPreview,
}: {
  displayContent: ProjectDisplayedContent;
  translationPreview: ProjectContentTranslationPreview | undefined;
}): ProjectContentVariant | undefined {
  if (translationPreview === undefined) {
    return displayContent.status === "available"
      ? displayContent.content
      : undefined;
  }

  const content =
    translationPreview.mode === "translated"
      ? translationPreview.translatedContent
      : translationPreview.originalContent;
  if (content === undefined) {
    return displayContent.status === "available" &&
      displayContent.mode === translationPreview.mode
      ? displayContent.content
      : undefined;
  }
  return content;
}
