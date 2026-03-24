import { describe, it, expect } from "vitest";
import {
    expTransform,
    logTransform,
    mmPairwise,
    bwsToPairwise,
    buildItemIndex,
    bradleyTerryFromBWS,
    fisherYatesShuffle,
    type PairwiseWin,
    type MaxDiffComparison,
} from "./bradleyTerry.js";

// Tolerance for floating-point comparisons
const ATOL = 1e-4;

function approx(actual: number, expected: number, tol = ATOL): void {
    expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tol);
}

function allClose(actual: number[], expected: number[], tol = ATOL): void {
    expect(actual.length).toBe(expected.length);
    for (let i = 0; i < actual.length; i++) {
        approx(actual[i], expected[i], tol);
    }
}

// --- expTransform / logTransform ---

describe("expTransform", () => {
    it("returns empty for empty input", () => {
        expect(expTransform([])).toEqual([]);
    });

    it("transforms equal params to equal weights summing to n", () => {
        const result = expTransform([0, 0, 0]);
        allClose(result, [1, 1, 1]);
    });

    it("preserves relative ordering", () => {
        const result = expTransform([1, 0, -1]);
        expect(result[0]).toBeGreaterThan(result[1]);
        expect(result[1]).toBeGreaterThan(result[2]);
    });

    it("weights sum to n", () => {
        const result = expTransform([2, -1, 0.5, 3]);
        const sum = result.reduce((a, b) => a + b, 0);
        approx(sum, 4);
    });
});

describe("logTransform", () => {
    it("returns empty for empty input", () => {
        expect(logTransform([])).toEqual([]);
    });

    it("transforms equal weights to zero-mean params", () => {
        const result = logTransform([1, 1, 1]);
        allClose(result, [0, 0, 0]);
    });

    it("centers params to mean zero", () => {
        const result = logTransform([2, 4, 8]);
        const mean = result.reduce((a, b) => a + b, 0) / result.length;
        approx(mean, 0);
    });
});

describe("expTransform and logTransform are inverse", () => {
    it("round-trips: logTransform(expTransform(x)) ≈ centered(x)", () => {
        const original = [1, -0.5, 0.3];
        const mean = original.reduce((a, b) => a + b, 0) / original.length;
        const centered = original.map((x) => x - mean);
        const result = logTransform(expTransform(original));
        allClose(result, centered);
    });
});

// --- mmPairwise ---

