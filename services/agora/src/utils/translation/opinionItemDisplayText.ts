import type { DisplayedOpinionItem } from "src/shared/types/zod";

import type { ContentTranslationDisplayMode } from "./contentTranslation";

export interface OpinionTranslationDisplaySource {
  displayContent: DisplayedOpinionItem["displayContent"];
}

export function getPendingOpinionTranslationMode(
  opinionItem: OpinionTranslationDisplaySource
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
