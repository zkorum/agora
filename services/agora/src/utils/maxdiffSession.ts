import type { MaxDiffComparison } from "src/shared/types/zod";
import { type MaxDiffInstance, restoreMaxDiff } from "src/shared/utils/maxdiff";

export type MaxDiffSelection =
  | { kind: "none" }
  | { kind: "best"; best: string }
  | { kind: "comparison"; best: string; worst: string };

export function reconcileMaxDiffItems({
  instance,
  items,
}: {
  instance: MaxDiffInstance;
  items: string[];
}): MaxDiffInstance {
  const existing = instance.items;
  const incoming = new Set(items);
  if (existing.length === incoming.size && existing.every(item => incoming.has(item))) {
    return instance;
  }
  return restoreMaxDiff({ items, comparisons: instance.exportState().comparisons });
}

export function haveSameMaxDiffComparisons({
  left,
  right,
}: {
  left: readonly MaxDiffComparison[];
  right: readonly MaxDiffComparison[];
}): boolean {
  return left.length === right.length && left.every((comparison, index) => {
    const other = right[index];
    return other !== undefined && comparison.best === other.best &&
      comparison.worst === other.worst && comparison.set.length === other.set.length &&
      comparison.set.every(item => other.set.includes(item));
  });
}
