import { computed, type Ref } from "vue";
import { storeToRefs } from "pinia";
import { useAuthenticationStore } from "src/stores/authentication";
import type { VotingAction, OpinionItem } from "src/shared/types/zod";
import {
  useUserVotesQuery,
  useVoteMutation,
} from "src/utils/api/vote/useVoteQueries";
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
  ) => Promise<boolean>;
  fetchUserVotingData: () => Promise<void>;
}

export function useOpinionVoting({
  postSlugId,
}: UseOpinionVotingParams): UseOpinionVotingReturn {
  const { isGuestOrLoggedIn } = storeToRefs(useAuthenticationStore());

  // Use TanStack Query for vote data
  const userVotesQuery = useUserVotesQuery({
    postSlugId,
    enabled: isGuestOrLoggedIn.value,
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
  ): Promise<boolean> {
    try {
      await voteMutation.mutateAsync({
        opinionSlugId,
        voteAction,
      });
      return true;
    } catch {
      return false;
    }
  }

  async function fetchUserVotingData(): Promise<void> {
    await userVotesQuery.refetch();
  }

  return {
    userVotes,
    castVote,
    fetchUserVotingData,
  };
}
