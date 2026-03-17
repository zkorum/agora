import type { PolisKey } from "src/shared/types/zod";

export type CommentFilterOptions = "new" | "moderated" | "hidden" | "discover" | "my_votes";

/** Mirrors min_user_vote_threshold in python-bridge/main.py */
export const MIN_VOTES_FOR_CLUSTER = 7;

/**
 * Coefficient of Variation threshold for cluster imbalance detection.
 * Same threshold used in python-bridge/main.py for distribution balancing.
 * CV = std_dev / mean of group sizes. Higher CV = more imbalanced.
 * If changing this value, also update the corresponding threshold in
 * services/python-bridge/main.py (and vice versa).
 */
const CLUSTER_IMBALANCE_CV_THRESHOLD = 0.9;

/** Returns true when cluster sizes are imbalanced (CV > 0.9), matching python-bridge logic. */
export function isClustersImbalanced(clusterSizes: number[]): boolean {
  if (clusterSizes.length < 2) return false;
  const mean =
    clusterSizes.reduce((a, b) => a + b, 0) / clusterSizes.length;
  if (mean === 0) return false;
  const variance =
    clusterSizes.reduce((sum, s) => sum + (s - mean) ** 2, 0) /
    clusterSizes.length;
  const cv = Math.sqrt(variance) / mean;
  return cv > CLUSTER_IMBALANCE_CV_THRESHOLD;
}

export function formatClusterLabel(
  index: PolisKey,
  withGroup: boolean,
  aiLabel?: string
) {
  const clusterKeyName = String.fromCharCode(65 + parseInt(index));
  if (withGroup) {
    return aiLabel ?? `Group ${clusterKeyName}`;
  } else {
    return aiLabel ?? clusterKeyName;
  }
}
