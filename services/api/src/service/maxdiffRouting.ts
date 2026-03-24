/**
 * Server-side MaxDiff routing — generates candidate sets for voting.
 *
 * Uses cross-user BT uncertainty to prioritize items that need more
 * comparisons, combined with per-user comparison state (Bron-Kerbosch
 * unordered groups) and Fisher-Yates position shuffle.
 */

import type { MaxDiffComparison } from "@/shared/types/zod.js";
import { buildComparisonMatrix } from "./maxdiffEngine.js";
import { fisherYatesShuffle } from "./bradleyTerry.js";

/**
 * Generate candidate sets for a user's next MaxDiff voting rounds.
 *
 * Pure function — no DB access. Takes pre-computed global uncertainty
 * and the user's comparison history.
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

    // Rebuild user's comparison matrix from their history
    const { applyComparison, getUnorderedGroups } = buildComparisonMatrix({
        items,
    });
    for (const comparison of userComparisons) {
        applyComparison(comparison);
    }

    // Track appearance counts for frequency balancing across generated sets
    const appearanceCounts = new Map<string, number>();
    for (const item of items) {
        appearanceCounts.set(item, 0);
    }

    const candidateSets: string[][] = [];

    for (let setIdx = 0; setIdx < bufferSize; setIdx++) {
        const groups = getUnorderedGroups();
        if (groups.length === 0) break;

        // Score each group by global uncertainty (higher = more informative)
        // Penalize groups whose items appeared often (frequency balance)
        const scored = groups.map((group) => {
            let uncertaintyScore = 0;
            let frequencyPenalty = 0;
            for (const item of group) {
                uncertaintyScore += globalUncertainty.get(item) ?? 0;
                frequencyPenalty += appearanceCounts.get(item) ?? 0;
            }
            return {
                group,
                score: uncertaintyScore - frequencyPenalty * 0.1,
            };
        });

        // Sort by score descending, pick from top candidates with randomness
        scored.sort((a, b) => b.score - a.score);

        // Pick randomly from top 3 groups (or fewer if less available)
        const topN = Math.min(3, scored.length);
        const pickIdx = Math.floor(Math.random() * topN);
        const selected = scored[pickIdx].group;

        // Trim to candidateSetSize (before shuffle, for simulated vote)
        const trimmed = selected.slice(0, candidateSetSize);

        // Simulate a vote using unshuffled order to advance the comparison
        // matrix for generating subsequent candidate sets in this buffer.
        // Uses first/last from the deterministic order (not random).
        if (trimmed.length >= 2) {
            applyComparison({
                best: trimmed[0],
                worst: trimmed[trimmed.length - 1],
                set: trimmed,
            });
        }

        // Now shuffle positions for the actual candidate set
        const candidates = [...trimmed];
        fisherYatesShuffle(candidates);

        candidateSets.push(candidates);

        // Update appearance counts
        for (const item of candidates) {
            const count = appearanceCounts.get(item) ?? 0;
            appearanceCounts.set(item, count + 1);
        }
    }

    return candidateSets;
}
