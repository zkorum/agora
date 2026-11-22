import {
  createComparisonEngine,
  recordComparisonAnswer,
} from "src/shared/utils/comparisonEngine";
import { describe, expect, it } from "vitest";

import { getComparisonProgressPercent } from "./comparisonProgress";
import {
  haveSameComparisonAnswers,
  reconcileComparisonItems,
  selectPairwiseComparison,
} from "./comparisonSession";

describe("pairwise selection", () => {
  it.each(["a", "b"])("completes an answer with either choice (%s)", (best) => {
    expect(selectPairwiseComparison({ candidates: ["b", "a"], best })).toEqual({
      kind: "comparison",
      best,
      worst: best === "a" ? "b" : "a",
    });
  });

  it.each([[], ["a"], ["a", "a"], ["a", "b", "c"], ["b", "c"]])(
    "rejects missing, duplicate or non-binary tasks: %j",
    (...candidates) => {
      expect(
        selectPairwiseComparison({ candidates, best: "a" })
      ).toBeUndefined();
    }
  );
});

describe("prioritization progress and catalog reconciliation", () => {
  it("never displays 100% while a pair remains unresolved", () => {
    const items = Array.from({ length: 40 }, (_, index) => `item-${index}`);
    const instance = createComparisonEngine(items);
    for (const [index, item] of items.entries()) {
      if (index < items.length - 2)
        for (const other of items.slice(index + 1))
          instance.recordAnswer({
            best: item,
            worst: other,
            set: [item, other],
          });
    }
    expect(instance.getUnorderedPairs()).toHaveLength(1);
    expect(Math.round(instance.progress * 100)).toBe(100);
    expect(
      getComparisonProgressPercent({
        progress: instance.progress,
        complete: instance.complete,
      })
    ).toBe(99);

    const lastPair = instance.getUnorderedPairs().at(0);
    if (lastPair === undefined)
      throw new Error("Expected an unresolved test pair");
    instance.recordAnswer({
      best: lastPair[0],
      worst: lastPair[1],
      set: lastPair,
    });
    expect(
      getComparisonProgressPercent({
        progress: instance.progress,
        complete: instance.complete,
      })
    ).toBe(100);
  });

  it("reopens a complete ranking when a new item arrives, retaining history", () => {
    const instance = createComparisonEngine(["a", "b"]);
    recordComparisonAnswer({
      instance,
      candidates: ["a", "b"],
      best: "a",
      worst: "b",
    });
    expect(instance.complete).toBe(true);
    const reconciled = reconcileComparisonItems({
      instance,
      items: ["a", "b", "c"],
    });
    expect(reconciled.items).toEqual(["a", "b", "c"]);
    expect(reconciled.complete).toBe(false);
    expect(reconciled.exportState().comparisons).toHaveLength(1);
    expect(reconciled.getOrderedPairs()).toEqual([["a", "b"]]);
    expect(instance.items).toEqual(["a", "b"]);
  });

  it("keeps the engine when only wording/order changes, and removes inactive items", () => {
    const instance = createComparisonEngine(["a", "b", "c"]);
    recordComparisonAnswer({
      instance,
      candidates: ["a", "b", "c"],
      best: "a",
      worst: "c",
    });
    expect(reconcileComparisonItems({ instance, items: ["c", "a", "b"] })).toBe(
      instance
    );
    const reconciled = reconcileComparisonItems({
      instance,
      items: ["a", "b"],
    });
    expect(reconciled.items).toEqual(["a", "b"]);
    expect(reconciled.complete).toBe(false);
    expect(reconciled.getOrderedPairs()).toEqual([]);
  });

  it("compares exact answer history, including displayed candidate order", () => {
    expect(
      haveSameComparisonAnswers({
        left: [{ best: "a", worst: "c", set: ["a", "b", "c"] }],
        right: [{ best: "a", worst: "c", set: ["c", "a", "b"] }],
      })
    ).toBe(false);
    expect(
      haveSameComparisonAnswers({
        left: [{ best: "a", worst: "c", set: ["a", "b", "c"] }],
        right: [{ best: "a", worst: "c", set: ["a", "b", "c"] }],
      })
    ).toBe(true);
    expect(
      haveSameComparisonAnswers({
        left: [{ best: "a", worst: "c", set: ["a", "b", "c"] }],
        right: [],
      })
    ).toBe(false);
  });

  it("preserves the exact displayed candidate order through recording, replay, and Undo snapshots", () => {
    const candidates = ["c", "a", "d", "b"];
    const instance = createComparisonEngine(candidates);
    recordComparisonAnswer({ instance, candidates, best: "d", worst: "c" });
    const snapshot = instance.exportState();
    expect(snapshot.comparisons.at(-1)?.set).toEqual(candidates);
    const restored = reconcileComparisonItems({
      instance,
      items: [...candidates, "new"],
    });
    expect(restored.exportState().comparisons.at(-1)?.set).toEqual(candidates);
    snapshot.comparisons.at(-1)?.set.reverse();
    expect(instance.exportState().comparisons.at(-1)?.set).toEqual(candidates);
  });

  it("keeps constant-time progress/count getters equal to the enumerated matrix across repeated comparisons", () => {
    const items = ["a", "b", "c", "d", "e"];
    const instance = createComparisonEngine(items);
    const rounds = [
      { best: "a", worst: "d", set: ["a", "b", "c", "d"] },
      { best: "e", worst: "b", set: ["b", "c", "d", "e"] },
      { best: "d", worst: "a", set: ["d", "a", "e", "c"] },
      { best: "a", worst: "d", set: ["a", "b", "c", "d"] },
    ];
    for (const [index, round] of rounds.entries()) {
      instance.recordAnswer(round);
      expect(instance.itemCount).toBe(items.length);
      expect(instance.comparisonCount).toBe(index + 1);
      expect(instance.progress).toBe(instance.getOrderedPairs().length / 10);
    }
    const restored = reconcileComparisonItems({
      instance,
      items: [...items, "new"],
    });
    expect(restored.progress).toBe(restored.getOrderedPairs().length / 15);
    expect(restored.comparisonCount).toBe(rounds.length);
  });
});
