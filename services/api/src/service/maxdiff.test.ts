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
                allComparisons: [],
                items: [],
                participantCounts: new Map(),
            }),
        ).toEqual([]);
    });

    it("gives single item score=1", () => {
        const result = computeScores({
            allComparisons: [],
            items: ["A"],
            participantCounts: new Map([["A", 1]]),
        });
        expect(result).toHaveLength(1);
        expect(result[0].score).toBe(1);
        expect(result[0].participantCount).toBe(1);
    });

    it("ranks clear winner highest with BT MLE", () => {
        // A always best, C always worst
        const allComparisons = [
            comp({ best: "A", worst: "C", set: ["A", "B", "C"] }),
            comp({ best: "A", worst: "C", set: ["A", "B", "C"] }),
            comp({ best: "A", worst: "B", set: ["A", "B", "C"] }),
        ];
        const result = computeScores({
            allComparisons,
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

    it("items with no comparisons get lowest score", () => {
        const allComparisons = [
            comp({ best: "A", worst: "B", set: ["A", "B"] }),
        ];
        const result = computeScores({
            allComparisons,
            items: ["A", "B", "C"],
            participantCounts: new Map([
                ["A", 1],
                ["B", 1],
                ["C", 0],
            ]),
        });

        const scoreC = findItem({ results: result, id: "C" });
        expect(scoreC.participantCount).toBe(0);
        // C has high uncertainty (never compared)
    });

    it("scores are in [0, 1] range", () => {
        const allComparisons = [
            comp({ best: "A", worst: "D", set: ["A", "B", "C", "D"] }),
            comp({ best: "B", worst: "C", set: ["A", "B", "C", "D"] }),
        ];
        const result = computeScores({
            allComparisons,
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
            allComparisons: [],
            items: [],
            participantCounts: new Map(),
        });
        expect(result).toEqual([]);
    });

    it("with fewer items, scores renormalize", () => {
        // 4 items: A beats C, B beats D
        const comps4 = [
            comp({ best: "A", worst: "C", set: ["A", "B", "C", "D"] }),
            comp({ best: "A", worst: "D", set: ["A", "B", "C", "D"] }),
            comp({ best: "B", worst: "C", set: ["A", "B", "C", "D"] }),
        ];
        const result4 = computeScores({
            allComparisons: comps4,
            items: ["A", "B", "C", "D"],
            participantCounts: new Map([
                ["A", 3],
                ["B", 3],
                ["C", 3],
                ["D", 3],
            ]),
        });

        // Remove D, comparisons referencing D get D filtered from set
        const comps3 = [
            comp({ best: "A", worst: "C", set: ["A", "B", "C"] }),
            comp({ best: "B", worst: "C", set: ["A", "B", "C"] }),
        ];
        const result3 = computeScores({
            allComparisons: comps3,
            items: ["A", "B", "C"],
            participantCounts: new Map([
                ["A", 2],
                ["B", 2],
                ["C", 2],
            ]),
        });

        // A should be top in both (has most wins)
        expect(result4[0].itemSlugId).toBe("A");
        expect(result3[0].itemSlugId).toBe("A");
        // C should be last in both
        expect(result4[result4.length - 1].itemSlugId).toBe("C");
        expect(result3[result3.length - 1].itemSlugId).toBe("C");
    });
});

describe("parseResultRows", () => {
    it("extracts comparisons from rows", () => {
        const { allComparisons, participantCounts } = parseResultRows({
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

        expect(allComparisons).toHaveLength(1);
        expect(allComparisons[0].best).toBe("A");
        expect(participantCounts.get("A")).toBe(1);
        expect(participantCounts.get("B")).toBe(1);
        expect(participantCounts.get("C")).toBe(1);
    });

    it("filters comparisons to only active items", () => {
        const { allComparisons } = parseResultRows({
            rows: [
                {
                    ranking: null,
                    comparisons: [
                        { best: "A", worst: "D", set: ["A", "B", "C", "D"] },
                    ],
                },
            ],
            items: ["A", "C", "D"], // B removed
        });

        expect(allComparisons).toHaveLength(1);
        expect(allComparisons[0].set).not.toContain("B");
        expect(allComparisons[0].set).toContain("A");
        expect(allComparisons[0].set).toContain("C");
        expect(allComparisons[0].set).toContain("D");
    });

    it("skips comparisons that only reference removed items", () => {
        const { allComparisons } = parseResultRows({
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

        expect(allComparisons).toHaveLength(0);
    });

    it("pools comparisons from multiple users", () => {
        const { allComparisons, participantCounts } = parseResultRows({
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

        expect(allComparisons).toHaveLength(2);
        // Both users compared all 3 items
        expect(participantCounts.get("A")).toBe(2);
        expect(participantCounts.get("B")).toBe(2);
        expect(participantCounts.get("C")).toBe(2);
    });

    it("counts participants per item correctly when different users compare different items", () => {
        const { participantCounts } = parseResultRows({
            rows: [
                {
                    ranking: null,
                    comparisons: [
                        { best: "A", worst: "B", set: ["A", "B"] },
                    ],
                },
                {
                    ranking: null,
                    comparisons: [
                        { best: "C", worst: "D", set: ["C", "D"] },
                    ],
                },
            ],
            items: ["A", "B", "C", "D"],
        });

        expect(participantCounts.get("A")).toBe(1);
        expect(participantCounts.get("B")).toBe(1);
        expect(participantCounts.get("C")).toBe(1);
        expect(participantCounts.get("D")).toBe(1);
    });
});

describe("snapshot correctness", () => {
    it("snapshot values are computable from comparisons", () => {
        const allComparisons = [
            comp({ best: "A", worst: "C", set: ["A", "B", "C", "D", "E"] }),
            comp({ best: "A", worst: "E", set: ["A", "B", "C", "D", "E"] }),
            comp({ best: "B", worst: "D", set: ["A", "B", "C", "D", "E"] }),
        ];
        const scores = computeScores({
            allComparisons,
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

    it("sequential snapshots with different active items produce different scores", () => {
        // With 5 items
        const comps = [
            comp({ best: "A", worst: "E", set: ["A", "B", "C", "D", "E"] }),
            comp({ best: "B", worst: "D", set: ["A", "B", "C", "D", "E"] }),
        ];
        const scoresAll = computeScores({
            allComparisons: comps,
            items: ["A", "B", "C", "D", "E"],
            participantCounts: new Map([
                ["A", 2],
                ["B", 2],
                ["C", 2],
                ["D", 2],
                ["E", 2],
            ]),
        });
        const snapshotC = findItem({ results: scoresAll, id: "C" });

        // With C removed, recompute for D
        const compsWithoutC = comps.map((c) => ({
            ...c,
            set: c.set.filter((id) => id !== "C"),
        }));
        const scoresWithoutC = computeScores({
            allComparisons: compsWithoutC,
            items: ["A", "B", "D", "E"],
            participantCounts: new Map([
                ["A", 2],
                ["B", 2],
                ["D", 2],
                ["E", 2],
            ]),
        });
        const snapshotD = findItem({ results: scoresWithoutC, id: "D" });

        // Scores computed with different n should differ
        expect(snapshotC.score).not.toEqual(snapshotD.score);
    });
});