describe("mmPairwise", () => {
    it("returns zeros for empty data", () => {
        const { params, converged } = mmPairwise({ nItems: 3, data: [] });
        expect(converged).toBe(true);
        // With no data, prior dominates → all params ≈ 0
        allClose(params, [0, 0, 0], 0.01);
    });

    it("returns empty for zero items", () => {
        const { params, converged } = mmPairwise({ nItems: 0, data: [] });
        expect(converged).toBe(true);
        expect(params).toEqual([]);
    });

    it("returns [0] for single item", () => {
        const { params, converged } = mmPairwise({ nItems: 1, data: [] });
        expect(converged).toBe(true);
        expect(params).toEqual([0]);
    });

    // Ported from choix testcase-pairwise-1.json:
    // "Cycle on three items" → all equal
    it("cycle on 3 items yields equal params", () => {
        const data: PairwiseWin[] = [
            { winner: 0, loser: 1 },
            { winner: 1, loser: 2 },
            { winner: 2, loser: 0 },
        ];
        const { params, converged } = mmPairwise({
            nItems: 3,
            data,
            alpha: 1e-6,
        });
        expect(converged).toBe(true);
        allClose(params, [0, 0, 0]);
    });

    // Ported from choix testcase-pairwise-2.json:
    // "Cycle on 3 items with one additional comparison"
    it("cycle with extra comparison favors the winner", () => {
        const data: PairwiseWin[] = [
            { winner: 0, loser: 1 },
            { winner: 0, loser: 1 },
            { winner: 1, loser: 2 },
            { winner: 2, loser: 0 },
        ];
        const { params, converged } = mmPairwise({
            nItems: 3,
            data,
            alpha: 1e-6,
        });
        expect(converged).toBe(true);
        // Item 0 has extra win → highest param
        expect(params[0]).toBeGreaterThan(params[2]);
        // Item 1 has most losses → lowest param
        expect(params[1]).toBeLessThan(params[2]);
        // Verify against choix reference (ml_est: [0.4196, -0.4196, 0.0])
        approx(params[0], 0.4196, 0.01);
        approx(params[1], -0.4196, 0.01);
        approx(params[2], 0.0, 0.01);
    });

    // Inspired by solidago test_individual_scores_mean_is_zero
    it("params are always centered (mean ≈ 0)", () => {
        const data: PairwiseWin[] = [
            { winner: 0, loser: 1 },
            { winner: 0, loser: 2 },
            { winner: 1, loser: 2 },
            { winner: 2, loser: 3 },
        ];
        const { params, converged } = mmPairwise({ nItems: 4, data });
        expect(converged).toBe(true);
        const mean = params.reduce((a, b) => a + b, 0) / params.length;
        approx(mean, 0, 1e-6);
    });

    // Inspired by solidago test_comparisons_chain
    it("chain of dominance produces monotonic ranking", () => {
        // 0 > 1, 1 > 2, 2 > 3, 3 > 4
        const data: PairwiseWin[] = [
            { winner: 0, loser: 1 },
            { winner: 1, loser: 2 },
            { winner: 2, loser: 3 },
            { winner: 3, loser: 4 },
        ];
        const { params, converged } = mmPairwise({ nItems: 5, data });
        expect(converged).toBe(true);
        for (let i = 0; i < 4; i++) {
            expect(params[i]).toBeGreaterThan(params[i + 1]);
        }
    });

    // Inspired by solidago test_comparisons_strong_preferences
    it("more wins produce larger score gaps", () => {
        // A beats B once, A beats C five times
        const data: PairwiseWin[] = [
            { winner: 0, loser: 1 },
            { winner: 0, loser: 2 },
            { winner: 0, loser: 2 },
            { winner: 0, loser: 2 },
            { winner: 0, loser: 2 },
            { winner: 0, loser: 2 },
        ];
        const { params, converged } = mmPairwise({ nItems: 3, data });
        expect(converged).toBe(true);
        // A > B > C
        expect(params[0]).toBeGreaterThan(params[1]);
        expect(params[1]).toBeGreaterThan(params[2]);
        // Gap A-C should be larger than gap A-B
        expect(params[0] - params[2]).toBeGreaterThan(params[0] - params[1]);
    });

    // Inspired by solidago test_comparisons_non_connex
    it("disconnected components produce symmetric scores", () => {
        // Group 1: 0 > 1
        // Group 2: 2 > 3  (same structure, no cross-comparisons)
        const data: PairwiseWin[] = [
            { winner: 0, loser: 1 },
            { winner: 2, loser: 3 },
        ];
        const { params, converged } = mmPairwise({ nItems: 4, data });
        expect(converged).toBe(true);
        // Symmetric groups should produce equal params
        approx(params[0], params[2], 0.01);
        approx(params[1], params[3], 0.01);
    });

    it("converges with regularization even when data is sparse", () => {
        // Single comparison among many items
        const data: PairwiseWin[] = [{ winner: 0, loser: 9 }];
        const { params, converged } = mmPairwise({
            nItems: 10,
            data,
            alpha: 0.01,
        });
        expect(converged).toBe(true);
        expect(params[0]).toBeGreaterThan(params[9]);
        // All other items should be near zero (prior-dominated)
        for (let i = 1; i < 9; i++) {
            approx(params[i], 0, 0.5);
        }
    });

    it("handles many items with complete data", () => {
        // Round-robin: 0 > 1 > 2 > ... > 9
        const data: PairwiseWin[] = [];
        for (let i = 0; i < 10; i++) {
            for (let j = i + 1; j < 10; j++) {
                data.push({ winner: i, loser: j });
            }
        }
        const { params, converged } = mmPairwise({ nItems: 10, data });
        expect(converged).toBe(true);
        // Should be monotonically decreasing
        for (let i = 0; i < 9; i++) {
            expect(params[i]).toBeGreaterThan(params[i + 1]);
        }
    });
});

