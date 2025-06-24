export type AnalysisTabActionButton = "learnMore" | "viewMore" | "none";

export type AnalysisTabActionCallback = () => void;

export interface OpinionClusterVote {
  clusterKey: string;
  numAgree: number;
  numPass: number;
  numDisagree: number;
  numNoVote: number;
}

export interface OpinionConsensusItem {
  id: number;
  description: string;
  totalNumAgree: number;
  totalNumPass: number;
  totalNumDisagree: number;
  totalNumNoVote: number;
  clusterVotes: OpinionClusterVote[];
  belongsToClusters: string[];
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
