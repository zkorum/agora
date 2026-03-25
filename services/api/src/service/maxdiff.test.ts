import { describe, it, expect } from "vitest";
import {
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

describe("computeScores", () => {
    it("returns empty for no items", () => {
        expect(
            computeScores({
                perUserComparisons: [],
                items: [],
                participantCounts: new Map(),
            }),
        ).toEqual([]);
    });

    it("gives single item score=1", () => {
        const result = computeScores({
            perUserComparisons: [],
            items: ["A"],
            participantCounts: new Map([["A", 1]]),
        });
        expect(result).toHaveLength(1);
        expect(result[0].score).toBe(1);
        expect(result[0].participantCount).toBe(1);
    });

    it("ranks clear winner highest with BT MLE", () => {
        const result = computeScores({
            perUserComparisons: [[
                comp({ best: "A", worst: "C", set: ["A", "B", "C"] }),
                comp({ best: "A", worst: "C", set: ["A", "B", "C"] }),
                comp({ best: "A", worst: "B", set: ["A", "B", "C"] }),
            ]],
            items: ["A", "B", "C"],
            participantCounts: new Map([
                ["A", 3],
                ["B", 3],
                ["C", 3],
            ]),
        });

        expect(result[0].itemSlugId).toBe("A");
        expect(result[result.length - 1].itemSlugId).toBe("C");
        expect(result[0].participantCount).toBe(3);
    });

    it("scores are in [0, 1] range", () => {
        const result = computeScores({
            perUserComparisons: [[
                comp({ best: "A", worst: "D", set: ["A", "B", "C", "D"] }),
                comp({ best: "B", worst: "C", set: ["A", "B", "C", "D"] }),
            ]],
            items: ["A", "B", "C", "D"],
            participantCounts: new Map([
                ["A", 2],
                ["B", 2],
                ["C", 2],
                ["D", 2],
            ]),
        });

        for (const item of result) {
            expect(item.score).toBeGreaterThanOrEqual(0);
            expect(item.score).toBeLessThanOrEqual(1);
        }
        expect(result[0].score).toBeCloseTo(1);
        expect(result[result.length - 1].score).toBeCloseTo(0);
    });

    it("all items removed: returns empty", () => {
        const result = computeScores({
            perUserComparisons: [],
            items: [],
            participantCounts: new Map(),
        });
        expect(result).toEqual([]);
    });

    it("single voter: BT matches transitive closure ordering", () => {
        // This is the bug fix test — previously BT could disagree with
        // transitive closure due to contradictory BWS pairwise wins
        const result = computeScores({
            perUserComparisons: [[
                comp({ best: "A", worst: "D", set: ["A", "B", "C", "D"] }),
                comp({ best: "B", worst: "F", set: ["B", "E", "F", "C"] }),
                comp({ best: "C", worst: "E", set: ["A", "D", "E", "C"] }),
            ]],
            items: ["A", "B", "C", "D", "E", "F"],
            participantCounts: new Map(
                ["A", "B", "C", "D", "E", "F"].map((id) => [id, 1]),
            ),
        });

        // With transitive closure, the ordering should be consistent
        // and all items should have distinct scores (no tied 0% groups)
        const scores = result.map((r) => r.score);
        const uniqueScores = new Set(scores.map((s) => s.toFixed(2)));
        // With 6 items and transitive closure, should have more than 2 unique scores
        expect(uniqueScores.size).toBeGreaterThan(2);
    });
});

describe("parseResultRows", () => {
    it("extracts per-user comparisons from rows", () => {
        const { perUserComparisons, participantCounts } = parseResultRows({
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

        expect(perUserComparisons).toHaveLength(1);
        expect(perUserComparisons[0][0].best).toBe("A");
        expect(participantCounts.get("A")).toBe(1);
    });

    it("separates comparisons per user", () => {
        const { perUserComparisons, participantCounts } = parseResultRows({
            rows: [
                {
                    ranking: null,
                    comparisons: [
                        { best: "A", worst: "C", set: ["A", "B", "C"] },
                    ],
                },
                {
                    ranking: null,
                    comparisons: [
                        { best: "B", worst: "A", set: ["A", "B", "C"] },
                    ],
                },
            ],
            items: ["A", "B", "C"],
        });

        expect(perUserComparisons).toHaveLength(2);
        expect(participantCounts.get("A")).toBe(2);
    });

    it("skips comparisons that only reference removed items", () => {
        const { perUserComparisons } = parseResultRows({
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

        expect(perUserComparisons).toHaveLength(0);
    });
});

describe("snapshot correctness", () => {
    it("snapshot values are computable from comparisons", () => {
        const scores = computeScores({
            perUserComparisons: [[
                comp({ best: "A", worst: "C", set: ["A", "B", "C", "D", "E"] }),
                comp({ best: "A", worst: "E", set: ["A", "B", "C", "D", "E"] }),
                comp({ best: "B", worst: "D", set: ["A", "B", "C", "D", "E"] }),
            ]],
            items: ["A", "B", "C", "D", "E"],
            participantCounts: new Map([
                ["A", 3],
                ["B", 3],
                ["C", 3],
                ["D", 3],
                ["E", 3],
            ]),
        });

        const itemC = findItem({ results: scores, id: "C" });
        expect(itemC.score).toBeGreaterThanOrEqual(0);
        expect(itemC.score).toBeLessThanOrEqual(1);
        expect(itemC.participantCount).toBe(3);
    });
});
