import { describe, it, expect } from "vitest";
import { parseResultRows } from "./maxdiff.js";

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
