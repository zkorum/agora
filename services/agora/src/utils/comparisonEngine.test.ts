import { zodComparisonSessionState } from "src/shared/types/zod";
import { describe, expect, it } from "vitest";

import {
  type ComparisonEngine,
  createComparisonEngine,
  recordComparisonAnswer,
  restoreComparisonEngine,
} from "../shared/utils/comparisonEngine";

/** Deterministic voting simulation: always picks first as best, last as worst. */
function simulateVotingToCompletion({
  instance,
  candidateLimit = 4,
  maxRounds = 500,
}: {
  instance: ComparisonEngine;
  candidateLimit?: number;
  maxRounds?: number;
}): number {
  let rounds = 0;
  while (!instance.complete && rounds < maxRounds) {
    const candidates = instance.getCandidates(candidateLimit);
    if (candidates.length < 2) break;
    recordComparisonAnswer({
      instance,
      candidates,
      best: candidates[0],
      worst: candidates[candidates.length - 1],
    });
    rounds++;
  }
  return rounds;
}

describe("createComparisonEngine", () => {
  it("returns an unresolved binary edge without clique enumeration", () => {
    const instance = createComparisonEngine(
      Array.from({ length: 300 }, (_, index) => `item-${index}`)
    );
    expect(instance.getCandidates(2)).toEqual(["item-0", "item-1"]);
    instance.recordAnswer({
      best: "item-0",
      worst: "item-1",
      set: ["item-0", "item-1"],
    });
    expect(instance.getCandidates(2)).toEqual(["item-0", "item-2"]);
  });

  it("has no binary candidates after completion", () => {
    const instance = createComparisonEngine(["a", "b"]);
    instance.recordAnswer({ best: "b", worst: "a", set: ["a", "b"] });
    expect(instance.getCandidates(2)).toEqual([]);
  });
  describe("single item", () => {
    it("is immediately complete", () => {
      const instance = createComparisonEngine(["a"]);
      expect(instance.items).toEqual(["a"]);
      expect(instance.complete).toBe(true);
      expect(instance.progress).toBe(1);
      expect(instance.result).toEqual(["a"]);
      expect(instance.getUnorderedPairs()).toEqual([]);
      expect(instance.getOrderedPairs()).toEqual([]);
    });
  });

  describe("two items", () => {
    it("starts incomplete and completes after one ordering", () => {
      const instance = createComparisonEngine(["a", "b"]);
      expect(instance.items).toEqual(["a", "b"]);
      expect(instance.complete).toBe(false);
      expect(instance.progress).toBe(0);
      expect(instance.result).toBeUndefined();
      expect(instance.getUnorderedPairs()).toEqual([["a", "b"]]);
      expect(instance.getOrderedPairs()).toEqual([]);

      instance.recordAnswer({ best: "b", worst: "a", set: ["a", "b"] });
      expect(instance.complete).toBe(true);
      expect(instance.progress).toBe(1);
      expect(instance.result).toEqual(["b", "a"]);
    });
  });

  describe("three items", () => {
    it("starts with all pairs unordered", () => {
      const instance = createComparisonEngine(["a", "b", "c"]);
      expect(instance.items).toEqual(["a", "b", "c"]);
      expect(instance.complete).toBe(false);
      expect(instance.progress).toBe(0);
      expect(instance.getUnorderedPairs()).toEqual([
        ["a", "b"],
        ["a", "c"],
        ["b", "c"],
      ]);
    });

    it("uses transitive closure to reduce comparisons needed", () => {
      const instance = createComparisonEngine(["a", "b", "c"]);

      // Order c before b, then b before a
      // Transitive: c should also be before a
      instance.recordAnswer({ best: "c", worst: "b", set: ["b", "c"] });
      expect(instance.complete).toBe(false);
      expect(instance.progress).toBeCloseTo(1 / 3);

      instance.recordAnswer({ best: "b", worst: "a", set: ["a", "b"] });
      // Transitive closure: c < b < a means c < a is inferred
      expect(instance.complete).toBe(true);
      expect(instance.result).toEqual(["c", "b", "a"]);
    });

    it("completes with two explicit orderings when transitive applies", () => {
      const instance = createComparisonEngine(["a", "b", "c"]);
      instance.recordAnswer({ best: "c", worst: "a", set: ["a", "c"] });
      expect(instance.progress).toBeCloseTo(1 / 3);

      instance.recordAnswer({ best: "c", worst: "b", set: ["b", "c"] });
      // c < a and c < b are known, but a vs b is still unknown
      expect(instance.complete).toBe(false);
      expect(instance.progress).toBeCloseTo(2 / 3);

      instance.recordAnswer({ best: "b", worst: "a", set: ["a", "b"] });
      expect(instance.complete).toBe(true);
      expect(instance.result).toEqual(["c", "b", "a"]);
    });
  });

  describe("deduplication", () => {
    it("deduplicates items", () => {
      const instance = createComparisonEngine(["a", "b", "a"]);
      expect(instance.items).toEqual(["a", "b"]);
    });
  });
});

