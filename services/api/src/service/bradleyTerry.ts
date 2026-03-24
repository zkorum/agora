/**
 * Bradley-Terry MLE via Minorization-Maximization (MM) algorithm.
 *
 * Pure functions for estimating item strengths from pairwise comparison data.
 * Includes Best-Worst Scaling (BWS) decomposition into pairwise wins.
 *
 * Inspired by:
 * - choix library (MIT): https://github.com/lucasmaystre/choix
 * - Solidago/Tournesol (LGPL): https://github.com/tournesol-app/tournesol/tree/main/solidago
 * - Hunter (2004), "MM algorithms for generalized Bradley-Terry models,"
 *   Annals of Statistics 32(1):384-406
 */

import type { MaxDiffComparison } from "@/shared/types/zod.js";

// --- Types ---

export interface PairwiseWin {
    winner: number;
    loser: number;
}

export interface BradleyTerryResult {
    /** Log-scale strength parameters (centered, mean = 0) */
    params: number[];
    /** Whether the algorithm converged within maxIter */
    converged: boolean;
}

export interface ScoredItem {
    item: string;
    score: number;
    uncertainty: number;
}

export interface BradleyTerryFromBWSResult {
    items: ScoredItem[];
    converged: boolean;
}

// --- Numerical utilities (ported from choix/utils.py) ---

/**
 * Transform log-scale parameters into exp-scale weights.
 * Numerically stable: subtracts mean before exp, then normalizes so sum = n.
 */
export function expTransform(params: number[]): number[] {
    const n = params.length;
    if (n === 0) return [];
    let mean = 0;
    for (const p of params) mean += p;
    mean /= n;
    const weights = params.map((p) => Math.exp(p - mean));
    let sum = 0;
    for (const w of weights) sum += w;
    const scale = n / sum;
    return weights.map((w) => w * scale);
}

/**
 * Transform exp-scale weights into centered log-scale parameters.
 */
export function logTransform(weights: number[]): number[] {
    const n = weights.length;
    if (n === 0) return [];
    const params = weights.map((w) => Math.log(w));
    let mean = 0;
    for (const p of params) mean += p;
    mean /= n;
    return params.map((p) => p - mean);
}

// --- Core MM algorithm (ported from choix/mm.py:_mm_pairwise + _mm) ---

/**
 * Single MM iteration for pairwise comparison data.
 * Returns (wins, denoms) arrays for the MM update.
 */
function mmPairwiseStep({
    nItems,
    data,
    params,
}: {
    nItems: number;
    data: PairwiseWin[];
    params: number[];
}): { wins: number[]; denoms: number[] } {
    const weights = expTransform(params);
    const wins = new Array<number>(nItems).fill(0);
    const denoms = new Array<number>(nItems).fill(0);
    for (const { winner, loser } of data) {
        wins[winner] += 1.0;
        const val = 1.0 / (weights[winner] + weights[loser]);
        denoms[winner] += val;
        denoms[loser] += val;
    }
    return { wins, denoms };
}

/**
 * Bradley-Terry MLE via MM algorithm for pairwise comparison data.
 *
 * Estimates log-scale strength parameters θ_i such that:
 *   P(i beats j) = exp(θ_i) / (exp(θ_i) + exp(θ_j))
 *
 * @param nItems - Number of distinct items (indexed 0..nItems-1)
 * @param data - Array of pairwise wins: [{winner, loser}, ...]
 * @param alpha - Regularization (Dirichlet prior). Use > 0 for MAP estimate.
 * @param maxIter - Maximum iterations before giving up
 * @param tolerance - L1-norm convergence threshold (scaled by nItems)
 */
export function mmPairwise({
    nItems,
    data,
    alpha = 0.01,
    maxIter = 10000,
    tolerance = 1e-8,
}: {
    nItems: number;
    data: PairwiseWin[];
    alpha?: number;
    maxIter?: number;
    tolerance?: number;
}): BradleyTerryResult {
    // Defaults match choix: maxIter=10000, tol=1e-8
    if (nItems === 0) return { params: [], converged: true };
    if (nItems === 1) return { params: [0], converged: true };

    let params = new Array<number>(nItems).fill(0);
    let prevParams = new Array<number>(nItems).fill(0);

    for (let iter = 0; iter < maxIter; iter++) {
        const { wins, denoms } = mmPairwiseStep({ nItems, data, params });

        // MM update with regularization: params = log((wins + alpha) / (denoms + alpha))
        const newWeights = wins.map((w, i) => (w + alpha) / (denoms[i] + alpha));
        params = logTransform(newWeights);

        // Convergence check: L1-norm of difference, scaled by nItems
        let l1Norm = 0;
        for (let i = 0; i < nItems; i++) {
            l1Norm += Math.abs(params[i] - prevParams[i]);
        }
        if (l1Norm <= tolerance * nItems) {
            return { params, converged: true };
        }
        prevParams = [...params];
    }

    return { params, converged: false };
}

