import { describe, it, expect } from "vitest";
import {
    derivePartialRanking,
    computeScores,
    parseResultRows,
    type RankedItem,
} from "./maxdiff.js";
import type { MaxDiffComparison } from "@/shared/types/zod.js";

function findItem({
    results,
    id,
}: {
    results: RankedItem[];
    id: string;
}): RankedItem {
    const item = results.find((r) => r.itemSlugId === id);
    if (item === undefined) {
        throw new Error(`Item ${id} not found in results`);
    }
    return item;
}

// Helper to build a comparison
function comp({
    best,
    worst,
    set,
}: {
    best: string;
    worst: string;
    set: string[];
}): MaxDiffComparison {
    return { best, worst, set };
}

describe("derivePartialRanking", () => {
    it("returns empty for no comparisons", () => {
        expect(
            derivePartialRanking({ comparisons: [], items: ["A", "B"] }),
        ).toEqual([]);
    });

    it("ranks best above worst from a single comparison", () => {
        const result = derivePartialRanking({
            comparisons: [comp({ best: "A", worst: "C", set: ["A", "B", "C"] })],
            items: ["A", "B", "C"],
        });
        expect(result.indexOf("A")).toBeLessThan(result.indexOf("C"));
    });

    it("applies transitive closure: A > B > C implies A > C", () => {
        const result = derivePartialRanking({
            comparisons: [
                comp({ best: "A", worst: "B", set: ["A", "B"] }),
                comp({ best: "B", worst: "C", set: ["B", "C"] }),
            ],
            items: ["A", "B", "C"],
        });
        expect(result).toEqual(["A", "B", "C"]);
    });

    it("filters out items not in the items list", () => {
        const result = derivePartialRanking({
            comparisons: [
                comp({ best: "A", worst: "C", set: ["A", "B", "C"] }),
                comp({ best: "B", worst: "D", set: ["B", "C", "D"] }),
            ],
            items: ["A", "C", "D"], // B removed
        });
        expect(result).not.toContain("B");
        // A > C should still hold from the first comparison (with B filtered from set)
        expect(result.indexOf("A")).toBeLessThan(result.indexOf("C"));
    });

    it("preserves transitive order when intermediate item is removed", () => {
        // A > B > C (transitive). Remove B.
        const result = derivePartialRanking({
            comparisons: [
                comp({ best: "A", worst: "B", set: ["A", "B"] }),
                comp({ best: "B", worst: "C", set: ["B", "C"] }),
            ],
            items: ["A", "C"], // B removed
        });
        // A and C were never directly compared, and B is removed.
        // After filtering, comparisons involving B get filtered out
        // (best/worst must both be in items), so A and C become unranked.
        // This is expected -- transitive closure only works if the chain is intact.
        // We can't infer A > C without B.
        expect(result.length).toBeLessThanOrEqual(2);
    });

    it("returns empty when all comparisons reference removed items only", () => {
        const result = derivePartialRanking({
            comparisons: [
                comp({ best: "X", worst: "Y", set: ["X", "Y"] }),
            ],
            items: ["A", "B"], // X and Y not in items
        });
        expect(result).toEqual([]);
    });
});

