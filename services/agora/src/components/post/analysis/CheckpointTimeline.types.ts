import type {
  AnalysisCheckpoint,
  RankingStatsCheckpointReason,
} from "src/shared/types/dto";

export type CheckpointTimelineReasonPayload =
  | AnalysisCheckpoint["reasons"][number]
  | RankingStatsCheckpointReason;

export interface CheckpointTimelineItem<
  TReason extends CheckpointTimelineReasonPayload =
    CheckpointTimelineReasonPayload,
> {
  checkpointId: number;
  activatedAt: Date | string;
  reasons: TReason[];
}

export type CheckpointTimelineReason =
  CheckpointTimelineReasonPayload["reason"];

export type CheckpointTimelineReasonFormatter<
  TReason extends CheckpointTimelineReasonPayload,
> = (reason: TReason) => string | undefined;

export type CheckpointTimelineReasonsFormatter<
  TReason extends CheckpointTimelineReasonPayload,
> = (reasons: TReason[]) => string[];
