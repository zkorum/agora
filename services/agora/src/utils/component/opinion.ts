import type { PolisClusters, PolisKey } from "src/shared/types/zod";

export type CommentFilterOptions = "new" | "moderated" | "hidden" | "discover" | "my_votes";

/** Mirrors the default minimum vote threshold used by opinion-group analysis. */
export const MIN_VOTES_FOR_CLUSTER = 7;

/**
 * Coefficient of Variation threshold for cluster imbalance detection.
 * Same threshold historically used for distribution balancing.
 * CV = std_dev / mean of group sizes. Higher CV = more imbalanced.
 */
const CLUSTER_IMBALANCE_CV_THRESHOLD = 0.9;

const POLIS_KEYS = ["0", "1", "2", "3", "4", "5"] satisfies PolisKey[];

/** Returns true when cluster sizes are imbalanced (CV > 0.9). */
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

type PolisCluster = NonNullable<PolisClusters[PolisKey]>;

export function getDisplayPolisClusters({
  clusters,
  aiLabelingEnabled,
}: {
  clusters: Partial<PolisClusters>;
  aiLabelingEnabled: boolean;
}): Partial<PolisClusters> {
  if (aiLabelingEnabled) {
    return clusters;
  }

  const displayClusters: Partial<PolisClusters> = {};
  for (const key of POLIS_KEYS) {
    const cluster = clusters[key];
    if (cluster !== undefined) {
      displayClusters[key] = {
        ...cluster,
        aiLabel: undefined,
        aiSummary: undefined,
      };
    }
  }

  return displayClusters;
}

export function shouldHideGroupAnalysis(
  clusters: Partial<PolisClusters>
): boolean {
  const clusterList = Object.values(clusters).filter(
    (cluster): cluster is PolisCluster => cluster !== undefined
  );

  return (
    clusterList.length === 2 &&
    clusterList.some((cluster) => cluster.numUsers <= 1)
  );
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
