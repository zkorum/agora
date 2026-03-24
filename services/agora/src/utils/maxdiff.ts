/**
 * Adaptive MaxDiff (Best-Worst Scaling) Engine
 *
 * Inspired by SeregPie/MaxDiff (MIT License):
 * https://github.com/SeregPie/MaxDiff
 *
 * Uses a comparison matrix with transitive closure and
 * Bron-Kerbosch maximal clique finding to adaptively
 * select the most informative set of candidates for
 * each round of best/worst voting.
 */

import type { MaxDiffComparison } from "src/shared/types/zod";

// --- Bron-Kerbosch algorithm (inline, from SeregPie/BronKerbosch) ---

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

function bronKerbosch<T>(edges: Array<[T, T]>): T[][] {
    const nodes = new Set<T>();
    for (const [a, b] of edges) {
        nodes.add(a);
        nodes.add(b);
    }
    if (nodes.size < 2) {
        return [];
    }
    const neighbors = new Map<T, Set<T>>();
    for (const node of nodes) {
        neighbors.set(node, new Set<T>());
    }
    for (const [a, b] of edges) {
        const neighborsA = neighbors.get(a);
        const neighborsB = neighbors.get(b);
        if (neighborsA) neighborsA.add(b);
        if (neighborsB) neighborsB.add(a);
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
            const candidateNeighbors = neighbors.get(candidate) ?? new Set<T>();
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

// --- Utility functions ---

function allPairs<T>(items: T[]): Array<[T, T]> {
    const result: Array<[T, T]> = [];
    for (let i = 0; i < items.length - 1; i++) {
        for (let j = i + 1; j < items.length; j++) {
            result.push([items[i], items[j]]);
        }
    }
    return result;
}

function minBy<T>(items: T[], fn: (item: T) => number): T {
    let bestIndex = 0;
    let bestValue = fn(items[0]);
    for (let i = 1; i < items.length; i++) {
        const value = fn(items[i]);
        if (value < bestValue) {
            bestValue = value;
            bestIndex = i;
        }
    }
    return items[bestIndex];
}

// --- MaxDiff Engine ---

export type { MaxDiffComparison };

export interface MaxDiffState {
    items: string[];
    comparisons: MaxDiffComparison[];
}

export interface MaxDiffInstance {
    readonly items: string[];
    readonly progress: number;
    readonly complete: boolean;
    readonly result: string[] | undefined;
    getCandidates: (limit?: number) => string[];
    orderBefore: (item: string, otherItems: string[]) => void;
    orderAfter: (item: string, otherItems: string[]) => void;
    getUnorderedPairs: () => Array<[string, string]>;
    getOrderedPairs: () => Array<[string, string]>;
    exportState: () => MaxDiffState;
}

export function createMaxDiff(items: Iterable<string>): MaxDiffInstance {
    const uniqueItems = [...new Set(items)];
    let result: string[] | undefined;

    if (uniqueItems.length < 2) {
        result = [...uniqueItems];
    }

    // Comparison matrix: comparisons[i][j] = -1 means i < j (i comes before j)
    // +1 means i > j, 0 means same item, undefined means unknown
    const n = uniqueItems.length;
    const comparisons: Array<Array<number | undefined>> = Array.from(
        { length: n },
        () => Array.from({ length: n }, () => undefined),
    );
    for (let i = 0; i < n; i++) {
        comparisons[i][i] = 0;
    }

    const indexOf = (item: string): number => uniqueItems.indexOf(item);

    const getComparison = (item: string, otherItem: string): number | undefined => {
        return comparisons[indexOf(item)][indexOf(otherItem)];
    };

    const setComparison = (item: string, otherItem: string): void => {
        const i = indexOf(item);
        const j = indexOf(otherItem);
        comparisons[i][j] = -1;
        comparisons[j][i] = +1;
    };

    const compareItemsByOrder = (item: string, otherItem: string): number =>
        getComparison(item, otherItem) ?? 0;

    const compareItemsByIndex = (item: string, otherItem: string): number => {
        return indexOf(item) - indexOf(otherItem);
    };

    const compareGroupsByIndex = (a: string[], b: string[]): number => {
        for (let i = 0; i < Math.min(a.length, b.length); i++) {
            const c = compareItemsByIndex(a[i], b[i]);
            if (c) return c;
        }
        return a.length - b.length;
    };

    const compareGroupsByLengthAndIndex = (a: string[], b: string[]): number => {
        const c = b.length - a.length;
        if (c) return c;
        return compareGroupsByIndex(a, b);
    };

    const getUnorderedPairs = (): Array<[string, string]> => {
        const pairs = allPairs(uniqueItems).filter(
            ([a, b]) => getComparison(a, b) === undefined,
        );
        for (const pair of pairs) {
            pair.sort(compareItemsByIndex);
        }
        pairs.sort(compareGroupsByIndex);
        return pairs;
    };

    const getOrderedPairs = (): Array<[string, string]> => {
        const pairs = allPairs(uniqueItems).filter(
            ([a, b]) => getComparison(a, b) !== undefined,
        );
        for (const pair of pairs) {
            pair.sort(compareItemsByOrder);
        }
        pairs.sort(compareGroupsByIndex);
        return pairs;
    };

    const getUnorderedGroups = (): string[][] => {
        const groups = bronKerbosch(getUnorderedPairs());
        for (const group of groups) {
            group.sort(compareItemsByIndex);
        }
        groups.sort(compareGroupsByLengthAndIndex);
        return groups;
    };

    const getItemsBefore = (item: string): string[] => {
        return uniqueItems
            .filter((other) => {
                const c = getComparison(other, item);
                return c !== undefined && c < 0;
            })
            .sort(compareItemsByIndex);
    };

    const getItemsAfter = (item: string): string[] => {
        return uniqueItems
            .filter((other) => {
                const c = getComparison(other, item);
                return c !== undefined && c > 0;
            })
            .sort(compareItemsByIndex);
    };

    const order = (...orderItems: string[]): void => {
        const validItems = orderItems.filter((item) => uniqueItems.includes(item));
        for (const [itemBefore, itemAfter] of allPairs(validItems)) {
            if (getComparison(itemBefore, itemAfter) === undefined) {
                setComparison(itemBefore, itemAfter);
                // Transitive closure
                const before = getItemsBefore(itemBefore);
                const after = getItemsAfter(itemAfter);
                for (const b of before) {
                    setComparison(b, itemAfter);
                }
                for (const a of after) {
                    setComparison(itemBefore, a);
                }
                for (const b of before) {
                    for (const a of after) {
                        setComparison(b, a);
                    }
                }
            }
        }
        if (getUnorderedPairs().length === 0) {
            result = [...uniqueItems].sort(compareItemsByOrder);
        }
    };

    const orderBefore = (item: string, otherItems: string[]): void => {
        for (const otherItem of new Set(otherItems)) {
            order(item, otherItem);
        }
    };

    const orderAfter = (item: string, otherItems: string[]): void => {
        for (const otherItem of new Set(otherItems)) {
            order(otherItem, item);
        }
    };

    const getCandidates = (limit = 4): string[] => {
        const groups = getUnorderedGroups();
        if (groups.length === 0) return [];
        const best = minBy(groups, (g) => Math.abs(g.length - limit));
        return best.slice(0, limit);
    };

    const trackedComparisons: MaxDiffComparison[] = [];

    const exportState = (): MaxDiffState => ({
        items: [...uniqueItems],
        comparisons: [...trackedComparisons],
    });

    return {
        get items() {
            return [...uniqueItems];
        },
        get progress() {
            const ordered = getOrderedPairs().length;
            const total = ordered + getUnorderedPairs().length;
            return total > 0 ? ordered / total : 1;
        },
        get complete() {
            return result !== undefined;
        },
        get result() {
            return result ? [...result] : undefined;
        },
        getCandidates,
        orderBefore(item: string, otherItems: string[]) {
            trackedComparisons.push({
                best: item,
                worst: "",
                set: [...otherItems, item],
            });
            orderBefore(item, otherItems);
        },
        orderAfter(item: string, otherItems: string[]) {
            // Update the last comparison's worst field
            if (trackedComparisons.length > 0) {
                trackedComparisons[trackedComparisons.length - 1].worst = item;
            }
            orderAfter(item, otherItems);
        },
        getUnorderedPairs,
        getOrderedPairs,
        exportState,
    };
}

/**
 * Restore a MaxDiff instance from saved state.
 * Replays all comparisons to rebuild the comparison matrix.
 */
export function restoreMaxDiff(state: MaxDiffState): MaxDiffInstance {
    const instance = createMaxDiff(state.items);
    for (const comparison of state.comparisons) {
        const otherItems = comparison.set.filter(
            (id) => id !== comparison.best && id !== comparison.worst,
        );
        instance.orderBefore(comparison.best, [...otherItems, comparison.worst]);
        if (comparison.worst) {
            instance.orderAfter(comparison.worst, [...otherItems, comparison.best]);
        }
    }
    return instance;
}

/**
 * Record a single MaxDiff vote (best + worst from a candidate set).
 * This is the main function called by the UI after each round.
 */
export function recordMaxDiffVote({
    instance,
    candidates,
    best,
    worst,
}: {
    instance: MaxDiffInstance;
    candidates: string[];
    best: string;
    worst: string;
}): void {
    const otherItems = candidates.filter((id) => id !== best);
    instance.orderBefore(best, otherItems);
    const otherItemsForWorst = candidates.filter((id) => id !== worst);
    instance.orderAfter(worst, otherItemsForWorst);
}