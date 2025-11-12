import { computed, type Ref } from "vue";
import { storeToRefs } from "pinia";
import type { VotingAction, OpinionItem } from "src/shared/types/zod";
import type { CastVoteResponse } from "src/shared/types/dto";
import {
  useUserVotesQuery,
  useVoteMutation,
} from "src/utils/api/vote/useVoteQueries";
import { useAuthenticationStore } from "src/stores/authentication";
import type { UserVote } from "./types";

export interface UseOpinionVotingParams {
  postSlugId: string;
  visibleOpinions: Ref<OpinionItem[]>;
  onVoteCast?: () => void;
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
  onVoteCast,
}: UseOpinionVotingParams): UseOpinionVotingReturn {
  // Get authentication status
  const { isGuestOrLoggedIn } = storeToRefs(useAuthenticationStore());

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

    // Call the callback after successful vote
    if (result.success && onVoteCast) {
      onVoteCast();
    }

    return result;
  }

  async function fetchUserVotingData(): Promise<void> {
    // Only fetch user voting data if user is authenticated
    if (isGuestOrLoggedIn.value) {
      await userVotesQuery.refetch();
    }
  }

  return {
    userVotes,
    castVote,
    fetchUserVotingData,
  };
}
