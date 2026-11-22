/** **** WARNING: GENERATED FROM SHARED DIRECTORY, DO NOT MODIFY THIS FILE DIRECTLY! **** **/
import type { RankingMode } from "../types/zod.js";

export function getComparisonCandidateSetSize(method: RankingMode): 2 | 4 {
    return method === "pairwise" ? 2 : 4;
}
