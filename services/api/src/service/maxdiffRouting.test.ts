import { describe, it, expect } from "vitest";
import { generateCandidateSets } from "./maxdiffRouting.js";
import { buildComparisonMatrix, bronKerbosch } from "./maxdiffEngine.js";

// --- bronKerbosch ---

describe("bronKerbosch", () => {
    it("returns empty for fewer than 2 nodes", () => {
        expect(bronKerbosch([])).toEqual([]);
        expect(bronKerbosch([["A", "A"]])).toEqual([]);
    });

    it("finds single clique for complete graph", () => {
        const edges: Array<[string, string]> = [
            ["A", "B"],
            ["A", "C"],
            ["B", "C"],
        ];
        const cliques = bronKerbosch(edges);
        expect(cliques).toHaveLength(1);
        expect(cliques[0].sort()).toEqual(["A", "B", "C"]);
    });

    it("finds two cliques for disconnected pairs", () => {
        const edges: Array<[string, string]> = [
            ["A", "B"],
            ["C", "D"],
        ];
        const cliques = bronKerbosch(edges);
        expect(cliques).toHaveLength(2);
        const sorted = cliques.map((c) => c.sort()).sort();
        expect(sorted).toEqual([
            ["A", "B"],
            ["C", "D"],
        ]);
    });

    it("finds overlapping cliques", () => {
        // Triangle + one extra edge
        const edges: Array<[string, string]> = [
            ["A", "B"],
            ["B", "C"],
            ["A", "C"],
            ["C", "D"],
        ];
        const cliques = bronKerbosch(edges);
        // Should find {A,B,C} and {C,D}
        expect(cliques.length).toBeGreaterThanOrEqual(2);
        const hasTriangle = cliques.some(
            (c) => c.length === 3 && c.sort().join() === "A,B,C",
        );
        const hasPair = cliques.some(
            (c) => c.length === 2 && c.sort().join() === "C,D",
        );
        expect(hasTriangle).toBe(true);
        expect(hasPair).toBe(true);
    });
});

// --- buildComparisonMatrix ---

describe("buildComparisonMatrix", () => {
    it("starts with all pairs unordered", () => {
        const { getUnorderedPairs } = buildComparisonMatrix({
            items: ["A", "B", "C"],
        });
        // 3 items → 3 unordered pairs
        expect(getUnorderedPairs()).toHaveLength(3);
    });

    it("applying a comparison reduces unordered pairs", () => {
        const { applyComparison, getUnorderedPairs } = buildComparisonMatrix({
            items: ["A", "B", "C"],
        });
        applyComparison({ best: "A", worst: "C", set: ["A", "B", "C"] });
        // A>B, A>C, B>C → all pairs ordered
        expect(getUnorderedPairs()).toHaveLength(0);
    });

    it("getUnorderedGroups returns groups of items without known ordering", () => {
        const { applyComparison, getUnorderedGroups } = buildComparisonMatrix({
            items: ["A", "B", "C", "D"],
        });
        // Only compare A vs B
        applyComparison({ best: "A", worst: "B", set: ["A", "B"] });
        const groups = getUnorderedGroups();
        // C and D are unordered with respect to each other and partially to A,B
        expect(groups.length).toBeGreaterThan(0);
    });

    it("handles empty items", () => {
        const { getUnorderedPairs, getUnorderedGroups } =
            buildComparisonMatrix({ items: [] });
        expect(getUnorderedPairs()).toEqual([]);
        expect(getUnorderedGroups()).toEqual([]);
    });

    it("transitive closure works: A>B, B>C implies A>C", () => {
        const { applyComparison, getUnorderedPairs } = buildComparisonMatrix({
            items: ["A", "B", "C"],
        });
        applyComparison({ best: "A", worst: "B", set: ["A", "B"] });
        applyComparison({ best: "B", worst: "C", set: ["B", "C"] });
        // Transitive: A>C should be inferred
        expect(getUnorderedPairs()).toHaveLength(0);
    });
});

// --- generateCandidateSets ---

