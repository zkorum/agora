import { PolisKey } from "src/shared/types/zod";

export type CommentFilterOptions = "new" | "moderated" | "hidden" | "discover";

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
