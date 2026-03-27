/**
 * Server-side MaxDiff routing — generates candidate sets for voting.
 *
 * Uses greedy set cover to guarantee all item pairs co-appear in at
 * least one set, then fills remaining buffer slots with diverse sets.
 * Within each set, items are selected to maximize uncovered pairs
 * (covering design), weighted by global uncertainty (items needing
 * more data across all voters) and pairwise information gain (items
 * unresolved for this specific user).
 *
 * Pure function — no DB access.
 */

import type { MaxDiffComparison } from "@/shared/types/zod.js";
import { buildComparisonMatrix } from "./maxdiffEngine.js";
import { fisherYatesShuffle } from "@/utils/maxdiffUtils.js";

/** Canonical key for an unordered pair (alphabetical order). */
export function pairKey(a: string, b: string): string {
    return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/**
 * Count how many uncovered pairs a candidate item would create
 * with the already-selected items in the current set.
 */
function countUncoveredWith({
    candidate,
    selected,
    coveredPairs,
}: {
    candidate: string;
    selected: string[];
    coveredPairs: Set<string>;
}): number {
    let count = 0;
    for (const sel of selected) {
        if (!coveredPairs.has(pairKey(candidate, sel))) {
            count++;
        }
    }
    return count;
}

/**
 * Count how many uncovered pairs a candidate item has with ALL
 * items in the pool (used for first-item selection).
 */
function countUncoveredInPool({
    candidate,
    pool,
    coveredPairs,
}: {
    candidate: string;
    pool: string[];
    coveredPairs: Set<string>;
}): number {
    let count = 0;
    for (const other of pool) {
        if (other !== candidate && !coveredPairs.has(pairKey(candidate, other))) {
            count++;
        }
    }
    return count;
}

/**
 * Count how many unresolved (unordered for this user) pairs a candidate
 * would create with the already-selected items.
 */
function countUnresolvedWith({
    candidate,
    selected,
    isUnordered,
}: {
    candidate: string;
    selected: string[];
    isUnordered: (a: string, b: string) => boolean;
}): number {
    let count = 0;
    for (const sel of selected) {
        if (isUnordered(candidate, sel)) {
            count++;
        }
    }
    return count;
}

/**
 * Build a bidirectional adjacency map from unordered pairs for O(1) lookup.
 */
function buildUnorderedLookup(
    unorderedPairs: [string, string][],
): (a: string, b: string) => boolean {
    const adjacency = new Map<string, Set<string>>();
    for (const [a, b] of unorderedPairs) {
        if (!adjacency.has(a)) adjacency.set(a, new Set());
        if (!adjacency.has(b)) adjacency.set(b, new Set());
        adjacency.get(a)?.add(b);
        adjacency.get(b)?.add(a);
    }
    return (a: string, b: string): boolean =>
        adjacency.get(a)?.has(b) ?? false;
}

/**
 * Greedily build one candidate set that maximizes uncovered pair coverage.
 *
 * Scoring per candidate = uncoveredPairs (primary) + uncertainty (secondary)
 *                        + unresolvedPairs (tertiary)
 *
 * The uncovered pair count is the dominant signal (multiplied by a weight
 * larger than the max possible uncertainty). This ensures pair coverage
 * drives item selection, with uncertainty breaking ties.
 */
function buildOneSet({
    pool,
    size,
    coveredPairs,
    globalUncertainty,
    isUnordered,
}: {
    pool: string[];
    size: number;
    coveredPairs: Set<string>;
    globalUncertainty: Map<string, number>;
    isUnordered: (a: string, b: string) => boolean;
}): string[] {
    const selected: string[] = [];
    const selectedSet = new Set<string>();
    const effectiveSize = Math.min(size, pool.length);

    // Coverage weight must exceed the max possible uncertainty so that
    // one additional uncovered pair always outweighs any uncertainty difference.
    const maxUncertainty = Math.max(
        ...pool.map((id) => globalUncertainty.get(id) ?? 0),
        0,
    );
    const coverageWeight = maxUncertainty + 1;

    for (let i = 0; i < effectiveSize; i++) {
        let bestItem: string | undefined;
        let bestScore = -Infinity;

        for (const item of pool) {
            if (selectedSet.has(item)) continue;

            // Primary: uncovered pairs (dominates)
            const uncovered = selected.length > 0
                ? countUncoveredWith({ candidate: item, selected, coveredPairs })
                : countUncoveredInPool({ candidate: item, pool, coveredPairs });

            // Secondary: global uncertainty (breaks ties among equal coverage)
            const uncertainty = globalUncertainty.get(item) ?? 0;

            // Tertiary: unresolved pairs for this user (further tie-breaking)
            const unresolved = selected.length > 0
                ? countUnresolvedWith({ candidate: item, selected, isUnordered })
                : 0;

            const score =
                uncovered * coverageWeight +
                uncertainty +
                unresolved * 0.1;

            if (score > bestScore) {
                bestScore = score;
                bestItem = item;
            }
        }

        if (bestItem === undefined) break;
        selected.push(bestItem);
        selectedSet.add(bestItem);
    }

    return selected;
}

/**
 * Record all C(k,2) pairs from a set as covered.
 */
function markPairsCovered({
    set,
    coveredPairs,
}: {
    set: string[];
    coveredPairs: Set<string>;
}): void {
    for (let i = 0; i < set.length; i++) {
        for (let j = i + 1; j < set.length; j++) {
            coveredPairs.add(pairKey(set[i], set[j]));
        }
    }
}

/**
 * Generate candidate sets for a user's next MaxDiff voting rounds.
 *
 * Algorithm:
 * 1. Build user's comparison matrix → find unordered items
 * 2. Greedy set cover: each set maximizes uncovered pair coverage,
 *    weighted by global uncertainty and user-specific pairwise gain
 * 3. Sets are shuffled (Fisher-Yates) to prevent position bias
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

    const pool = [...unorderedItems];
    const isUnordered = buildUnorderedLookup(unorderedPairs);
    const coveredPairs = new Set<string>();
    const candidateSets: string[][] = [];
    const usedSignatures = new Set<string>();
    const totalPairs = (pool.length * (pool.length - 1)) / 2;

    for (let i = 0; i < bufferSize; i++) {
        // Reset coverage when all pairs are covered so the greedy
        // algorithm can differentiate items again in the next cycle.
        if (coveredPairs.size >= totalPairs) {
            coveredPairs.clear();
        }

        // Build a set. If it duplicates an earlier one, rotate the pool
        // and retry (up to pool.length attempts). This guarantees
        // distinct sets as long as C(n,k) > bufferSize.
        let set: string[] = [];
        for (let offset = 0; offset <= pool.length; offset++) {
            const rotatedPool = offset === 0
                ? pool
                : [...pool.slice(offset), ...pool.slice(0, offset)];

            set = buildOneSet({
                pool: rotatedPool,
                size: candidateSetSize,
                coveredPairs,
                globalUncertainty,
                isUnordered,
            });

            const sig = [...set].sort().join(",");
            if (!usedSignatures.has(sig) || offset === pool.length) {
                usedSignatures.add(sig);
                break;
            }
        }

        if (set.length < 2) break;

        fisherYatesShuffle(set);
        candidateSets.push(set);
        markPairsCovered({ set, coveredPairs });
    }

    return candidateSets;
}
