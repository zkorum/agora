export type LiveAnalysisClosedTransitionAction =
  | "none"
  | "refresh-latest-analysis"
  | "refresh-checkpoints"
  | "clear-live-pause";

export function getLiveAnalysisClosedTransitionAction({
  isClosed,
  wasClosed,
  isLiveAnalysis,
}: {
  isClosed: boolean;
  wasClosed: boolean | undefined;
  isLiveAnalysis: boolean;
}): LiveAnalysisClosedTransitionAction {
  if (isClosed === wasClosed) {
    return "none";
  }

  if (isClosed) {
    return isLiveAnalysis ? "refresh-latest-analysis" : "refresh-checkpoints";
  }

  return isLiveAnalysis ? "clear-live-pause" : "none";
}
