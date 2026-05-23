import type { AnalysisCheckpoint } from "src/shared/types/dto";

export type CheckpointTimelineReason =
  AnalysisCheckpoint["reasons"][number]["reason"];

export type CheckpointTimelineReasonPayload = AnalysisCheckpoint["reasons"][number];

export type CheckpointTimelineReasonFormatter = (
  reason: CheckpointTimelineReasonPayload
) => string | undefined;