// --- bwsToPairwise ---

describe("bwsToPairwise", () => {
    it("decomposes 3-item BWS vote into pairwise wins", () => {
        const items = ["A", "B", "C"];
        const itemIndex = buildItemIndex(items);
        const comparison: MaxDiffComparison = {
            best: "A",
            worst: "C",
            set: ["A", "B", "C"],
        };
        const wins = bwsToPairwise({ comparison, itemIndex });
        // A beats B, A beats C (best beats all others)
        // B beats C (others beat worst)
        expect(wins).toHaveLength(3);
        expect(wins).toContainEqual({ winner: 0, loser: 1 }); // A > B
        expect(wins).toContainEqual({ winner: 0, loser: 2 }); // A > C
        expect(wins).toContainEqual({ winner: 1, loser: 2 }); // B > C
    });

    it("decomposes 4-item BWS vote correctly", () => {
        const items = ["A", "B", "C", "D"];
        const itemIndex = buildItemIndex(items);
        const comparison: MaxDiffComparison = {
            best: "A",
            worst: "D",
            set: ["A", "B", "C", "D"],
        };
        const wins = bwsToPairwise({ comparison, itemIndex });
        // A beats B, C, D (3 wins for best)
        // B beats D, C beats D (2 wins for others over worst)
        expect(wins).toHaveLength(5);
        expect(wins).toContainEqual({ winner: 0, loser: 1 }); // A > B
        expect(wins).toContainEqual({ winner: 0, loser: 2 }); // A > C
        expect(wins).toContainEqual({ winner: 0, loser: 3 }); // A > D
        expect(wins).toContainEqual({ winner: 1, loser: 3 }); // B > D
        expect(wins).toContainEqual({ winner: 2, loser: 3 }); // C > D
    });

    it("returns empty for unknown items", () => {
        const itemIndex = buildItemIndex(["A", "B"]);
        const comparison: MaxDiffComparison = {
            best: "X",
            worst: "Y",
            set: ["X", "Y"],
        };
        const wins = bwsToPairwise({ comparison, itemIndex });
        expect(wins).toHaveLength(0);
    });

    it("handles set with only best and worst (2 items)", () => {
        const items = ["A", "B"];
        const itemIndex = buildItemIndex(items);
        const comparison: MaxDiffComparison = {
            best: "A",
            worst: "B",
            set: ["A", "B"],
        };
        const wins = bwsToPairwise({ comparison, itemIndex });
        expect(wins).toHaveLength(1);
        expect(wins).toContainEqual({ winner: 0, loser: 1 }); // A > B
    });
});

// --- bradleyTerryFromBWS ---

