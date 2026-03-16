import { describe, expect, it } from "vitest";

import {
    aggregateMaxDiffResults,
    createMaxDiff,
    derivePartialRanking,
    recordMaxDiffVote,
    restoreMaxDiff,
} from "./maxdiff";

describe("createMaxDiff", () => {
    describe("single item", () => {
        it("is immediately complete", () => {
            const instance = createMaxDiff(["a"]);
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
            const instance = createMaxDiff(["a", "b"]);
            expect(instance.items).toEqual(["a", "b"]);
            expect(instance.complete).toBe(false);
            expect(instance.progress).toBe(0);
            expect(instance.result).toBeUndefined();
            expect(instance.getUnorderedPairs()).toEqual([["a", "b"]]);
            expect(instance.getOrderedPairs()).toEqual([]);

            instance.orderBefore("b", ["a"]);
            instance.orderAfter("a", ["b"]);
            expect(instance.complete).toBe(true);
            expect(instance.progress).toBe(1);
            expect(instance.result).toEqual(["b", "a"]);
        });
    });

    describe("three items", () => {
        it("starts with all pairs unordered", () => {
            const instance = createMaxDiff(["a", "b", "c"]);
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
            const instance = createMaxDiff(["a", "b", "c"]);

            // Order c before b, then b before a
            // Transitive: c should also be before a
            instance.orderBefore("c", ["b"]);
            instance.orderAfter("b", ["c"]);
            expect(instance.complete).toBe(false);
            expect(instance.progress).toBeCloseTo(1 / 3);

            instance.orderBefore("b", ["a"]);
            instance.orderAfter("a", ["b"]);
            // Transitive closure: c < b < a means c < a is inferred
            expect(instance.complete).toBe(true);
            expect(instance.result).toEqual(["c", "b", "a"]);
        });

        it("completes with two explicit orderings when transitive applies", () => {
            const instance = createMaxDiff(["a", "b", "c"]);
            instance.orderBefore("c", ["a"]);
            instance.orderAfter("a", ["c"]);
            expect(instance.progress).toBeCloseTo(1 / 3);

            instance.orderBefore("c", ["b"]);
            instance.orderAfter("b", ["c"]);
            // c < a and c < b are known, but a vs b is still unknown
            expect(instance.complete).toBe(false);
            expect(instance.progress).toBeCloseTo(2 / 3);

            instance.orderBefore("b", ["a"]);
            instance.orderAfter("a", ["b"]);
            expect(instance.complete).toBe(true);
            expect(instance.result).toEqual(["c", "b", "a"]);
        });
    });

    describe("deduplication", () => {
        it("deduplicates items", () => {
            const instance = createMaxDiff(["a", "b", "a"]);
            expect(instance.items).toEqual(["a", "b"]);
        });
    });
});

describe("getCandidates", () => {
    it("returns candidates from the largest unordered group", () => {
        const instance = createMaxDiff(["a", "b", "c", "d", "e"]);
        const candidates = instance.getCandidates(4);
        expect(candidates.length).toBeLessThanOrEqual(4);
        expect(candidates.length).toBeGreaterThan(0);
        // All candidates should be valid items
        for (const c of candidates) {
            expect(instance.items).toContain(c);
        }
    });

    it("returns empty array when complete", () => {
        const instance = createMaxDiff(["a"]);
        expect(instance.getCandidates()).toEqual([]);
    });

    it("returns items closest to requested limit", () => {
        const instance = createMaxDiff(["a", "b", "c"]);
        const candidates = instance.getCandidates(4);
        // With 3 items and one unordered group, should return up to 3
        expect(candidates.length).toBe(3);
    });
});

describe("recordMaxDiffVote", () => {
    it("records a vote and advances progress", () => {
        const instance = createMaxDiff(["a", "b", "c", "d"]);
        const candidates = instance.getCandidates(4);
        expect(candidates.length).toBe(4);

        const best = candidates[0];
        const worst = candidates[candidates.length - 1];

        recordMaxDiffVote({ instance, candidates, best, worst });

        expect(instance.progress).toBeGreaterThan(0);
    });

    it("reaches completion through repeated votes", () => {
        const instance = createMaxDiff(["a", "b", "c", "d", "e"]);

        let rounds = 0;
        while (!instance.complete) {
            const candidates = instance.getCandidates(4);
            if (candidates.length < 2) break;

            // Always pick first as best, last as worst (deterministic)
            recordMaxDiffVote({
                instance,
                candidates,
                best: candidates[0],
                worst: candidates[candidates.length - 1],
            });
            rounds++;

            // Safety: should not take more rounds than N*(N-1)/2
            expect(rounds).toBeLessThan(20);
        }

        expect(instance.complete).toBe(true);
        expect(instance.result).toBeDefined();
        expect(instance.result?.length).toBe(5);
    });
});

