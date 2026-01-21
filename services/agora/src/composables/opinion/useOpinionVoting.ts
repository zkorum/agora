import type { CastVoteResponse } from "src/shared/types/dto";
import type { OpinionItem,VotingAction } from "src/shared/types/zod";
import {
  useUserVotesQuery,
  useVoteMutation,
} from "src/utils/api/vote/useVoteQueries";
import { computed, type Ref } from "vue";

import type { UserVote } from "./types";

export interface UseOpinionVotingParams {
  postSlugId: string;
  visibleOpinions: Ref<OpinionItem[]>;
}

export interface UseOpinionVotingReturn {
  userVotes: Ref<UserVote[]>;
  castVote: (
    opinionSlugId: string,
    voteAction: VotingAction
  ) => Promise<CastVoteResponse>;
  fetchUserVotingData: () => Promise<void>;
}

export function useOpinionVoting({
  postSlugId,
}: UseOpinionVotingParams): UseOpinionVotingReturn {
  // Use TanStack Query for vote data
  const userVotesQuery = useUserVotesQuery({
    postSlugId,
  });

  // Use TanStack Query mutation for voting
  const voteMutation = useVoteMutation(postSlugId);

  // User votes - directly use server data for simplicity
  const userVotes = computed<UserVote[]>(() => {
    return userVotesQuery.data.value || [];
  });

  async function castVote(
    opinionSlugId: string,
    voteAction: VotingAction
  ): Promise<CastVoteResponse> {
    const result = await voteMutation.mutateAsync({
      opinionSlugId,
      voteAction,
    });

    return result;
  }

  async function fetchUserVotingData(): Promise<void> {
    // Refetch user voting data
    // TanStack Query's `enabled` condition will prevent this from running until auth is ready
    await userVotesQuery.refetch();
  }

  return {
    userVotes,
    castVote,
    fetchUserVotingData,
  };
}
