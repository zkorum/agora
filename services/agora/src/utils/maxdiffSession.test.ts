import { createMaxDiff, recordMaxDiffVote } from "src/shared/utils/maxdiff";
import { describe, expect, it } from "vitest";

import { getMaxDiffProgressPercent } from "./maxdiffProgress";
import { haveSameMaxDiffComparisons, reconcileMaxDiffItems } from "./maxdiffSession";

describe("prioritization progress and catalog reconciliation", () => {
  it("never displays 100% while a pair remains unresolved", () => {
    const items = Array.from({ length: 40 }, (_, index) => `item-${index}`);
    const instance = createMaxDiff(items);
    for (const [index, item] of items.entries()) {
      if (index < items.length - 2) instance.orderBefore(item, items.slice(index + 1));
    }
    expect(instance.getUnorderedPairs()).toHaveLength(1);
    expect(Math.round(instance.progress * 100)).toBe(100);
    expect(getMaxDiffProgressPercent({ progress: instance.progress, complete: instance.complete })).toBe(99);

    const lastPair = instance.getUnorderedPairs().at(0);
    if (lastPair === undefined) throw new Error("Expected an unresolved test pair");
    instance.orderBefore(lastPair[0], [lastPair[1]]);
    expect(getMaxDiffProgressPercent({ progress: instance.progress, complete: instance.complete })).toBe(100);
  });

  it("reopens a complete ranking when a new item arrives, retaining history", () => {
    const instance = createMaxDiff(["a", "b"]);
    recordMaxDiffVote({ instance, candidates: ["a", "b"], best: "a", worst: "b" });
    expect(instance.complete).toBe(true);
    const reconciled = reconcileMaxDiffItems({ instance, items: ["a", "b", "c"] });
    expect(reconciled.items).toEqual(["a", "b", "c"]);
    expect(reconciled.complete).toBe(false);
    expect(reconciled.exportState().comparisons).toHaveLength(1);
    expect(reconciled.getOrderedPairs()).toEqual([["a", "b"]]);
    expect(instance.items).toEqual(["a", "b"]);
  });

  it("keeps the engine when only wording/order changes, and removes inactive items", () => {
    const instance = createMaxDiff(["a", "b", "c"]);
    recordMaxDiffVote({ instance, candidates: ["a", "b", "c"], best: "a", worst: "c" });
    expect(reconcileMaxDiffItems({ instance, items: ["c", "a", "b"] })).toBe(instance);
    const reconciled = reconcileMaxDiffItems({ instance, items: ["a", "b"] });
    expect(reconciled.items).toEqual(["a", "b"]);
    expect(reconciled.complete).toBe(false);
    expect(reconciled.getOrderedPairs()).toEqual([]);
  });

  it("compares ordered history semantically without treating shuffled sets as different votes", () => {
    expect(haveSameMaxDiffComparisons({
      left: [{ best: "a", worst: "c", set: ["a", "b", "c"] }],
      right: [{ best: "a", worst: "c", set: ["c", "a", "b"] }],
    })).toBe(true);
    expect(haveSameMaxDiffComparisons({
      left: [{ best: "a", worst: "c", set: ["a", "b", "c"] }],
      right: [],
    })).toBe(false);
  });

  it("preserves the exact displayed candidate order through recording, replay, and Undo snapshots", () => {
    const candidates = ["c", "a", "d", "b"];
    const instance = createMaxDiff(candidates);
    recordMaxDiffVote({ instance, candidates, best: "d", worst: "c" });
    const snapshot = instance.exportState();
    expect(snapshot.comparisons.at(-1)?.set).toEqual(candidates);
    const restored = reconcileMaxDiffItems({ instance, items: [...candidates, "new"] });
    expect(restored.exportState().comparisons.at(-1)?.set).toEqual(candidates);
    snapshot.comparisons.at(-1)?.set.reverse();
    expect(instance.exportState().comparisons.at(-1)?.set).toEqual(candidates);
  });

  it("keeps constant-time progress/count getters equal to the enumerated matrix across repeated comparisons", () => {
    const items = ["a", "b", "c", "d", "e"];
    const instance = createMaxDiff(items);
    const rounds = [
      { best: "a", worst: "d", set: ["a", "b", "c", "d"] },
      { best: "e", worst: "b", set: ["b", "c", "d", "e"] },
      { best: "d", worst: "a", set: ["d", "a", "e", "c"] },
      { best: "a", worst: "d", set: ["a", "b", "c", "d"] },
    ];
    for (const [index, round] of rounds.entries()) {
      instance.recordComparison(round);
      expect(instance.itemCount).toBe(items.length);
      expect(instance.comparisonCount).toBe(index + 1);
      expect(instance.progress).toBe(instance.getOrderedPairs().length / 10);
    }
    const restored = reconcileMaxDiffItems({ instance, items: [...items, "new"] });
    expect(restored.progress).toBe(restored.getOrderedPairs().length / 15);
    expect(restored.comparisonCount).toBe(rounds.length);
  });
});
