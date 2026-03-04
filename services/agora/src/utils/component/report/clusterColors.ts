const CLUSTER_COLORS = [
  "#6b4eff",
  "#4f92f6",
  "#f97316",
  "#22c55e",
  "#ef4444",
  "#a855f7",
];

export function getClusterColor(index: number): string {
  return CLUSTER_COLORS[index % CLUSTER_COLORS.length];
}
