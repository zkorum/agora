import type { CastVoteResponse } from "src/shared/types/dto";
import type { VotingAction, VotingOption } from "src/shared/types/zod";

export interface UserVote {
  readonly opinionSlugId: string;
  readonly votingAction: VotingOption;
}

export interface OpinionVoteParams {
  opinionSlugId: string;
  voteAction: VotingAction;
}

export interface OpinionVotingUtilities {
  userVotes: readonly UserVote[];
  castVote: (params: OpinionVoteParams) => Promise<CastVoteResponse | undefined>;
}
