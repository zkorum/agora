import type { ComparisonAnswer } from "src/shared/types/zod";
import {
  type ComparisonEngine,
  restoreComparisonEngine,
} from "src/shared/utils/comparisonEngine";

export type ComparisonSelection =
  | { kind: "none" }
  | { kind: "best"; best: string }
  | { kind: "comparison"; best: string; worst: string };

export function isPairwiseCandidateSet(
  candidates: readonly string[]
): candidates is readonly [string, string] {
  return candidates.length === 2 && candidates[0] !== candidates[1];
}

export function selectPairwiseComparison({
  candidates,
  best,
}: {
  candidates: readonly string[];
  best: string;
}): Extract<ComparisonSelection, { kind: "comparison" }> | undefined {
  if (!isPairwiseCandidateSet(candidates)) return undefined;
  const [first, second] = candidates;
  if (best === first) return { kind: "comparison", best, worst: second };
  if (best === second) return { kind: "comparison", best, worst: first };
  return undefined;
}

export function reconcileComparisonItems({
  instance,
  items,
}: {
  instance: ComparisonEngine;
  items: string[];
}): ComparisonEngine {
  const existing = instance.items;
  const incoming = new Set(items);
  if (
    existing.length === incoming.size &&
    existing.every((item) => incoming.has(item))
  ) {
    return instance;
  }
  return restoreComparisonEngine({
    items,
    comparisons: instance.exportState().comparisons,
  });
}

export function haveSameComparisonAnswers({
  left,
  right,
}: {
  left: readonly ComparisonAnswer[];
  right: readonly ComparisonAnswer[];
}): boolean {
  return (
    left.length === right.length &&
    left.every((comparison, index) => {
      const other = right[index];
      return (
        other !== undefined &&
        comparison.best === other.best &&
        comparison.worst === other.worst &&
        comparison.set.length === other.set.length &&
        comparison.set.every((item, position) => other.set[position] === item)
      );
    })
  );
}
