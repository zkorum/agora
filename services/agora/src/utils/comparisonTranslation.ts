import type { PrioritizationItem } from "src/shared/types/dto";

export function hasPendingComparisonItemTranslations(
  items: readonly PrioritizationItem[] | undefined
): boolean {
  return (
    items?.some(({ displayContent }) => {
      const status = displayContent.translationControl?.status;
      return status === "pending" || status === "running";
    }) ?? false
  );
}
