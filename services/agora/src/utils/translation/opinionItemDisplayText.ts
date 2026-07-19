import type { DisplayedOpinionItem } from "src/shared/types/zod";

import type { ContentTranslationDisplayMode } from "./contentTranslation";

export function getInitialOpinionDisplayText(
  opinionItem: DisplayedOpinionItem
): string {
  const displayContent = opinionItem.displayContent;
  return displayContent.status === "available" &&
    displayContent.mode === "translated"
    ? displayContent.content.content
    : opinionItem.opinion;
}

export function getPendingOpinionTranslationMode(
  opinionItem: DisplayedOpinionItem
): ContentTranslationDisplayMode | undefined {
  const translationControl = opinionItem.displayContent.translationControl;
  if (
    translationControl === null ||
    (translationControl.status !== "pending" &&
      translationControl.status !== "running")
  ) {
    return undefined;
  }

  return translationControl.alternateMode;
}