// --- BWS decomposition ---

/**
 * Decompose a Best-Worst Scaling vote into pairwise wins.
 *
 * From a vote {best, worst, set}:
 * - best beats every other item in set
 * - every other item beats worst
 *
 * Returns pairwise wins using numeric indices (relative to the provided items array).
 */
export function bwsToPairwise({
    comparison,
    itemIndex,
}: {
    comparison: MaxDiffComparison;
    itemIndex: Map<string, number>;
}): PairwiseWin[] {
    const bestIdx = itemIndex.get(comparison.best);
    const worstIdx = itemIndex.get(comparison.worst);
    if (bestIdx === undefined || worstIdx === undefined) return [];

    const wins: PairwiseWin[] = [];
    for (const item of comparison.set) {
        const idx = itemIndex.get(item);
        if (idx === undefined) continue;
        // best beats everyone else
        if (idx !== bestIdx) {
            wins.push({ winner: bestIdx, loser: idx });
        }
        // everyone else beats worst
        if (idx !== worstIdx && idx !== bestIdx) {
            wins.push({ winner: idx, loser: worstIdx });
        }
    }
    return wins;
}

/**
 * Build an item-to-index mapping from a list of item IDs.
 */
export function buildItemIndex(items: string[]): Map<string, number> {
    const index = new Map<string, number>();
    for (let i = 0; i < items.length; i++) {
        index.set(items[i], i);
    }
    return index;
}

// --- High-level API ---

/**
 * Run Bradley-Terry MLE on MaxDiff (BWS) comparison data.
 *
 * Decomposes BWS votes into pairwise wins, runs MM algorithm,
 * and returns scored items sorted best-first.
 */
export function bradleyTerryFromBWS({
    comparisons,
    items,
    alpha = 0.01,
    maxIter = 10000,
    tolerance = 1e-8,
}: {
    comparisons: MaxDiffComparison[];
    items: string[];
    alpha?: number;
    maxIter?: number;
    tolerance?: number;
}): BradleyTerryFromBWSResult {
    // Defaults match mmPairwise: maxIter=10000, tol=1e-8
    const n = items.length;
    if (n === 0) return { items: [], converged: true };
    if (n === 1) {
        return {
            items: [{ item: items[0], score: 1, uncertainty: 1 }],
            converged: true,
        };
    }

    const itemIndex = buildItemIndex(items);

    // Decompose all BWS votes into pairwise wins
    const pairwiseData: PairwiseWin[] = [];
    for (const comparison of comparisons) {
        const wins = bwsToPairwise({ comparison, itemIndex });
        pairwiseData.push(...wins);
    }

    // Count comparisons per item (for uncertainty estimation)
    const comparisonCounts = new Array<number>(n).fill(0);
    for (const { winner, loser } of pairwiseData) {
        comparisonCounts[winner] += 1;
        comparisonCounts[loser] += 1;
    }

    // Run MM algorithm
    const { params, converged } = mmPairwise({
        nItems: n,
        data: pairwiseData,
        alpha,
        maxIter,
        tolerance,
    });
    // Normalize scores to [0, 1] range
    let minParam = Infinity;
    let maxParam = -Infinity;
    for (const p of params) {
        if (p < minParam) minParam = p;
        if (p > maxParam) maxParam = p;
    }
    const range = maxParam - minParam;

    const scoredItems = items
        .map((item, i) => ({
            item,
            score: range > 0 ? (params[i] - minParam) / range : 1,
            uncertainty: 1 / Math.sqrt(comparisonCounts[i] + 1),
        }))
        .sort((a, b) => b.score - a.score);

    return { items: scoredItems, converged };
}

// --- Utility ---

/**
 * Fisher-Yates (Knuth) in-place shuffle.
 * Returns the same array reference, mutated.
 */
export function fisherYatesShuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array;
}
