import { PolisKey } from "src/shared/types/zod";

export type CommentFilterOptions = "new" | "moderated" | "hidden" | "discover";

export function formatClusterLabel(index: PolisKey, aiLabel?: string) {
  const clusterKeyName = String.fromCharCode(65 + parseInt(index));
  return aiLabel ?? clusterKeyName;
}
