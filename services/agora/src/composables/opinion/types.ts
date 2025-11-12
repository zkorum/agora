import type { VotingAction, VotingOption } from "src/shared/types/zod";
import type { CastVoteResponse } from "src/shared/types/dto";

export interface UserVote {
  opinionSlugId: string;
  votingAction: VotingOption;
}

export interface OpinionVotingUtilities {
  userVotes: UserVote[];
  castVote: (
    opinionSlugId: string,
    voteAction: VotingAction
  ) => Promise<CastVoteResponse>;
}
