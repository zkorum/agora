import { describe, expect, it } from "vitest";

import {
    createMaxDiff,
    estimateRemainingVotes,
    type MaxDiffInstance,
    recordMaxDiffVote,
    restoreMaxDiff,
} from "./maxdiff";

/** Deterministic voting simulation: always picks first as best, last as worst. */
function simulateVotingToCompletion({
    instance,
    candidateLimit = 4,
    maxRounds = 500,
}: {
    instance: MaxDiffInstance;
    candidateLimit?: number;
    maxRounds?: number;
}): number {
    let rounds = 0;
    while (!instance.complete && rounds < maxRounds) {
        const candidates = instance.getCandidates(candidateLimit);
        if (candidates.length < 2) break;
        recordMaxDiffVote({
            instance,
            candidates,
            best: candidates[0],
            worst: candidates[candidates.length - 1],
        });
        rounds++;
    }
    return rounds;
}

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

describe("estimateRemainingVotes", () => {
    it("returns 0 when no unordered pairs remain", () => {
        const result = estimateRemainingVotes({
            votesDone: 10,
            orderedPairs: 820,
            unorderedPairs: 0,
            itemCount: 41,
        });
        expect(result).toBe(0);
    });

    it("uses heuristic for first vote (votesDone === 0)", () => {
        // For 41 items: ceil(41 * log2(41) / 5) ≈ 44
        const result = estimateRemainingVotes({
            votesDone: 0,
            orderedPairs: 0,
            unorderedPairs: 820,
            itemCount: 41,
        });
        expect(result).toBeGreaterThan(30);
        expect(result).toBeLessThan(60);
    });

    it("uses heuristic when avg pairs per vote is below 1", () => {
        // Edge case: 1 vote resolved 0 pairs (redundant vote)
        const result = estimateRemainingVotes({
            votesDone: 1,
            orderedPairs: 0,
            unorderedPairs: 820,
            itemCount: 41,
        });
        // Should fall back to heuristic, not return 820
        expect(result).toBeLessThan(100);
    });

    it("blends heuristic with actual rate for early votes (votesDone < 3)", () => {
        const heuristic = Math.ceil((41 * Math.log2(41)) / 5);

        const result1 = estimateRemainingVotes({
            votesDone: 1,
            orderedPairs: 8,
            unorderedPairs: 812,
            itemCount: 41,
        });
        const result2 = estimateRemainingVotes({
            votesDone: 2,
            orderedPairs: 16,
            unorderedPairs: 804,
            itemCount: 41,
        });

        // With weight=1/3 and weight=2/3, blended estimates should be
        // between pure heuristic and pure rate estimate
        const pureRate1 = Math.ceil(812 / (8 / 1));
        const pureRate2 = Math.ceil(804 / (16 / 2));
        expect(result1).toBeGreaterThanOrEqual(Math.min(heuristic, pureRate1));
        expect(result2).toBeGreaterThanOrEqual(Math.min(heuristic, pureRate2));
    });

    it("refines estimate based on actual voting rate after 3+ votes", () => {
        // After 10 votes resolved 80 pairs, 740 remain
        const result = estimateRemainingVotes({
            votesDone: 10,
            orderedPairs: 80,
            unorderedPairs: 740,
            itemCount: 41,
        });
        // 740 / (80/10) = 92.5 → ceil = 93
        expect(result).toBe(93);
    });

    it("estimate decreases as more votes are done", () => {
        const early = estimateRemainingVotes({
            votesDone: 5,
            orderedPairs: 30,
            unorderedPairs: 790,
            itemCount: 41,
        });
        const late = estimateRemainingVotes({
            votesDone: 50,
            orderedPairs: 600,
            unorderedPairs: 220,
            itemCount: 41,
        });
        expect(late).toBeLessThan(early);
    });

    it("handles 2 items (minimal case)", () => {
        const result = estimateRemainingVotes({
            votesDone: 0,
            orderedPairs: 0,
            unorderedPairs: 1,
            itemCount: 2,
        });
        expect(result).toBeGreaterThanOrEqual(1);
    });
});