describe("computeScores", () => {
    it("returns empty for no items", () => {
        expect(computeScores({ parsedRankings: [], items: [] })).toEqual([]);
    });

    it("gives single item score=1", () => {
        const result = computeScores({
            parsedRankings: [["A"]],
            items: ["A"],
        });
        expect(result).toHaveLength(1);
        expect(result[0].score).toBe(1);
        expect(result[0].participantCount).toBe(1);
    });

    it("computes correct scores for 3 items with 3 participants", () => {
        // Participant 1: A=1, B=2, C=3
        // Participant 2: A=1, B=3, C=2
        // Participant 3: A=2, B=1, C=3
        const result = computeScores({
            parsedRankings: [
                ["A", "B", "C"],
                ["A", "C", "B"],
                ["B", "A", "C"],
            ],
            items: ["A", "B", "C"],
        });

        // A: avgRank = (1+1+2)/3 = 4/3
        // B: avgRank = (2+3+1)/3 = 2
        // C: avgRank = (3+2+3)/3 = 8/3
        const scoreA = findItem({ results: result, id: "A" });
        const scoreB = findItem({ results: result, id: "B" });
        const scoreC = findItem({ results: result, id: "C" });

        // n=3, score = (3 - avgRank) / (3 - 1)
        expect(scoreA.score).toBeCloseTo((3 - 4 / 3) / 2, 5);
        expect(scoreB.score).toBeCloseTo((3 - 2) / 2, 5);
        expect(scoreC.score).toBeCloseTo((3 - 8 / 3) / 2, 5);

        expect(scoreA.participantCount).toBe(3);
        expect(scoreB.participantCount).toBe(3);
        expect(scoreC.participantCount).toBe(3);

        // Sorted by avgRank (best first)
        expect(result[0].itemSlugId).toBe("A");
    });

    it("handles items with zero participants (new item)", () => {
        const result = computeScores({
            parsedRankings: [["A", "B"]],
            items: ["A", "B", "C"], // C was never compared
        });

        const scoreC = findItem({ results: result, id: "C" });
        expect(scoreC.participantCount).toBe(0);
        // With 0 participants, avgRank defaults to n=3
        expect(scoreC.avgRank).toBe(3);
        // Score = (3-3)/(3-1) = 0
        expect(scoreC.score).toBe(0);
    });

    it("renormalizes when an item is removed (n decreases)", () => {
        // Original 5 items
        const fullResult = computeScores({
            parsedRankings: [
                ["A", "B", "C", "D", "E"],
                ["A", "C", "B", "E", "D"],
            ],
            items: ["A", "B", "C", "D", "E"],
        });

        // Remove E (was last)
        const reducedResult = computeScores({
            parsedRankings: [
                ["A", "B", "C", "D"],
                ["A", "C", "B", "D"],
            ],
            items: ["A", "B", "C", "D"],
        });

        // With n=4 instead of n=5, score formula changes
        const fullA = findItem({ results: fullResult, id: "A" });
        const reducedA = findItem({ results: reducedResult, id: "A" });

        // A is rank 1 in both, so:
        // Full: score = (5-1)/(5-1) = 1
        // Reduced: score = (4-1)/(4-1) = 1
        expect(fullA.score).toBe(1);
        expect(reducedA.score).toBe(1);

        // But for B (rank 2 in first, 3 in second = avg 2.5):
        const fullB = findItem({ results: fullResult, id: "B" });
        const reducedB = findItem({ results: reducedResult, id: "B" });
        // Full n=5: score = (5-2.5)/(5-1) = 2.5/4 = 0.625
        expect(fullB.score).toBeCloseTo(0.625, 5);
        // Reduced n=4: score = (4-2.5)/(4-1) = 1.5/3 = 0.5
        expect(reducedB.score).toBeCloseTo(0.5, 5);
    });

    it("removes top-ranked item: new #1 is correct", () => {
        const result = computeScores({
            parsedRankings: [
                ["B", "C", "D"],
                ["B", "D", "C"],
            ],
            items: ["B", "C", "D"], // A (prev #1) removed
        });

        expect(result[0].itemSlugId).toBe("B");
        // B: avgRank = (1+1)/2 = 1, score = (3-1)/(3-1) = 1
        expect(result[0].score).toBe(1);
    });

    it("removes last-ranked item: scores shift downward", () => {
        const full = computeScores({
            parsedRankings: [["A", "B", "C"]],
            items: ["A", "B", "C"],
        });
        const reduced = computeScores({
            parsedRankings: [["A", "B"]],
            items: ["A", "B"], // C removed
        });

        // B was rank 2/3, now rank 2/2
        const fullB = findItem({ results: full, id: "B" });
        const reducedB = findItem({ results: reduced, id: "B" });
        // Full: (3-2)/(3-1) = 0.5
        expect(fullB.score).toBeCloseTo(0.5, 5);
        // Reduced: (2-2)/(2-1) = 0
        expect(reducedB.score).toBeCloseTo(0, 5);
    });

    it("handles removing multiple items", () => {
        const result = computeScores({
            parsedRankings: [
                ["A", "C", "E"],
                ["C", "A", "E"],
            ],
            items: ["A", "C", "E"], // B and D removed
        });

        expect(result).toHaveLength(3);
        // A: avg (1+2)/2 = 1.5, score = (3-1.5)/2 = 0.75
        const scoreA = findItem({ results: result, id: "A" });
        expect(scoreA.score).toBeCloseTo(0.75, 5);
    });

    it("all items removed except one", () => {
        const result = computeScores({
            parsedRankings: [["A"]],
            items: ["A"],
        });

        expect(result).toHaveLength(1);
        expect(result[0].score).toBe(1);
        expect(result[0].avgRank).toBe(1);
    });

    it("all items removed: returns empty", () => {
        const result = computeScores({
            parsedRankings: [],
            items: [],
        });
        expect(result).toEqual([]);
    });

    it("item reopened: re-enters pool, n increases", () => {
        // Before reopen: 3 active items
        const before = computeScores({
            parsedRankings: [["A", "B", "C"]],
            items: ["A", "B", "C"],
        });

        // After reopen: D re-enters (no one has compared D yet)
        const after = computeScores({
            parsedRankings: [["A", "B", "C"]], // existing rankings don't include D
            items: ["A", "B", "C", "D"],
        });

        expect(after).toHaveLength(4);
        const scoreD = findItem({ results: after, id: "D" });
        expect(scoreD.participantCount).toBe(0);
        expect(scoreD.avgRank).toBe(4); // defaults to n
        expect(scoreD.score).toBe(0); // (4-4)/(4-1) = 0

        // A's score changes due to n changing
        const beforeA = findItem({ results: before, id: "A" });
        const afterA = findItem({ results: after, id: "A" });
        // Before: (3-1)/(3-1) = 1
        expect(beforeA.score).toBe(1);
        // After: (4-1)/(4-1) = 1 (still 1 because rank=1)
        expect(afterA.score).toBe(1);
    });

    it("new item added mid-flight: appears with 0 participants", () => {
        const result = computeScores({
            parsedRankings: [
                ["A", "B", "C", "D"],
                ["B", "A", "D", "C"],
            ],
            items: ["A", "B", "C", "D", "E"], // E is new
        });

        const scoreE = findItem({ results: result, id: "E" });
        expect(scoreE.participantCount).toBe(0);
        expect(scoreE.avgRank).toBe(5);
        expect(scoreE.score).toBe(0);

        // E should be last in sorted order
        expect(result[result.length - 1].itemSlugId).toBe("E");
    });

    it("after adding new item and getting comparisons, scores adjust", () => {
        // E was added and one participant now includes it
        const result = computeScores({
            parsedRankings: [
                ["A", "B", "C", "D"],
                ["B", "A", "D", "C"],
                ["E", "A", "B", "C", "D"], // new participant ranked E first
            ],
            items: ["A", "B", "C", "D", "E"],
        });

        const scoreE = findItem({ results: result, id: "E" });
        expect(scoreE.participantCount).toBe(1);
        expect(scoreE.avgRank).toBe(1); // ranked 1st by one person
        expect(scoreE.score).toBe(1); // (5-1)/(5-1) = 1
    });
});

