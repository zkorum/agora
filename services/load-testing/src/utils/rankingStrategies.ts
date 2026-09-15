import { z } from "zod";
import type { MaxDiffSaveRequest } from "../shared/types/dto.js";
import { stableFraction as fraction } from "./deterministicRandom.ts";

export const rankingStrategySchema = z.enum([
    "cohorts",
    "unanimous",
    "noisy",
    "majority",
    "polarized",
    "sparse",
]);
export type RankingStrategy = z.infer<typeof rankingStrategySchema>;

export function preferenceGroup({
    strategy,
    seed,
    userIndex,
    majorityShare,
}: {
    strategy: RankingStrategy;
    seed: string;
    userIndex: number;
    majorityShare: number;
}): number {
    if (strategy === "cohorts") return userIndex % 4;
    if (strategy === "polarized") return userIndex % 2;
    if (strategy === "majority")
        return fraction(`${seed}:user:${String(userIndex)}`) < majorityShare
            ? 0
            : 1;
    return 0;
}

export function comparisonBudget({
    strategy,
    seed,
    userIndex,
    maximum,
    dropoutRate,
}: {
    strategy: RankingStrategy;
    seed: string;
    userIndex: number;
    maximum: number;
    dropoutRate: number;
}): number {
    if (
        strategy !== "sparse" ||
        fraction(`${seed}:dropout:${String(userIndex)}`) >= dropoutRate
    )
        return maximum;
    return Math.max(
        1,
        Math.floor(fraction(`${seed}:budget:${String(userIndex)}`) * maximum),
    );
}

export function createRankingVoter({
    itemOrder,
    strategy,
    seed,
    userIndex,
    majorityShare,
    noiseRate,
}: {
    itemOrder: readonly string[];
    strategy: RankingStrategy;
    seed: string;
    userIndex: number;
    majorityShare: number;
    noiseRate: number;
}) {
    const positions = new Map(itemOrder.map((id, index) => [id, index]));
    if (positions.size !== itemOrder.length)
        throw new Error("Duplicate item IDs in ranking manifest");
    const group = preferenceGroup({ strategy, seed, userIndex, majorityShare });
    const cohortWeights = new Map<string, number>();
    function cohortWeight({
        item,
        index,
    }: {
        item: string;
        index: number;
    }): number {
        const cached = cohortWeights.get(item);
        if (cached !== undefined) return cached;
        const value = fraction(
            `${seed}:cohort:${String(group)}:item:${String(index)}`,
        );
        cohortWeights.set(item, value);
        return value;
    }
    return ({
        candidateSet,
        comparisonIndex,
    }: {
        candidateSet: readonly string[];
        comparisonIndex: number;
    }): MaxDiffSaveRequest["comparisons"][number] => {
        const noisy =
            strategy === "noisy" &&
            fraction(
                `${seed}:noise:${String(userIndex)}:${String(comparisonIndex)}`,
            ) < noiseRate;
        const weighted = candidateSet
            .map((item) => {
                const index = positions.get(item);
                if (index === undefined)
                    throw new Error(
                        "Candidate is absent from the frozen item manifest",
                    );
                const preference = noisy
                    ? fraction(
                          `${seed}:random:${String(userIndex)}:${String(comparisonIndex)}:${String(index)}`,
                      )
                    : strategy === "cohorts"
                      ? cohortWeight({ item, index })
                      : group === 1
                        ? index
                        : -index;
                return { item, preference, index };
            })
            .sort((a, b) => b.preference - a.preference || a.index - b.index);
        const best = weighted.at(0)?.item;
        const worst = weighted.at(-1)?.item;
        if (
            best === undefined ||
            worst === undefined ||
            best === worst ||
            new Set(candidateSet).size !== candidateSet.length
        ) {
            throw new Error(
                "Expected a candidate set of distinct active items",
            );
        }
        return { best, worst, set: [...candidateSet] };
    };
}

export function evaluateRanking({
    itemOrder,
    rankings,
    topK = 5,
}: {
    itemOrder: readonly string[];
    rankings: readonly { itemSlugId: string; score: number | null }[];
    topK?: number;
}) {
    z.number().int().positive().parse(topK);
    const knownItems = new Set(itemOrder);
    if (
        knownItems.size !== itemOrder.length ||
        new Set(rankings.map((row) => row.itemSlugId)).size !==
            rankings.length ||
        rankings.some(
            (row) =>
                !knownItems.has(row.itemSlugId) ||
                (row.score !== null && !Number.isFinite(row.score)),
        )
    ) {
        throw new Error(
            "Ranking evaluation requires distinct known items and finite scores",
        );
    }
    const scores = new Map(
        rankings.flatMap((item) =>
            item.score !== null
                ? [[item.itemSlugId, item.score] satisfies [string, number]]
                : [],
        ),
    );
    let pairs = 0;
    let concordant = 0;
    let discordant = 0;
    let ties = 0;
    const scored = itemOrder.flatMap((id) => {
        const score = scores.get(id);
        return score === undefined ? [] : [{ id, score }];
    });
    for (const [i, item] of scored.entries()) {
        for (const other of scored.slice(i + 1)) {
            pairs++;
            if (Math.abs(item.score - other.score) < 1e-9) ties++;
            else if (item.score > other.score) concordant++;
            else discordant++;
        }
    }
    const observed = [...scored].sort((a, b) => b.score - a.score);
    const k = Math.min(topK, itemOrder.length);
    const boundary = observed.at(k - 1);
    const next = observed.at(k);
    const topKTieAtBoundary =
        boundary !== undefined &&
        next !== undefined &&
        Math.abs(boundary.score - next.score) < 1e-9;
    const expectedTop = new Set(itemOrder.slice(0, k));
    return {
        coverage:
            itemOrder.length === 0 ? 0 : observed.length / itemOrder.length,
        comparablePairs: pairs,
        kendallTauA: pairs === 0 ? null : (concordant - discordant) / pairs,
        pairwiseAgreement:
            pairs === 0 ? null : (concordant + ties * 0.5) / pairs,
        tieFraction: pairs === 0 ? null : ties / pairs,
        topKTieAtBoundary,
        topKRecovery:
            k === 0 || topKTieAtBoundary
                ? null
                : observed.slice(0, k).filter((row) => expectedTop.has(row.id))
                      .length / k,
    };
}
