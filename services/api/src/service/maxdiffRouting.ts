/**
 * Server-side MaxDiff routing — generates candidate sets for voting.
 *
 * Uses cross-user comparison-count uncertainty to prioritize items that
 * need more comparisons, combined with per-user comparison state
 * (Bron-Kerbosch unordered groups), frequency balancing, and
 * Fisher-Yates position shuffle.
 */

import type { MaxDiffComparison } from "@/shared/types/zod.js";
import { buildComparisonMatrix } from "./maxdiffEngine.js";
import { fisherYatesShuffle } from "./bradleyTerry.js";

/**
 * Generate candidate sets for a user's next MaxDiff voting rounds.
 *
 * Pure function — no DB access. Takes pre-computed global uncertainty
 * and the user's comparison history.
 *
 * Does NOT simulate fake votes between sets. Uses frequency counting
 * to diversify items across the buffer without corrupting the
 * comparison matrix.
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

    // Rebuild user's comparison matrix from their real history
    const { applyComparison, getUnorderedGroups } = buildComparisonMatrix({
        items,
    });
    for (const comparison of userComparisons) {
        applyComparison(comparison);
    }

    const groups = getUnorderedGroups();
    if (groups.length === 0) return [];

    // Track appearance counts for frequency balancing across generated sets
    const appearanceCounts = new Map<string, number>();
    for (const item of items) {
        appearanceCounts.set(item, 0);
    }

    const candidateSets: string[][] = [];

    for (let setIdx = 0; setIdx < bufferSize; setIdx++) {
        if (groups.length === 0) break;

        // Score each group by global uncertainty (higher = more informative)
        // Penalize groups whose items appeared often in previous sets
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

        scored.sort((a, b) => b.score - a.score);

        // Pick randomly from top 3 groups (or fewer if less available)
        const topN = Math.min(3, scored.length);
        const pickIdx = Math.floor(Math.random() * topN);
        const selected = scored[pickIdx].group;

        // Trim to candidateSetSize and shuffle positions
        const candidates = selected.slice(0, candidateSetSize);
        fisherYatesShuffle(candidates);

        candidateSets.push(candidates);

        // Track exposure (no simulated votes — just frequency counting)
        for (const item of candidates) {
            const count = appearanceCounts.get(item) ?? 0;
            appearanceCounts.set(item, count + 1);
        }
    }

    return candidateSets;
}