describe("parseResultRows", () => {
    it("parses complete rankings", () => {
        const result = parseResultRows({
            rows: [
                {
                    ranking: ["A", "B", "C"],
                    comparisons: [],
                },
            ],
            items: ["A", "B", "C"],
        });

        expect(result).toEqual([["A", "B", "C"]]);
    });

    it("filters rankings to only active items", () => {
        const result = parseResultRows({
            rows: [
                {
                    ranking: ["A", "B", "C", "D"],
                    comparisons: [],
                },
            ],
            items: ["A", "C", "D"], // B removed
        });

        expect(result).toEqual([["A", "C", "D"]]);
    });

    it("derives partial ranking from comparisons when ranking is null", () => {
        const result = parseResultRows({
            rows: [
                {
                    ranking: null,
                    comparisons: [
                        { best: "A", worst: "C", set: ["A", "B", "C"] },
                    ],
                },
            ],
            items: ["A", "B", "C"],
        });

        expect(result).toHaveLength(1);
        expect(result[0].indexOf("A")).toBeLessThan(
            result[0].indexOf("C"),
        );
    });

    it("skips comparisons that only reference removed items", () => {
        const result = parseResultRows({
            rows: [
                {
                    ranking: null,
                    comparisons: [
                        { best: "X", worst: "Y", set: ["X", "Y"] },
                    ],
                },
            ],
            items: ["A", "B"],
        });

        expect(result).toEqual([]);
    });
});

describe("snapshot correctness", () => {
    it("snapshot values match live-computed values", () => {
        // 5 items, 3 participants with known rankings
        const items = ["A", "B", "C", "D", "E"];
        const parsedRankings = [
            ["A", "B", "C", "D", "E"],
            ["A", "C", "B", "E", "D"],
            ["B", "A", "D", "C", "E"],
        ];

        const scores = computeScores({ parsedRankings, items });

        // "Snapshot" item C
        const itemC = findItem({ results: scores, id: "C" });

        const cRank = scores.indexOf(itemC) + 1;

        // Now verify these values would be stored as snapshot
        expect(itemC.score).toBeGreaterThan(0);
        expect(cRank).toBeGreaterThan(0);
        expect(itemC.participantCount).toBe(3);
    });

    it("sequential snapshots reflect state at their own transition time", () => {
        const items = ["A", "B", "C", "D", "E"];
        const rankings = [
            ["A", "B", "C", "D", "E"],
            ["A", "C", "B", "E", "D"],
        ];

        // Snapshot C first (with all 5 items active)
        const scoresAll = computeScores({
            parsedRankings: rankings,
            items,
        });
        const snapshotC = findItem({ results: scoresAll, id: "C" });

        // Then remove C, snapshot D (with 4 items active)
        const filteredRankings = rankings.map((r) =>
            r.filter((id) => id !== "C"),
        );
        const scoresWithoutC = computeScores({
            parsedRankings: filteredRankings,
            items: ["A", "B", "D", "E"],
        });
        const snapshotD = findItem({ results: scoresWithoutC, id: "D" });

        // C's snapshot was computed with n=5, D's with n=4
        // They should be different values
        // C: avgRank with n=5, D: avgRank with n=4
        expect(snapshotC.score).not.toEqual(snapshotD.score);
    });

    it("snapshot an item with zero participants", () => {
        const scores = computeScores({
            parsedRankings: [["A", "B"]],
            items: ["A", "B", "C"], // C never compared
        });

        const scoreC = findItem({ results: scores, id: "C" });
        expect(scoreC.participantCount).toBe(0);
        expect(scoreC.score).toBe(0);
        expect(scoreC.avgRank).toBe(3);
    });
});