describe("bradleyTerryFromBWS", () => {
    it("returns empty for no items", () => {
        expect(bradleyTerryFromBWS({ comparisons: [], items: [] })).toEqual([]);
    });

    it("returns single item with score 1", () => {
        const result = bradleyTerryFromBWS({
            comparisons: [],
            items: ["A"],
        });
        expect(result).toHaveLength(1);
        expect(result[0].item).toBe("A");
        expect(result[0].score).toBe(1);
    });

    it("ranks clear winner highest from BWS data", () => {
        const comparisons: MaxDiffComparison[] = [
            { best: "A", worst: "C", set: ["A", "B", "C"] },
            { best: "A", worst: "C", set: ["A", "B", "C"] },
            { best: "A", worst: "B", set: ["A", "B", "C"] },
        ];
        const result = bradleyTerryFromBWS({
            comparisons,
            items: ["A", "B", "C"],
        });
        expect(result[0].item).toBe("A");
        expect(result[result.length - 1].item).toBe("C");
    });

    it("produces scores in [0, 1] range", () => {
        const comparisons: MaxDiffComparison[] = [
            { best: "A", worst: "D", set: ["A", "B", "C", "D"] },
            { best: "B", worst: "D", set: ["A", "B", "C", "D"] },
            { best: "A", worst: "C", set: ["A", "B", "C", "D"] },
        ];
        const result = bradleyTerryFromBWS({
            comparisons,
            items: ["A", "B", "C", "D"],
        });
        for (const { score } of result) {
            expect(score).toBeGreaterThanOrEqual(0);
            expect(score).toBeLessThanOrEqual(1);
        }
        // Best item should have score 1, worst should have score 0
        expect(result[0].score).toBeCloseTo(1);
        expect(result[result.length - 1].score).toBeCloseTo(0);
    });

    it("items with no comparisons get high uncertainty", () => {
        const comparisons: MaxDiffComparison[] = [
            { best: "A", worst: "B", set: ["A", "B"] },
        ];
        const result = bradleyTerryFromBWS({
            comparisons,
            items: ["A", "B", "C"],
        });
        const itemC = result.find((r) => r.item === "C");
        const itemA = result.find((r) => r.item === "A");
        if (itemC === undefined || itemA === undefined) {
            throw new Error("Expected items A and C in results");
        }
        // C has never been compared → higher uncertainty than A
        expect(itemC.uncertainty).toBeGreaterThan(itemA.uncertainty);
    });

    it("filters out comparisons referencing unknown items", () => {
        const comparisons: MaxDiffComparison[] = [
            { best: "A", worst: "C", set: ["A", "B", "C"] },
            { best: "X", worst: "Y", set: ["X", "Y"] }, // unknown items
        ];
        const result = bradleyTerryFromBWS({
            comparisons,
            items: ["A", "B", "C"],
        });
        expect(result).toHaveLength(3);
    });

    it("handles multiple users' comparisons pooled together", () => {
        // User 1: A > B > C
        // User 2: A > C > B
        const comparisons: MaxDiffComparison[] = [
            { best: "A", worst: "C", set: ["A", "B", "C"] },
            { best: "A", worst: "B", set: ["A", "B", "C"] },
        ];
        const result = bradleyTerryFromBWS({
            comparisons,
            items: ["A", "B", "C"],
        });
        // A should be ranked first (both users agree)
        expect(result[0].item).toBe("A");
    });

    it("handles 4-item choice sets correctly", () => {
        const comparisons: MaxDiffComparison[] = [
            { best: "A", worst: "D", set: ["A", "B", "C", "D"] },
            { best: "B", worst: "C", set: ["A", "B", "C", "D"] },
        ];
        const result = bradleyTerryFromBWS({
            comparisons,
            items: ["A", "B", "C", "D"],
        });
        // A and B should be top 2 (both chosen as best)
        const topTwo = result.slice(0, 2).map((r) => r.item);
        expect(topTwo).toContain("A");
        expect(topTwo).toContain("B");
        // C and D should be bottom 2 (both chosen as worst)
        const bottomTwo = result.slice(2).map((r) => r.item);
        expect(bottomTwo).toContain("C");
        expect(bottomTwo).toContain("D");
    });
});

// --- fisherYatesShuffle ---

describe("fisherYatesShuffle", () => {
    it("returns the same array reference", () => {
        const arr = [1, 2, 3];
        const result = fisherYatesShuffle(arr);
        expect(result).toBe(arr);
    });

    it("preserves all elements", () => {
        const arr = [1, 2, 3, 4, 5];
        const copy = [...arr];
        fisherYatesShuffle(arr);
        expect(arr.sort()).toEqual(copy.sort());
    });

    it("handles empty array", () => {
        expect(fisherYatesShuffle([])).toEqual([]);
    });

    it("handles single element", () => {
        expect(fisherYatesShuffle([42])).toEqual([42]);
    });

    it("produces different orderings over many runs", () => {
        const original = [1, 2, 3, 4, 5, 6, 7, 8];
        let sawDifferent = false;
        for (let i = 0; i < 50; i++) {
            const arr = [...original];
            fisherYatesShuffle(arr);
            if (arr.some((v, idx) => v !== original[idx])) {
                sawDifferent = true;
                break;
            }
        }
        expect(sawDifferent).toBe(true);
    });
});
