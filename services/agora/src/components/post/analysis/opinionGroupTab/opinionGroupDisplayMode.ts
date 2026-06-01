export type OpinionGroupDisplayMode =
  | "current"
  | "all_other_groups"
  | "all_others";

export function getNextDisplayMode({
  displayMode,
  hasUngroupedParticipants,
}: {
  displayMode: OpinionGroupDisplayMode;
  hasUngroupedParticipants: boolean;
}): OpinionGroupDisplayMode {
  if (hasUngroupedParticipants) {
    if (displayMode === "current") return "all_other_groups";
    if (displayMode === "all_other_groups") return "all_others";
    return "current";
  }

  if (displayMode === "current") return "all_others";
  return "current";
}

export function getPreviousDisplayMode({
  displayMode,
  hasUngroupedParticipants,
}: {
  displayMode: OpinionGroupDisplayMode;
  hasUngroupedParticipants: boolean;
}): OpinionGroupDisplayMode {
  if (hasUngroupedParticipants) {
    if (displayMode === "current") return "all_others";
    if (displayMode === "all_other_groups") return "current";
    return "all_other_groups";
  }

  if (displayMode === "current") return "all_others";
  return "current";
}
