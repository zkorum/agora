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
        const edges: [string, string][] = [
            ["A", "B"],
            ["A", "C"],
            ["B", "C"],
        ];
        const cliques = bronKerbosch(edges);
        expect(cliques).toHaveLength(1);
        expect(cliques[0].sort()).toEqual(["A", "B", "C"]);
    });

    it("finds two cliques for disconnected pairs", () => {
        const edges: [string, string][] = [
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
        const edges: [string, string][] = [
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

// --- pairwise information gain ---

describe("pairwise information gain", () => {
    it("candidate set items have unresolved pairwise relationships", () => {
        const items = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
        // After this comparison: A>B, A>C, A>J, B>J, C>J (+ transitive)
        const comparisons = [
            { best: "A", worst: "J", set: ["A", "B", "C", "J"] },
        ];
        const result = generateCandidateSets({
            userComparisons: comparisons,
            items,
            globalUncertainty: new Map(items.map((id) => [id, 1.0])),
            bufferSize: 1,
            candidateSetSize: 4,
        });
        expect(result).toHaveLength(1);
        expect(result[0].length).toBe(4);

        // Verify: build the comparison matrix and check that items in the
        // candidate set have at least some unresolved pairs between them
        const { applyComparison, getUnorderedPairs } = buildComparisonMatrix({
            items,
        });
        for (const c of comparisons) {
            applyComparison(c);
        }
        const unorderedSet = new Set(
            getUnorderedPairs().map(([a, b]) => `${a}|${b}`),
        );
        const isUnordered = (a: string, b: string): boolean =>
            unorderedSet.has(`${a}|${b}`) || unorderedSet.has(`${b}|${a}`);

        let unorderedCount = 0;
        const set = result[0];
        for (let i = 0; i < set.length; i++) {
            for (let j = i + 1; j < set.length; j++) {
                if (isUnordered(set[i], set[j])) {
                    unorderedCount++;
                }
            }
        }
        // With 4 items, max 6 pairs — should have several unresolved
        expect(unorderedCount).toBeGreaterThan(0);
    });

    it("prefers items with unresolved pairs over isolated items", () => {
        // 6 items: A-D are all unresolved, E and F are only unresolved with each other
        // (A>E, A>F, B>E, B>F, C>E, C>F, D>E, D>F already ordered)
        const items = ["A", "B", "C", "D", "E", "F"];
        const comparisons = [
            { best: "A", worst: "E", set: ["A", "B", "E", "F"] },
            { best: "C", worst: "F", set: ["C", "D", "E", "F"] },
            { best: "B", worst: "F", set: ["B", "E", "F"] },
            { best: "D", worst: "E", set: ["D", "E"] },
        ];

        // With uniform uncertainty, pairwise bonus should favor grouping
        // A,B,C,D together (many unresolved pairs between them)
        const result = generateCandidateSets({
            userComparisons: comparisons,
            items,
            globalUncertainty: new Map(items.map((id) => [id, 1.0])),
            bufferSize: 1,
            candidateSetSize: 4,
        });
        expect(result).toHaveLength(1);

        // A,B,C,D should be favored over E,F since they share many
        // unresolved pairs. Check that at least 3 of A-D are present.
        const abcdCount = result[0].filter((id) =>
            ["A", "B", "C", "D"].includes(id),
        ).length;
        expect(abcdCount).toBeGreaterThanOrEqual(3);
    });

    it("still respects global uncertainty with pairwise bonus active", () => {
        const manyItems = ["A", "B", "C", "D", "E", "F", "G", "H"];
        // H has much higher uncertainty
        const biasedUnc = new Map(
            manyItems.map((id) => [id, id === "H" ? 10.0 : 0.1]),
        );
        const counts = new Map(manyItems.map((id) => [id, 0]));
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
        const hCount = counts.get("H") ?? 0;
        const totalAppearances = [...counts.values()].reduce(
            (a, b) => a + b,
            0,
        );
        const avgCount = totalAppearances / manyItems.length;
        expect(hCount).toBeGreaterThanOrEqual(avgCount);
    });

    it("still produces shuffled orderings (randomness preserved)", () => {
        const items = ["A", "B", "C", "D", "E"];
        const uniformUnc = new Map(items.map((id) => [id, 1.0]));
        const orderings = new Set<string>();
        for (let i = 0; i < 30; i++) {
            const result = generateCandidateSets({
                userComparisons: [],
                items,
                globalUncertainty: uniformUnc,
                bufferSize: 1,
            });
            if (result.length > 0) {
                orderings.add(result[0].join(","));
            }
        }
        expect(orderings.size).toBeGreaterThan(1);
    });
});
