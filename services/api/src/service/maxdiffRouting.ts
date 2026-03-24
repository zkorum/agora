/**
 * Server-side MaxDiff routing — generates candidate sets for voting.
 *
 * Uses cross-user comparison-count uncertainty to prioritize items that
 * need more comparisons, combined with per-user comparison state and
 * frequency balancing across the buffer.
 */

import type { MaxDiffComparison } from "@/shared/types/zod.js";
import { buildComparisonMatrix } from "./maxdiffEngine.js";
import { fisherYatesShuffle } from "./bradleyTerry.js";

/**
 * Generate candidate sets for a user's next MaxDiff voting rounds.
 *
 * Selects items directly based on uncertainty and frequency — not via
 * Bron-Kerbosch group selection (which would return the same group for
 * every set in the buffer since the comparison matrix doesn't change).
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

    // Collect all items that still have unresolved pairwise comparisons
    const unorderedItems = new Set<string>();
    for (const [a, b] of getUnorderedPairs()) {
        unorderedItems.add(a);
        unorderedItems.add(b);
    }
    if (unorderedItems.size < 2) return [];

    const itemPool = [...unorderedItems];

    // Track appearance counts for frequency balancing across generated sets
    const appearanceCounts = new Map<string, number>();
    for (const item of itemPool) {
        appearanceCounts.set(item, 0);
    }

    const candidateSets: string[][] = [];

    for (let setIdx = 0; setIdx < bufferSize; setIdx++) {
        // Score each item: high uncertainty = good, high frequency = penalized
        const scored = itemPool
            .map((item) => ({
                item,
                score:
                    (globalUncertainty.get(item) ?? 0) -
                    (appearanceCounts.get(item) ?? 0) * 0.3,
            }))
            .sort((a, b) => b.score - a.score);

        // Pick top items, with slight randomness in the selection
        // Shuffle among candidates near the cutoff to avoid determinism
        const topItems = scored.slice(0, candidateSetSize).map((s) => s.item);
        if (topItems.length < 2) break;

        fisherYatesShuffle(topItems);
        candidateSets.push(topItems);

        // Update frequency counts
        for (const item of topItems) {
            const count = appearanceCounts.get(item) ?? 0;
            appearanceCounts.set(item, count + 1);
        }
    }

    return candidateSets;
}
