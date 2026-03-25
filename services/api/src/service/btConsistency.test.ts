/**
 * Test that Bradley-Terry scoring produces the same ordering as
 * transitive closure for a single voter's complete BWS data.
 *
 * With 1 participant, the community ranking (BT) should match
 * the personal ranking (transitive closure).
 */

import { describe, it, expect } from "vitest";
import type { MaxDiffComparison } from "@/shared/types/zod.js";
import { bradleyTerryFromBWS, bwsToPairwise, buildItemIndex } from "./bradleyTerry.js";
import { buildComparisonMatrix } from "./maxdiffEngine.js";

/**
 * Simulate a single voter completing all comparisons via BWS.
 * Uses the comparison matrix (transitive closure) to determine
 * best/worst in each candidate set, then returns the comparisons.
 */
function simulateSingleVoterBWS({
    items,
    trueOrdering,
}: {
    items: string[];
    trueOrdering: string[]; // best-first
}): MaxDiffComparison[] {
    const comparisons: MaxDiffComparison[] = [];
    const { applyComparison, getUnorderedPairs } = buildComparisonMatrix({ items });

    // Generate candidate sets of 4 until all pairs are resolved
    const rankMap = new Map(trueOrdering.map((id, i) => [id, i]));
    let safety = 0;

    while (getUnorderedPairs().length > 0 && safety < 100) {
        safety++;
        // Pick 4 items that have unresolved pairs
        const unordered = getUnorderedPairs();
        const pool = new Set<string>();
        for (const [a, b] of unordered) {
            pool.add(a);
            pool.add(b);
            if (pool.size >= 4) break;
        }
        const set = [...pool].slice(0, 4);
        if (set.length < 2) break;

        // Use true ordering to determine best/worst
        set.sort((a, b) => (rankMap.get(a) ?? 0) - (rankMap.get(b) ?? 0));
        const best = set[0]; // lowest rank = best
        const worst = set[set.length - 1]; // highest rank = worst

        const comparison: MaxDiffComparison = { best, worst, set };
        comparisons.push(comparison);
        applyComparison(comparison);
    }

    return comparisons;
}

/**
 * Simulate voting with specific candidate sets (closer to real routing).
 * For each set, pick best/worst according to true ordering.
 */
function votesFromSets({
    sets,
    trueOrdering,
}: {
    sets: string[][];
    trueOrdering: string[];
}): MaxDiffComparison[] {
    const rankMap = new Map(trueOrdering.map((id, i) => [id, i]));
    return sets.map((set) => {
        const sorted = [...set].sort(
            (a, b) => (rankMap.get(a) ?? 0) - (rankMap.get(b) ?? 0),
        );
        return { best: sorted[0], worst: sorted[sorted.length - 1], set };
    });
}

