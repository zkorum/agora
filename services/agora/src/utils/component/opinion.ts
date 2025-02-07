export type CommentFilterOptions = "new" | "moderated" | "hidden" | "discover";

export function encodeClusterIndexToName(index: number) {
  return String.fromCharCode(65 + index);
}
