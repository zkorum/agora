export type AnalysisTabActionButton = "learnMore" | "viewMore" | "none";

export type AnalysisTabActionCallback = () => void;

export interface OpinionClusterVote {
  clusterKey: string;
  numAgree: number;
  numPass: number;
  numDisagree: number;
  numNoVote: number;
}

export interface OpinionAnalysisData {
  createdAt: Date;
  username: string;
  opinionText: string;
  groups: Array<{
    name: string;
    agree: number;
    disagree: number;
  }>;
}
