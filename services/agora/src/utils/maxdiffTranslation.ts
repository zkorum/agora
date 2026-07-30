import type { MaxDiffItem } from "src/shared/types/dto";

export function hasPendingMaxDiffItemTranslations(
  items: readonly MaxDiffItem[] | undefined
): boolean {
  return (
    items?.some(({ displayContent }) => {
      const status = displayContent.translationControl?.status;
      return status === "pending" || status === "running";
    }) ?? false
  );
}