describe("progress tracking with ordered/unordered pairs", () => {
    it("ordered pairs increase after a vote (not just round count)", () => {
        const instance = createMaxDiff(["a", "b", "c", "d"]);

        // Before any vote: 0 ordered, 6 total pairs
        const orderedBefore = instance.getOrderedPairs().length;
        const totalBefore = orderedBefore + instance.getUnorderedPairs().length;
        expect(orderedBefore).toBe(0);
        expect(totalBefore).toBe(6); // 4*(4-1)/2

        // Do one vote with all 4 candidates
        const candidates = instance.getCandidates(4);
        recordMaxDiffVote({
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
        const instance = createMaxDiff(["a", "b", "c", "d"]);
        const totalPairs = 6; // 4*(4-1)/2

        while (!instance.complete) {
            const candidates = instance.getCandidates(4);
            if (candidates.length < 2) break;
            recordMaxDiffVote({
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

describe("exportState and restoreMaxDiff", () => {
    it("restores a partially completed session", () => {
        const instance = createMaxDiff(["a", "b", "c", "d"]);

        // Do a few votes
        const candidates1 = instance.getCandidates(4);
        recordMaxDiffVote({
            instance,
            candidates: candidates1,
            best: candidates1[0],
            worst: candidates1[candidates1.length - 1],
        });

        const progressBefore = instance.progress;
        const state = instance.exportState();

        // Restore
        const restored = restoreMaxDiff(state);
        expect(restored.progress).toBeCloseTo(progressBefore, 5);
        expect(restored.complete).toBe(instance.complete);
    });

    it("restores a completed session", () => {
        const instance = createMaxDiff(["a", "b", "c"]);

        while (!instance.complete) {
            const candidates = instance.getCandidates(4);
            if (candidates.length < 2) break;
            recordMaxDiffVote({
                instance,
                candidates,
                best: candidates[0],
                worst: candidates[candidates.length - 1],
            });
        }

        const state = instance.exportState();
        const restored = restoreMaxDiff(state);
        expect(restored.complete).toBe(true);
        expect(restored.result).toEqual(instance.result);
    });

    it("state round-trips through JSON serialization", () => {
        const instance = createMaxDiff(["x", "y", "z"]);
        const candidates = instance.getCandidates(3);
        recordMaxDiffVote({
            instance,
            candidates,
            best: candidates[0],
            worst: candidates[candidates.length - 1],
        });

        const state = instance.exportState();
        const json = JSON.stringify(state);
        const parsed = JSON.parse(json);
        const restored = restoreMaxDiff(parsed);

        expect(restored.progress).toBeCloseTo(instance.progress, 5);
    });
});

describe("undo via restoreMaxDiff", () => {
    it("restoring with fewer comparisons reverts progress", () => {
        const instance = createMaxDiff(["a", "b", "c", "d"]);

        // First vote
        const candidates1 = instance.getCandidates(4);
        recordMaxDiffVote({
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
            recordMaxDiffVote({
                instance,
                candidates: candidates2,
                best: candidates2[0],
                worst: candidates2[candidates2.length - 1],
            });
        }

        // Undo second vote by restoring with only first comparison
        const restored = restoreMaxDiff({
            items: stateAfterFirst.items,
            comparisons: stateAfterFirst.comparisons,
        });

        expect(restored.progress).toBeCloseTo(progressAfterFirst, 5);
        expect(restored.complete).toBe(false);
    });

    it("restoring with empty comparisons gives fresh state", () => {
        const instance = createMaxDiff(["a", "b", "c", "d"]);

        const candidates = instance.getCandidates(4);
        recordMaxDiffVote({
            instance,
            candidates,
            best: candidates[0],
            worst: candidates[candidates.length - 1],
        });

        // Undo all by restoring with no comparisons
        const restored = restoreMaxDiff({
            items: instance.items,
            comparisons: [],
        });

        expect(restored.progress).toBe(0);
        expect(restored.complete).toBe(false);
        expect(restored.getUnorderedPairs().length).toBe(6); // 4*(4-1)/2
    });

    it("removed comparison set field contains valid candidates", () => {
        const instance = createMaxDiff(["a", "b", "c", "d", "e"]);

        const candidates = instance.getCandidates(4);
        recordMaxDiffVote({
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
        const instance = createMaxDiff(["a", "b", "c"]);

        while (!instance.complete) {
            const candidates = instance.getCandidates(4);
            if (candidates.length < 2) break;
            recordMaxDiffVote({
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
        const restored = restoreMaxDiff({
            items: state.items,
            comparisons: remaining,
        });

        expect(restored.complete).toBe(false);
        expect(restored.result).toBeUndefined();
    });
});

describe("aggregateMaxDiffResults", () => {
    it("ranks items by average rank across users", () => {
        const allItems = ["a", "b", "c"];
        const rankings = [
            ["a", "b", "c"], // user1: a=1, b=2, c=3
            ["a", "c", "b"], // user2: a=1, c=2, b=3
            ["b", "a", "c"], // user3: b=1, a=2, c=3
        ];

        const results = aggregateMaxDiffResults({ rankings, allItems });

        // a: avg rank = (1+1+2)/3 = 1.33
        // b: avg rank = (2+3+1)/3 = 2.00
        // c: avg rank = (3+2+3)/3 = 2.67
        expect(results[0].item).toBe("a");
        expect(results[1].item).toBe("b");
        expect(results[2].item).toBe("c");
        expect(results[0].avgRank).toBeCloseTo(4 / 3);
        expect(results[1].avgRank).toBeCloseTo(2);
        expect(results[2].avgRank).toBeCloseTo(8 / 3);
    });

    it("computes normalized scores from 0 to 1", () => {
        const allItems = ["a", "b"];
        const rankings = [
            ["a", "b"], // a=1, b=2
            ["a", "b"], // a=1, b=2
        ];

        const results = aggregateMaxDiffResults({ rankings, allItems });

        // a: avg rank = 1, score = (2-1)/(2-1) = 1.0
        // b: avg rank = 2, score = (2-2)/(2-1) = 0.0
        expect(results[0].item).toBe("a");
        expect(results[0].score).toBeCloseTo(1.0);
        expect(results[1].item).toBe("b");
        expect(results[1].score).toBeCloseTo(0.0);
    });

    it("includes participant count per item", () => {
        const allItems = ["a", "b", "c"];
        const rankings = [
            ["a", "b"],    // user1 only ranked a, b (partial)
            ["a", "b", "c"],
        ];

        const results = aggregateMaxDiffResults({ rankings, allItems });

        const itemA = results.find((r) => r.item === "a");
        const itemC = results.find((r) => r.item === "c");

        expect(itemA).toBeDefined();
        expect(itemC).toBeDefined();
        expect(itemA?.participantCount).toBe(2);
        expect(itemC?.participantCount).toBe(1);
    });

    it("handles single user", () => {
        const allItems = ["x", "y", "z"];
        const rankings = [["z", "x", "y"]];

        const results = aggregateMaxDiffResults({ rankings, allItems });

        expect(results[0].item).toBe("z");
        expect(results[0].avgRank).toBe(1);
        expect(results[0].score).toBeCloseTo(1.0);
    });

    it("handles empty rankings", () => {
        const allItems = ["a", "b"];
        const rankings: string[][] = [];

        const results = aggregateMaxDiffResults({ rankings, allItems });

        // With no rankings, avgRank defaults to N (worst)
        expect(results[0].avgRank).toBe(2);
        expect(results[0].participantCount).toBe(0);
    });
});

describe("derivePartialRanking", () => {
    it("returns empty array for no comparisons", () => {
        const result = derivePartialRanking({
            comparisons: [],
            items: ["a", "b", "c"],
        });
        expect(result).toEqual([]);
    });

    it("ranks best before worst for single comparison", () => {
        const result = derivePartialRanking({
            comparisons: [
                { best: "a", worst: "d", set: ["a", "b", "c", "d"] },
            ],
            items: ["a", "b", "c", "d"],
        });
        expect(result[0]).toBe("a");
        expect(result[result.length - 1]).toBe("d");
        expect(result.length).toBe(4);
    });

    it("uses transitive closure for multi-comparison ordering", () => {
        const result = derivePartialRanking({
            comparisons: [
                { best: "a", worst: "b", set: ["a", "b", "c", "d"] },
                { best: "c", worst: "d", set: ["b", "c", "d", "e"] },
            ],
            items: ["a", "b", "c", "d", "e"],
        });
        // a > b,c,d; c > b,d,e; transitive: a > e
        expect(result.indexOf("a")).toBeLessThan(result.indexOf("b"));
        expect(result.indexOf("c")).toBeLessThan(result.indexOf("d"));
    });

    it("only includes items that appeared in comparisons", () => {
        const result = derivePartialRanking({
            comparisons: [{ best: "a", worst: "b", set: ["a", "b"] }],
            items: ["a", "b", "c"],
        });
        expect(result).toContain("a");
        expect(result).toContain("b");
        expect(result).not.toContain("c");
    });

    it("matches complete engine result when fully compared", () => {
        const instance = createMaxDiff(["a", "b", "c", "d"]);
        while (!instance.complete) {
            const candidates = instance.getCandidates(4);
            if (candidates.length < 2) break;
            recordMaxDiffVote({
                instance,
                candidates,
                best: candidates[0],
                worst: candidates[candidates.length - 1],
            });
        }
        const state = instance.exportState();
        const derived = derivePartialRanking({
            comparisons: state.comparisons,
            items: state.items,
        });
        expect(derived).toEqual(instance.result);
    });

    it("handles single item in comparisons", () => {
        const result = derivePartialRanking({
            comparisons: [{ best: "a", worst: "b", set: ["a", "b"] }],
            items: ["a", "b"],
        });
        expect(result).toEqual(["a", "b"]);
    });
});
