import { describe, it, expect, vi } from "vitest";
import { generateCandidateSets } from "./comparisonRouting.js";
import { buildComparisonMatrix } from "./comparisonEngine.js";

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

    it("keeps unresolved pairs after one answer", () => {
        const { applyComparison, getUnorderedPairs } = buildComparisonMatrix({
            items: ["A", "B", "C", "D"],
        });
        // Only compare A vs B
        applyComparison({ best: "A", worst: "B", set: ["A", "B"] });
        expect(getUnorderedPairs()).toEqual([
            ["A", "C"],
            ["A", "D"],
            ["B", "C"],
            ["B", "D"],
            ["C", "D"],
        ]);
    });

    it("handles empty items", () => {
        const { getUnorderedPairs } = buildComparisonMatrix({ items: [] });
        expect(getUnorderedPairs()).toEqual([]);
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
    const uniformUncertainty = new Map(items.map((item) => [item, 1.0]));

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

    it("returns a nonempty buffer without exceeding its limit", () => {
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

    it("stops offering tasks when prior answers resolve every pair", () => {
        const result = generateCandidateSets({
            userComparisons: [
                { best: "A", worst: "B", set: ["A", "B"] },
                { best: "B", worst: "C", set: ["B", "C"] },
            ],
            items: ["A", "B", "C"],
            globalUncertainty: new Map(),
            bufferSize: 3,
        });
        expect(result).toEqual([]);
    });

    it("never returns a fully resolved task while other pairs remain unresolved", () => {
        const items = ["A", "B", "C", "D", "E", "F"];
        const userComparisons = [
            { best: "A", worst: "C", set: ["A", "B", "C"] },
            { best: "C", worst: "D", set: ["C", "D"] },
            { best: "E", worst: "F", set: ["E", "F"] },
        ];
        const result = generateCandidateSets({
            userComparisons,
            items,
            globalUncertainty: new Map(
                items.map((item) => [
                    item,
                    ["A", "B", "C", "D"].includes(item) ? 10 : 0.1,
                ]),
            ),
            bufferSize: 20,
        });
        expect(result).not.toHaveLength(0);
        for (const set of result) {
            // A > B > C > D and E > F; only pairs across the chains are unresolved.
            expect(set.some((item) => ["A", "B", "C", "D"].includes(item))).toBe(
                true,
            );
            expect(set.some((item) => ["E", "F"].includes(item))).toBe(true);
        }
    });

    it("does not consider a task's middle pair resolved merely because it co-appeared", () => {
        const result = generateCandidateSets({
            userComparisons: [
                { best: "A", worst: "D", set: ["A", "B", "C", "D"] },
            ],
            items: ["A", "B", "C", "D"],
            globalUncertainty: new Map(),
            bufferSize: 1,
        });
        expect(result).toHaveLength(1);
        expect(new Set(result[0])).toEqual(new Set(["B", "C"]));
    });

    it("favors the more uncertain item when all pairs offer equal coverage", () => {
        const select = (uncertainItem: string) =>
            generateCandidateSets({
                userComparisons: [],
                items: ["A", "B", "C"],
                globalUncertainty: new Map([[uncertainItem, 10]]),
                bufferSize: 1,
                candidateSetSize: 2,
            }).map((set) => [...set].sort());

        expect(select("B")).toEqual([["A", "B"]]);
        expect(select("C")).toEqual([["A", "C"]]);
    });

    it("can present either ordering of the same two-item task", () => {
        const generate = () =>
            generateCandidateSets({
                userComparisons: [],
                items: ["A", "B"],
                globalUncertainty: new Map(),
                bufferSize: 1,
            });
        const random = vi.spyOn(Math, "random");
        try {
            random.mockReturnValue(0);
            const first = generate();
            random.mockReturnValue(0.9);
            const second = generate();
            expect([first, second]).toEqual(
                expect.arrayContaining([[["A", "B"]], [["B", "A"]]]),
            );
        } finally {
            random.mockRestore();
        }
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
});

// --- pair coverage across buffer ---

describe("pair coverage", () => {
    /** Canonical key for an unordered pair. */
    function pairKey(a: string, b: string): string {
        return a < b ? `${a}|${b}` : `${b}|${a}`;
    }

    /** Collect all co-appearing pairs across all sets. */
    function collectCoveredPairs(sets: string[][]): Set<string> {
        const covered = new Set<string>();
        for (const set of sets) {
            for (let i = 0; i < set.length; i++) {
                for (let j = i + 1; j < set.length; j++) {
                    covered.add(pairKey(set[i], set[j]));
                }
            }
        }
        return covered;
    }

    /** All C(n,2) pairs from an item list. */
    function allPairs(items: string[]): Set<string> {
        const pairs = new Set<string>();
        for (let i = 0; i < items.length; i++) {
            for (let j = i + 1; j < items.length; j++) {
                pairs.add(pairKey(items[i], items[j]));
            }
        }
        return pairs;
    }

    /** Collect item sets ignoring order (for duplicate detection). */
    function setSignature(items: string[]): string {
        return [...items].sort().join(",");
    }

    // --- Core guarantee ---

    it("6 items, 5 sets: all 15 pairs co-appear in at least one set", () => {
        const items = ["A", "B", "C", "D", "E", "F"];
        const uncertainty = new Map(items.map((id) => [id, 1.0]));
        const result = generateCandidateSets({
            userComparisons: [],
            items,
            globalUncertainty: uncertainty,
            bufferSize: 5,
            candidateSetSize: 4,
        });
        const covered = collectCoveredPairs(result);
        const expected = allPairs(items);
        for (const pair of expected) {
            expect(covered.has(pair), `missing pair: ${pair}`).toBe(true);
        }
    });

    it("10 items, 10 sets: all 45 pairs covered", () => {
        const items = Array.from({ length: 10 }, (_, i) =>
            String.fromCharCode(65 + i),
        );
        const uncertainty = new Map(items.map((id) => [id, 1.0]));
        const result = generateCandidateSets({
            userComparisons: [],
            items,
            globalUncertainty: uncertainty,
            bufferSize: 10,
            candidateSetSize: 4,
        });
        const covered = collectCoveredPairs(result);
        const expected = allPairs(items);
        for (const pair of expected) {
            expect(covered.has(pair), `missing pair: ${pair}`).toBe(true);
        }
    });

    it("no identical sets in buffer with uniform uncertainty", () => {
        const items = ["A", "B", "C", "D", "E", "F"];
        const uncertainty = new Map(items.map((id) => [id, 1.0]));
        const result = generateCandidateSets({
            userComparisons: [],
            items,
            globalUncertainty: uncertainty,
            bufferSize: 5,
            candidateSetSize: 4,
        });
        const signatures = result.map(setSignature);
        expect(new Set(signatures).size).toBe(signatures.length);
    });

    // --- Edge cases ---

    it("2 items, 1 set: the single pair is covered", () => {
        const items = ["A", "B"];
        const uncertainty = new Map(items.map((id) => [id, 1.0]));
        const result = generateCandidateSets({
            userComparisons: [],
            items,
            globalUncertainty: uncertainty,
            bufferSize: 1,
            candidateSetSize: 4,
        });
        expect(result).toHaveLength(1);
        expect(result[0].sort()).toEqual(["A", "B"]);
    });

    it("3 items, candidateSetSize=3: single set covers all 3 pairs", () => {
        const items = ["A", "B", "C"];
        const uncertainty = new Map(items.map((id) => [id, 1.0]));
        const result = generateCandidateSets({
            userComparisons: [],
            items,
            globalUncertainty: uncertainty,
            bufferSize: 1,
            candidateSetSize: 3,
        });
        expect(result).toHaveLength(1);
        expect(result[0].sort()).toEqual(["A", "B", "C"]);
    });

    it("items fewer than candidateSetSize: set contains all items", () => {
        const items = ["A", "B", "C"];
        const uncertainty = new Map(items.map((id) => [id, 1.0]));
        const result = generateCandidateSets({
            userComparisons: [],
            items,
            globalUncertainty: uncertainty,
            bufferSize: 1,
            candidateSetSize: 4,
        });
        expect(result).toHaveLength(1);
        expect(result[0].sort()).toEqual(["A", "B", "C"]);
    });

    it("partially ordered: all remaining unordered pairs covered", () => {
        const items = ["A", "B", "C", "D", "E", "F"];
        const uncertainty = new Map(items.map((id) => [id, 1.0]));
        // A>B, A>C, B>C resolved. 12 pairs remain unordered.
        const comparisons = [{ best: "A", worst: "C", set: ["A", "B", "C"] }];
        const result = generateCandidateSets({
            userComparisons: comparisons,
            items,
            globalUncertainty: uncertainty,
            bufferSize: 5,
            candidateSetSize: 4,
        });
        // All 12 remaining unordered pairs should co-appear across 5 sets
        const covered = collectCoveredPairs(result);
        const { applyComparison, getUnorderedPairs } = buildComparisonMatrix({
            items,
        });
        for (const c of comparisons) applyComparison(c);
        for (const [a, b] of getUnorderedPairs()) {
            expect(
                covered.has(pairKey(a, b)),
                `missing unordered pair: ${a},${b}`,
            ).toBe(true);
        }
    });

    // --- Voting simulation (the user's actual bug) ---

    it("6 items, min=best/max=worst voting: unique sets resolve more pairs than duplicates would", () => {
        const items = ["A", "B", "C", "D", "E", "F"];
        const uncertainty = new Map(items.map((id) => [id, 1.0]));
        const sets = generateCandidateSets({
            userComparisons: [],
            items,
            globalUncertainty: uncertainty,
            bufferSize: 5,
            candidateSetSize: 4,
        });

        // Simulate "pick min as best, max as worst" voting on generated sets
        const { applyComparison, getUnorderedPairs } = buildComparisonMatrix({
            items,
        });
        for (const set of sets) {
            const sorted = [...set].sort();
            applyComparison({
                best: sorted[0],
                worst: sorted[sorted.length - 1],
                set,
            });
        }
        const remaining = getUnorderedPairs().length;
        // With 5 unique sets and transitive closure, at most 3 pairs
        // can remain unordered (vs 3 unordered with the old duplicate sets).
        // The key: with unique sets we should resolve strictly more.
        // 15 total pairs. Old behavior: 12 resolved (3 unordered).
        // Fixed behavior: should resolve at least 13 (ideally all 15).
        expect(remaining).toBeLessThanOrEqual(2);
    });

    // --- Scale ---

    it("20 items, 10 sets: no duplicate sets and maximizes unique pairs", () => {
        const items = Array.from({ length: 20 }, (_, i) =>
            String.fromCharCode(65 + i),
        );
        const uncertainty = new Map(items.map((id) => [id, 1.0]));
        const result = generateCandidateSets({
            userComparisons: [],
            items,
            globalUncertainty: uncertainty,
            bufferSize: 10,
            candidateSetSize: 4,
        });
        // No duplicate sets
        const signatures = result.map(setSignature);
        expect(new Set(signatures).size).toBe(signatures.length);
        // 10 sets of 4 → 60 pair slots. Should cover at least 50 unique pairs
        // (C(20,2)=190 total, but 60 slots can cover at most 60 unique pairs)
        const covered = collectCoveredPairs(result);
        expect(covered.size).toBeGreaterThanOrEqual(50);
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
