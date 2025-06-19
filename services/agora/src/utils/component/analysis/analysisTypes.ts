import { PolisKey } from "src/shared/types/zod";

export type SelectedClusterKeyType = PolisKey | "all";

export interface ConsensusItemData {
  id: number;
  description: string;
  numAgree: number;
  numDisagree: number;
}

export interface OpinionAnalysisData {
  username: string;
  opinionText: string;
  groups: Array<{
    name: string;
    agree: number;
    disagree: number;
  }>;
}