describe("getCandidates", () => {
  it("returns candidates from the largest unordered group", () => {
    const instance = createComparisonEngine(["a", "b", "c", "d", "e"]);
    const candidates = instance.getCandidates(4);
    expect(candidates.length).toBeLessThanOrEqual(4);
    expect(candidates.length).toBeGreaterThan(0);
    // All candidates should be valid items
    for (const c of candidates) {
      expect(instance.items).toContain(c);
    }
  });

  it("returns empty array when complete", () => {
    const instance = createComparisonEngine(["a"]);
    expect(instance.getCandidates()).toEqual([]);
  });

  it("returns items closest to requested limit", () => {
    const instance = createComparisonEngine(["a", "b", "c"]);
    const candidates = instance.getCandidates(4);
    // With 3 items and one unordered group, should return up to 3
    expect(candidates.length).toBe(3);
  });
});

describe("recordComparisonAnswer", () => {
  it.each([
    { best: "a", worst: "", set: ["a", "b"] },
    { best: "a", worst: "a", set: ["a", "b"] },
    { best: "a", worst: "c", set: ["a", "b"] },
    { best: "a", worst: "b", set: ["a", "b", "b"] },
  ])("rejects invalid answers without changing state: %j", (answer) => {
    const instance = createComparisonEngine(["a", "b", "c"]);
    const before = instance.exportState();
    expect(() => instance.recordAnswer(answer)).toThrow();
    expect(instance.exportState()).toEqual(before);
    expect(instance.progress).toBe(0);
  });

  it("exports schema-valid answers without sharing caller-owned arrays", () => {
    const instance = createComparisonEngine(["a", "b", "c"]);
    const answer = { best: "a", worst: "c", set: ["c", "a", "b"] };
    instance.recordAnswer(answer);
    answer.set.reverse();
    answer.worst = "b";
    const state = instance.exportState();
    expect(state.comparisons).toEqual([
      { best: "a", worst: "c", set: ["c", "a", "b"] },
    ]);
    expect(
      zodComparisonSessionState.safeParse({
        comparisons: state.comparisons,
        ranking: instance.result ?? null,
        isComplete: instance.complete,
      }).success
    ).toBe(true);
  });

  it("records a vote and advances progress", () => {
    const instance = createComparisonEngine(["a", "b", "c", "d"]);
    const candidates = instance.getCandidates(4);
    expect(candidates.length).toBe(4);

    const best = candidates[0];
    const worst = candidates[candidates.length - 1];

    recordComparisonAnswer({ instance, candidates, best, worst });

    expect(instance.progress).toBeGreaterThan(0);
  });

  it("reaches completion through repeated votes", () => {
    const instance = createComparisonEngine(["a", "b", "c", "d", "e"]);

    const rounds = simulateVotingToCompletion({
      instance,
      maxRounds: 20,
    });

    expect(rounds).toBeLessThan(20);
    expect(instance.complete).toBe(true);
    expect(instance.result).toBeDefined();
    expect(instance.result?.length).toBe(5);
  });
});

describe("progress tracking with ordered/unordered pairs", () => {
  it("ordered pairs increase after a vote (not just round count)", () => {
    const instance = createComparisonEngine(["a", "b", "c", "d"]);

    // Before any vote: 0 ordered, 6 total pairs
    const orderedBefore = instance.getOrderedPairs().length;
    const totalBefore = orderedBefore + instance.getUnorderedPairs().length;
    expect(orderedBefore).toBe(0);
    expect(totalBefore).toBe(6); // 4*(4-1)/2

    // Do one vote with all 4 candidates
    const candidates = instance.getCandidates(4);
    recordComparisonAnswer({
      instance,
      candidates,
      best: candidates[0],
      worst: candidates[candidates.length - 1],
    });

    // After one vote, multiple pairs should be resolved via transitive closure
    const orderedAfter = instance.getOrderedPairs().length;
    const totalAfter = orderedAfter + instance.getUnorderedPairs().length;

    // Total pairs stays constant at 6
    expect(totalAfter).toBe(6);

    // More than 1 pair should be resolved (transitive closure)
    expect(orderedAfter).toBeGreaterThan(1);

    // Progress should match ordered/total
    expect(instance.progress).toBeCloseTo(orderedAfter / totalAfter);
  });

  it("reaches all pairs ordered when complete", () => {
    const instance = createComparisonEngine(["a", "b", "c", "d"]);
    const totalPairs = 6; // 4*(4-1)/2

    while (!instance.complete) {
      const candidates = instance.getCandidates(4);
      if (candidates.length < 2) break;
      recordComparisonAnswer({
        instance,
        candidates,
        best: candidates[0],
        worst: candidates[candidates.length - 1],
      });
    }

    expect(instance.getOrderedPairs().length).toBe(totalPairs);
    expect(instance.getUnorderedPairs().length).toBe(0);
    expect(instance.progress).toBe(1);
  });
});

