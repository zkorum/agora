/**
 * Server-side MaxDiff routing — generates candidate sets for voting.
 *
 * Uses greedy sequential selection combining:
 * 1. Global uncertainty (items needing more comparisons across all voters)
 * 2. Pairwise information gain (items specifically unresolved against each
 *    other for this user — maximizes transitive closure per vote)
 * 3. Frequency balancing (avoids repeating the same items across buffer)
 * 4. Fisher-Yates shuffle (prevents position bias)
 */

import type { MaxDiffComparison } from "@/shared/types/zod.js";
import { buildComparisonMatrix } from "./maxdiffEngine.js";
import { fisherYatesShuffle } from "./bradleyTerry.js";

/** Weight for pairwise information bonus relative to base uncertainty score. */
const PAIRWISE_WEIGHT = 0.5;

/**
 * Build a bidirectional adjacency map from unordered pairs for O(1) lookup.
 * Returns a function that checks if two items are unordered (unresolved).
 */
function buildUnorderedLookup(
    unorderedPairs: [string, string][],
): (a: string, b: string) => boolean {
    const adjacency = new Map<string, Set<string>>();
    for (const [a, b] of unorderedPairs) {
        // Safe to use get() after set() — both keys guaranteed to exist
        if (!adjacency.has(a)) adjacency.set(a, new Set());
        if (!adjacency.has(b)) adjacency.set(b, new Set());
        adjacency.get(a)?.add(b);
        adjacency.get(b)?.add(a);
    }
    return (a: string, b: string): boolean =>
        adjacency.get(a)?.has(b) ?? false;
}

/**
 * Generate candidate sets for a user's next MaxDiff voting rounds.
 *
 * Uses greedy sequential selection: picks the first item by global
 * uncertainty, then greedily adds items that maximize unresolved pairwise
 * relationships with already-selected items. This ensures each candidate
 * set produces maximum information gain via transitive closure.
 *
 * Pure function — no DB access.
 */
export function generateCandidateSets({
    userComparisons,
    items,
    globalUncertainty,
    bufferSize,
    candidateSetSize = 4,
}: {
    userComparisons: MaxDiffComparison[];
    items: string[];
    globalUncertainty: Map<string, number>;
    bufferSize: number;
    candidateSetSize?: number;
}): string[][] {
    if (items.length < 2 || bufferSize <= 0) return [];

    // Rebuild user's comparison matrix to find unordered items
    const { applyComparison, getUnorderedPairs } = buildComparisonMatrix({
        items,
    });
    for (const comparison of userComparisons) {
        applyComparison(comparison);
    }

    const unorderedPairs = getUnorderedPairs();

    // Collect all items that still have unresolved pairwise comparisons
    const unorderedItems = new Set<string>();
    for (const [a, b] of unorderedPairs) {
        unorderedItems.add(a);
        unorderedItems.add(b);
    }
    if (unorderedItems.size < 2) return [];

    const itemPool = [...unorderedItems];
    const isUnordered = buildUnorderedLookup(unorderedPairs);

    // Track appearance counts for frequency balancing across generated sets
    const appearanceCounts = new Map<string, number>();
    for (const item of itemPool) {
        appearanceCounts.set(item, 0);
    }

    const candidateSets: string[][] = [];

    for (let setIdx = 0; setIdx < bufferSize; setIdx++) {
        const baseScores = new Map<string, number>();
        for (const item of itemPool) {
            baseScores.set(
                item,
                (globalUncertainty.get(item) ?? 0) -
                    (appearanceCounts.get(item) ?? 0) * 0.3,
            );
        }

        // Greedy sequential selection
        const selected: string[] = [];
        const selectedSet = new Set<string>();

        for (let i = 0; i < candidateSetSize; i++) {
            let bestItem: string | undefined;
            let bestScore = -Infinity;

            for (const item of itemPool) {
                if (selectedSet.has(item)) continue;

                let score = baseScores.get(item) ?? 0;

                // Pairwise bonus: count how many already-selected items
                // are specifically unresolved against this candidate
                if (selected.length > 0) {
                    let pairwiseCount = 0;
                    for (const sel of selected) {
                        if (isUnordered(item, sel)) {
                            pairwiseCount++;
                        }
                    }
                    score += pairwiseCount * PAIRWISE_WEIGHT;
                }

                if (score > bestScore) {
                    bestScore = score;
                    bestItem = item;
                }
            }

            if (bestItem === undefined) break;
            selected.push(bestItem);
            selectedSet.add(bestItem);
        }

        if (selected.length < 2) break;

        // Randomize order to prevent position bias
        fisherYatesShuffle(selected);
        candidateSets.push(selected);

        // Update frequency counts
        for (const item of selected) {
            const count = appearanceCounts.get(item) ?? 0;
            appearanceCounts.set(item, count + 1);
        }
    }

    return candidateSets;
}
