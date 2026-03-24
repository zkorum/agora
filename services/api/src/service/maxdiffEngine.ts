/**
 * MaxDiff comparison engine — Bron-Kerbosch maximal clique finding
 * and comparison matrix for adaptive candidate selection.
 *
 * Ported from services/agora/src/utils/maxdiff.ts for server-side routing.
 *
 * Inspired by SeregPie/MaxDiff (MIT License):
 * https://github.com/SeregPie/MaxDiff
 */

import type { MaxDiffComparison } from "@/shared/types/zod.js";
import { buildItemIndex } from "./bradleyTerry.js";

// --- Set utilities ---

function setDifference<T>(a: Set<T>, b: Set<T>): Set<T> {
    const result = new Set(a);
    for (const value of b) {
        result.delete(value);
    }
    return result;
}

function setIntersection<T>(a: Set<T>, b: Set<T>): Set<T> {
    const result = new Set<T>();
    for (const value of b) {
        if (a.has(value)) {
            result.add(value);
        }
    }
    return result;
}

function setUnion<T>(a: Set<T>, b: Set<T>): Set<T> {
    const result = new Set(a);
    for (const value of b) {
        result.add(value);
    }
    return result;
}

// --- Bron-Kerbosch algorithm ---

/**
 * Find all maximal cliques in an undirected graph.
 * Input: list of edges [a, b]. Output: list of cliques (each a list of nodes).
 */
export function bronKerbosch<T>(edges: Array<[T, T]>): T[][] {
    const nodes = new Set<T>();
    for (const [a, b] of edges) {
        nodes.add(a);
        nodes.add(b);
    }
    if (nodes.size < 2) return [];

    const neighbors = new Map<T, Set<T>>();
    for (const node of nodes) {
        neighbors.set(node, new Set<T>());
    }
    for (const [a, b] of edges) {
        neighbors.get(a)?.add(b);
        neighbors.get(b)?.add(a);
    }

    const cliques: T[][] = [];
    const findCliques = (
        clique: Set<T>,
        candidates: Set<T>,
        excludedCandidates: Set<T>,
    ): void => {
        if (candidates.size === 0 && excludedCandidates.size === 0) {
            cliques.push(Array.from(clique));
            return;
        }
        let pivotNeighbors = new Set<T>();
        for (const candidate of setUnion(candidates, excludedCandidates)) {
            const candidateSet = neighbors.get(candidate) ?? new Set<T>();
            const t = setIntersection(candidateSet, candidates);
            if (t.size > pivotNeighbors.size) {
                pivotNeighbors = t;
            }
        }
        const candidatesCopy = new Set(candidates);
        for (const candidate of setDifference(candidatesCopy, pivotNeighbors)) {
            const candidateNeighbors =
                neighbors.get(candidate) ?? new Set<T>();
            findCliques(
                new Set(clique).add(candidate),
                setIntersection(candidates, candidateNeighbors),
                setIntersection(excludedCandidates, candidateNeighbors),
            );
            candidates.delete(candidate);
            excludedCandidates.add(candidate);
        }
    };
    findCliques(new Set(), nodes, new Set());
    return cliques;
}

// --- Utility ---

function allPairs<T>(items: T[]): Array<[T, T]> {
    const result: Array<[T, T]> = [];
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
    applyComparison: (comparison: MaxDiffComparison) => void;
    getUnorderedPairs: () => Array<[string, string]>;
    getUnorderedGroups: () => string[][];
} {
    const n = items.length;
    const indexMap = buildItemIndex(items);
    const indexOf = (item: string): number => indexMap.get(item) ?? -1;

    // comparisons[i][j] = -1 means i < j (i comes before j)
    // +1 means i > j, 0 means same item, undefined means unknown
    const matrix: Array<Array<number | undefined>> = Array.from(
        { length: n },
        () => Array.from({ length: n }, () => undefined),
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
        matrix[j][i] = +1;
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

    const applyComparison = (comparison: MaxDiffComparison): void => {
        const itemSet = new Set(items);
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

    const getUnorderedPairs = (): Array<[string, string]> => {
        const pairs = allPairs(items).filter(
            ([a, b]) => getComparison(a, b) === undefined,
        );
        for (const pair of pairs) pair.sort(compareItemsByIndex);
        pairs.sort(compareGroupsByIndex);
        return pairs;
    };

    const getUnorderedGroups = (): string[][] => {
        const groups = bronKerbosch(getUnorderedPairs());
        for (const group of groups) group.sort(compareItemsByIndex);
        groups.sort(
            (a, b) => b.length - a.length || compareGroupsByIndex(a, b),
        );
        return groups;
    };

    return { applyComparison, getUnorderedPairs, getUnorderedGroups };
}