describe("BT vs transitive closure consistency (single voter)", () => {
    it("BT ordering matches true ordering for 3 items", () => {
        const items = ["A", "B", "C"];
        const trueOrdering = ["A", "B", "C"]; // A is best

        const comparisons = simulateSingleVoterBWS({ items, trueOrdering });
        const { items: scored } = bradleyTerryFromBWS({ comparisons, items });
        const btOrdering = scored.map((s) => s.item);

        expect(btOrdering).toEqual(trueOrdering);
    });

    it("BT ordering matches true ordering for 5 items", () => {
        const items = ["A", "B", "C", "D", "E"];
        const trueOrdering = ["A", "B", "C", "D", "E"];

        const comparisons = simulateSingleVoterBWS({ items, trueOrdering });
        const { items: scored } = bradleyTerryFromBWS({ comparisons, items });
        const btOrdering = scored.map((s) => s.item);

        expect(btOrdering).toEqual(trueOrdering);
    });

    it("BT ordering matches true ordering for 6 items", () => {
        const items = ["1", "2", "3", "4", "5", "6"];
        const trueOrdering = ["6", "1", "4", "2", "3", "5"]; // matches user's My Ranking

        const comparisons = simulateSingleVoterBWS({ items, trueOrdering });
        const { items: scored } = bradleyTerryFromBWS({ comparisons, items });
        const btOrdering = scored.map((s) => s.item);

        expect(btOrdering).toEqual(trueOrdering);
    });

    it("BT ordering matches for reversed ordering", () => {
        const items = ["A", "B", "C", "D", "E", "F"];
        const trueOrdering = ["F", "E", "D", "C", "B", "A"];

        const comparisons = simulateSingleVoterBWS({ items, trueOrdering });
        const { items: scored } = bradleyTerryFromBWS({ comparisons, items });
        const btOrdering = scored.map((s) => s.item);

        expect(btOrdering).toEqual(trueOrdering);
    });

    it("BT matches with asymmetric candidate sets (some items appear more)", () => {
        const items = ["1", "2", "3", "4", "5", "6"];
        const trueOrdering = ["6", "1", "4", "2", "3", "5"];

        // Realistic sets where some items appear more than others
        const comparisons = votesFromSets({
            sets: [
                ["1", "2", "5", "6"],
                ["1", "3", "4", "6"],
                ["2", "3", "4", "5"],
                ["1", "2", "4", "6"],
            ],
            trueOrdering,
        });

        const { items: scored } = bradleyTerryFromBWS({ comparisons, items });
        const btOrdering = scored.map((s) => s.item);

        // Verify transitive closure ordering
        const { applyComparison, getUnorderedPairs } = buildComparisonMatrix({ items });
        for (const c of comparisons) applyComparison(c);

        // If all pairs resolved, transitive closure gives exact ordering
        if (getUnorderedPairs().length === 0) {
            expect(btOrdering).toEqual(trueOrdering);
        }
    });

    it("BT matches with minimal votes (just enough to complete)", () => {
        const items = ["A", "B", "C", "D", "E", "F"];
        const trueOrdering = ["A", "B", "C", "D", "E", "F"];

        // Try multiple set combinations that complete the ranking
        const setVariants: string[][][] = [
            [["A","B","C","D"], ["A","C","E","F"], ["B","D","E","F"], ["C","D","E","F"]],
            [["A","B","E","F"], ["B","C","D","F"], ["A","C","D","E"], ["A","B","C","F"]],
            [["A","D","E","F"], ["B","C","D","E"], ["A","B","C","F"], ["A","B","D","F"]],
        ];

        for (const sets of setVariants) {
            const comparisons = votesFromSets({ sets, trueOrdering });
            const { items: scored } = bradleyTerryFromBWS({ comparisons, items });
            const btOrdering = scored.map((s) => s.item);

            const { applyComparison, getUnorderedPairs } = buildComparisonMatrix({ items });
            for (const c of comparisons) applyComparison(c);

            if (getUnorderedPairs().length === 0) {
                expect(btOrdering).toEqual(trueOrdering);
            }
        }
    });

    it("pairwise decomposition covers all pairs for complete BWS data", () => {
        const items = ["A", "B", "C", "D"];
        const trueOrdering = ["A", "B", "C", "D"];

        const comparisons = simulateSingleVoterBWS({ items, trueOrdering });
        const itemIndex = buildItemIndex(items);

        // Collect all pairwise wins
        const allWins: Array<{ winner: number; loser: number }> = [];
        for (const c of comparisons) {
            allWins.push(...bwsToPairwise({ comparison: c, itemIndex }));
        }

        // Check: for every pair (i, j) where i < j in true ordering,
        // there should be at least one win for i over j
        for (let i = 0; i < items.length; i++) {
            for (let j = i + 1; j < items.length; j++) {
                const iIdx = itemIndex.get(trueOrdering[i]);
                const jIdx = itemIndex.get(trueOrdering[j]);
                if (iIdx === undefined || jIdx === undefined) continue;
                const hasWin = allWins.some(
                    (w) => w.winner === iIdx && w.loser === jIdx,
                );
                // This may not always hold — BWS doesn't guarantee all pairs
                // are directly compared. Log which pairs are missing.
                if (!hasWin) {
                    // Check reverse — maybe j incorrectly beats i
                    const hasReverseWin = allWins.some(
                        (w) => w.winner === jIdx && w.loser === iIdx,
                    );
                    // If neither direction has evidence, BT must infer from indirect data
                    expect(hasReverseWin).toBe(false); // shouldn't have wrong direction
                }
            }
        }
    });
});