describe("exportState and restoreComparisonEngine", () => {
  it("restores a partially completed session", () => {
    const instance = createComparisonEngine(["a", "b", "c", "d"]);

    // Do a few votes
    const candidates1 = instance.getCandidates(4);
    recordComparisonAnswer({
      instance,
      candidates: candidates1,
      best: candidates1[0],
      worst: candidates1[candidates1.length - 1],
    });

    const progressBefore = instance.progress;
    const state = instance.exportState();

    // Restore
    const restored = restoreComparisonEngine(state);
    expect(restored.progress).toBeCloseTo(progressBefore, 5);
    expect(restored.complete).toBe(instance.complete);
  });

  it("restores a completed session", () => {
    const instance = createComparisonEngine(["a", "b", "c"]);

    while (!instance.complete) {
      const candidates = instance.getCandidates(4);
      if (candidates.length < 2) break;
      recordComparisonAnswer({
        instance,
        candidates,
        best: candidates[0],
        worst: candidates[candidates.length - 1],
      });
    }

    const state = instance.exportState();
    const restored = restoreComparisonEngine(state);
    expect(restored.complete).toBe(true);
    expect(restored.result).toEqual(instance.result);
  });

  it("state round-trips through JSON serialization", () => {
    const instance = createComparisonEngine(["x", "y", "z"]);
    const candidates = instance.getCandidates(3);
    recordComparisonAnswer({
      instance,
      candidates,
      best: candidates[0],
      worst: candidates[candidates.length - 1],
    });

    const state = instance.exportState();
    const json = JSON.stringify(state);
    const parsed = JSON.parse(json);
    const restored = restoreComparisonEngine(parsed);

    expect(restored.progress).toBeCloseTo(instance.progress, 5);
  });
});

describe("undo via restoreComparisonEngine", () => {
  it("restoring with fewer comparisons reverts progress", () => {
    const instance = createComparisonEngine(["a", "b", "c", "d"]);

    // First vote
    const candidates1 = instance.getCandidates(4);
    recordComparisonAnswer({
      instance,
      candidates: candidates1,
      best: candidates1[0],
      worst: candidates1[candidates1.length - 1],
    });
    const progressAfterFirst = instance.progress;
    const stateAfterFirst = instance.exportState();

    // Second vote
    const candidates2 = instance.getCandidates(4);
    if (candidates2.length >= 2) {
      recordComparisonAnswer({
        instance,
        candidates: candidates2,
        best: candidates2[0],
        worst: candidates2[candidates2.length - 1],
      });
    }

    // Undo second vote by restoring with only first comparison
    const restored = restoreComparisonEngine({
      items: stateAfterFirst.items,
      comparisons: stateAfterFirst.comparisons,
    });

    expect(restored.progress).toBeCloseTo(progressAfterFirst, 5);
    expect(restored.complete).toBe(false);
  });

  it("restoring with empty comparisons gives fresh state", () => {
    const instance = createComparisonEngine(["a", "b", "c", "d"]);

    const candidates = instance.getCandidates(4);
    recordComparisonAnswer({
      instance,
      candidates,
      best: candidates[0],
      worst: candidates[candidates.length - 1],
    });

    // Undo all by restoring with no comparisons
    const restored = restoreComparisonEngine({
      items: instance.items,
      comparisons: [],
    });

    expect(restored.progress).toBe(0);
    expect(restored.complete).toBe(false);
    expect(restored.getUnorderedPairs().length).toBe(6); // 4*(4-1)/2
  });

  it("removed comparison set field contains valid candidates", () => {
    const instance = createComparisonEngine(["a", "b", "c", "d", "e"]);

    const candidates = instance.getCandidates(4);
    recordComparisonAnswer({
      instance,
      candidates,
      best: candidates[0],
      worst: candidates[candidates.length - 1],
    });

    const state = instance.exportState();
    const lastComparison = state.comparisons[state.comparisons.length - 1];

    // The set should contain all candidates from the round
    expect(lastComparison.set.length).toBe(4);
    for (const item of lastComparison.set) {
      expect(instance.items).toContain(item);
    }
  });

  it("undo from completed state returns to incomplete", () => {
    const instance = createComparisonEngine(["a", "b", "c"]);

    while (!instance.complete) {
      const candidates = instance.getCandidates(4);
      if (candidates.length < 2) break;
      recordComparisonAnswer({
        instance,
        candidates,
        best: candidates[0],
        worst: candidates[candidates.length - 1],
      });
    }

    expect(instance.complete).toBe(true);

    // Undo last vote
    const state = instance.exportState();
    const remaining = state.comparisons.slice(0, -1);
    const restored = restoreComparisonEngine({
      items: state.items,
      comparisons: remaining,
    });

    expect(restored.complete).toBe(false);
    expect(restored.result).toBeUndefined();
  });
});
