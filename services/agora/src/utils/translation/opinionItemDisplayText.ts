import type { DisplayedOpinionItem } from "src/shared/types/zod";

export function getInitialOpinionDisplayText(
  opinionItem: DisplayedOpinionItem
): string {
  const displayContent = opinionItem.displayContent;
  return displayContent.status === "available" &&
    displayContent.mode === "translated"
    ? displayContent.content.content
    : opinionItem.opinion;
}