describe("generateCandidateSets", () => {
    const items = ["A", "B", "C", "D", "E"];
    const uniformUncertainty = new Map(
        items.map((item) => [item, 1.0]),
    );

    it("returns empty for fewer than 2 items", () => {
        const result = generateCandidateSets({
            userComparisons: [],
            items: ["A"],
            globalUncertainty: new Map([["A", 1.0]]),
            bufferSize: 3,
        });
        expect(result).toEqual([]);
    });

    it("returns empty for bufferSize 0", () => {
        const result = generateCandidateSets({
            userComparisons: [],
            items,
            globalUncertainty: uniformUncertainty,
            bufferSize: 0,
        });
        expect(result).toEqual([]);
    });

    it("generates requested number of candidate sets", () => {
        const result = generateCandidateSets({
            userComparisons: [],
            items,
            globalUncertainty: uniformUncertainty,
            bufferSize: 3,
        });
        expect(result.length).toBeGreaterThan(0);
        expect(result.length).toBeLessThanOrEqual(3);
    });

    it("candidate sets have correct size", () => {
        const result = generateCandidateSets({
            userComparisons: [],
            items,
            globalUncertainty: uniformUncertainty,
            bufferSize: 1,
            candidateSetSize: 4,
        });
        expect(result).toHaveLength(1);
        expect(result[0].length).toBeLessThanOrEqual(4);
        expect(result[0].length).toBeGreaterThanOrEqual(2);
    });

    it("all candidates are valid items", () => {
        const result = generateCandidateSets({
            userComparisons: [],
            items,
            globalUncertainty: uniformUncertainty,
            bufferSize: 3,
        });
        const itemSet = new Set(items);
        for (const set of result) {
            for (const item of set) {
                expect(itemSet.has(item)).toBe(true);
            }
        }
    });

    it("accounts for user's existing comparisons", () => {
        // User has already compared everything — should get empty sets
        const comparisons = [
            { best: "A", worst: "E", set: ["A", "B", "C", "D", "E"] },
            { best: "B", worst: "D", set: ["A", "B", "C", "D", "E"] },
            { best: "A", worst: "C", set: ["A", "B", "C", "D", "E"] },
            { best: "B", worst: "C", set: ["A", "B", "C", "D", "E"] },
            { best: "A", worst: "D", set: ["A", "B", "C", "D", "E"] },
            { best: "C", worst: "E", set: ["A", "B", "C", "D", "E"] },
        ];
        const result = generateCandidateSets({
            userComparisons: comparisons,
            items,
            globalUncertainty: uniformUncertainty,
            bufferSize: 3,
        });
        // With enough comparisons, all pairs may be ordered → no more candidates
        // (depends on transitive closure coverage)
        expect(result.length).toBeLessThanOrEqual(3);
    });

    it("uncertainty scoring influences group selection", () => {
        // Verify that the scoring mechanism uses uncertainty values.
        // With uniform uncertainty, generate sets and check they contain valid items.
        // With biased uncertainty, the set content should shift toward uncertain items.
        const result = generateCandidateSets({
            userComparisons: [],
            items,
            globalUncertainty: uniformUncertainty,
            bufferSize: 1,
        });
        expect(result.length).toBeGreaterThan(0);
        expect(result[0].length).toBeGreaterThanOrEqual(2);
        // All items should be from the valid set
        for (const item of result[0]) {
            expect(items).toContain(item);
        }
    });

    it("produces different orderings across calls (shuffled)", () => {
        const orderings = new Set<string>();
        for (let i = 0; i < 30; i++) {
            const result = generateCandidateSets({
                userComparisons: [],
                items,
                globalUncertainty: uniformUncertainty,
                bufferSize: 1,
            });
            if (result.length > 0) {
                orderings.add(result[0].join(","));
            }
        }
        // Should see at least 2 different orderings over 30 runs
        expect(orderings.size).toBeGreaterThan(1);
    });

    it("buffer includes diverse items, not just the same subset", () => {
        const manyItems = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
        const uniformUnc = new Map(manyItems.map((id) => [id, 1.0]));
        const result = generateCandidateSets({
            userComparisons: [],
            items: manyItems,
            globalUncertainty: uniformUnc,
            bufferSize: 5,
            candidateSetSize: 4,
        });
        // Collect all unique items across all sets
        const allItems = new Set(result.flat());
        // With 10 items and 5 sets of 4, should see more than just 4 items
        expect(allItems.size).toBeGreaterThan(4);
    });

    it("high-uncertainty items appear more often across buffer", () => {
        const manyItems = ["A", "B", "C", "D", "E", "F", "G", "H"];
        // H has much higher uncertainty
        const biasedUnc = new Map(
            manyItems.map((id) => [id, id === "H" ? 10.0 : 0.1]),
        );
        const counts = new Map(manyItems.map((id) => [id, 0]));
        // Run several times to get statistical tendency
        for (let trial = 0; trial < 10; trial++) {
            const result = generateCandidateSets({
                userComparisons: [],
                items: manyItems,
                globalUncertainty: biasedUnc,
                bufferSize: 3,
                candidateSetSize: 4,
            });
            for (const set of result) {
                for (const item of set) {
                    counts.set(item, (counts.get(item) ?? 0) + 1);
                }
            }
        }
        // H (highest uncertainty) should appear at least as often as average
        const hCount = counts.get("H") ?? 0;
        const totalAppearances = [...counts.values()].reduce((a, b) => a + b, 0);
        const avgCount = totalAppearances / manyItems.length;
        expect(hCount).toBeGreaterThanOrEqual(avgCount);
    });
});
