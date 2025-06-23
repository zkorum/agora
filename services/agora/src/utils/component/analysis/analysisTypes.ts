export interface ConsensusItemData {
  id: number;
  description: string;
  numAgree: number;
  numPass: number;
  numDisagree: number;
  numNoVote: number;
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
