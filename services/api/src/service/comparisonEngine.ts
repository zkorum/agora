/**
 * Comparison matrix with transitive closure for server-side candidate routing.
 *
 * Shares comparison semantics with shared/utils/comparisonEngine.ts.
 *
 * Inspired by SeregPie/MaxDiff (MIT License):
 * https://github.com/SeregPie/MaxDiff
 */

import type { ComparisonAnswer } from "@/shared/types/zod.js";
import { buildItemIndex } from "@/utils/comparisonUtils.js";

// --- Utility ---

function allPairs<T>(items: T[]): [T, T][] {
    const result: [T, T][] = [];
    for (let i = 0; i < items.length - 1; i++) {
        for (let j = i + 1; j < items.length; j++) {
            result.push([items[i], items[j]]);
        }
    }
    return result;
}

// --- Comparison matrix ---

/**
 * Build a comparison matrix from a user's comparison history.
 * Returns a function to query unordered pairs (items with unknown relative order).
 */
export function buildComparisonMatrix({ items }: { items: string[] }): {
    applyComparison: (comparison: ComparisonAnswer) => void;
    getUnorderedPairs: () => [string, string][];
    getOrderedPairs: () => [string, string][];
} {
    const n = items.length;
    const indexMap = buildItemIndex(items);
    const itemSet = new Set(items);
    const indexOf = (item: string): number => indexMap.get(item) ?? -1;

    // comparisons[i][j] = -1 means i < j (i comes before j)
    // +1 means i > j, 0 means same item, undefined means unknown
    const matrix: (number | undefined)[][] = Array.from({ length: n }, () =>
        Array.from({ length: n }, () => undefined),
    );
    for (let i = 0; i < n; i++) {
        matrix[i][i] = 0;
    }

    const getComparison = (a: string, b: string): number | undefined =>
        matrix[indexOf(a)][indexOf(b)];

    const setOrder = (before: string, after: string): void => {
        const i = indexOf(before);
        const j = indexOf(after);
        if (i < 0 || j < 0) return;
        matrix[i][j] = -1;
        matrix[j][i] = 1;
    };

    const getItemsBefore = (item: string): string[] =>
        items.filter((other) => {
            const c = getComparison(other, item);
            return c !== undefined && c < 0;
        });

    const getItemsAfter = (item: string): string[] =>
        items.filter((other) => {
            const c = getComparison(other, item);
            return c !== undefined && c > 0;
        });

    const order = (itemBefore: string, itemAfter: string): void => {
        if (getComparison(itemBefore, itemAfter) !== undefined) return;
        setOrder(itemBefore, itemAfter);
        // Transitive closure
        const before = getItemsBefore(itemBefore);
        const after = getItemsAfter(itemAfter);
        for (const b of before) setOrder(b, itemAfter);
        for (const a of after) setOrder(itemBefore, a);
        for (const b of before) {
            for (const a of after) {
                setOrder(b, a);
            }
        }
    };

    const applyComparison = (comparison: ComparisonAnswer): void => {
        const set = comparison.set.filter((id) => itemSet.has(id));
        if (!itemSet.has(comparison.best) || !itemSet.has(comparison.worst))
            return;

        // best beats everyone else
        for (const other of set) {
            if (other !== comparison.best) order(comparison.best, other);
        }
        // everyone else beats worst
        for (const other of set) {
            if (other !== comparison.worst && other !== comparison.best) {
                order(other, comparison.worst);
            }
        }
    };

    const compareItemsByIndex = (a: string, b: string): number =>
        indexOf(a) - indexOf(b);

    const compareGroupsByIndex = (a: string[], b: string[]): number => {
        for (let i = 0; i < Math.min(a.length, b.length); i++) {
            const c = compareItemsByIndex(a[i], b[i]);
            if (c) return c;
        }
        return a.length - b.length;
    };

    const getUnorderedPairs = (): [string, string][] => {
        const pairs = allPairs(items).filter(
            ([a, b]) => getComparison(a, b) === undefined,
        );
        for (const pair of pairs) pair.sort(compareItemsByIndex);
        pairs.sort(compareGroupsByIndex);
        return pairs;
    };

    /** Return all pairs where the ordering is known (before, after). */
    const getOrderedPairs = (): [string, string][] => {
        const pairs: [string, string][] = [];
        for (let i = 0; i < items.length; i++) {
            for (let j = i + 1; j < items.length; j++) {
                const c = getComparison(items[i], items[j]);
                if (c === undefined || c === 0) continue;
                if (c < 0) {
                    pairs.push([items[i], items[j]]); // i before j
                } else {
                    pairs.push([items[j], items[i]]); // j before i
                }
            }
        }
        return pairs;
    };

    return {
        applyComparison,
        getUnorderedPairs,
        getOrderedPairs,
    };
}
