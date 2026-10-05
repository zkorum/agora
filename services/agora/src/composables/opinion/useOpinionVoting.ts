import type { CastVoteResponse } from "src/shared/types/dto";
import { useAuthenticationStore } from "src/stores/authentication";
import {
  useUserVotesQuery,
  useVoteMutation,
} from "src/utils/api/vote/useVoteQueries";
import { computed, type ComputedRef } from "vue";

import type { OpinionVoteParams, UserVote } from "./types";

export interface UseOpinionVotingParams {
  postSlugId: string;
  captureAction?: () => () => boolean;
}

export interface UseOpinionVotingReturn {
  userVotes: ComputedRef<readonly UserVote[]>;
  castVote: (params: OpinionVoteParams) => Promise<CastVoteResponse | undefined>;
  fetchUserVotingData: () => Promise<void>;
}

export function useOpinionVoting({
  postSlugId,
  captureAction,
}: UseOpinionVotingParams): UseOpinionVotingReturn {
  const authStore = useAuthenticationStore();
  function captureVotingAction(): () => boolean {
    const voterId = authStore.userId;
    const isCurrentView = captureAction?.() ?? (() => true);
    return () => isCurrentView() && (authStore.userId === voterId ||
      (voterId === undefined && authStore.isGuest));
  }
  // Use TanStack Query for vote data
  const userVotesQuery = useUserVotesQuery({
    postSlugId,
  });

  // Use TanStack Query mutation for voting
  const voteMutation = useVoteMutation(postSlugId);

  // User votes - directly use server data for simplicity
  const userVotes = computed<readonly UserVote[]>(() => {
    return userVotesQuery.data.value || [];
  });

  async function castVote({ opinionSlugId, voteAction }: OpinionVoteParams): Promise<CastVoteResponse | undefined> {
    const isCurrent = captureVotingAction();
    const result = await voteMutation.mutateAsync({
      opinionSlugId,
      voteAction,
      isCurrent,
    });

    return isCurrent() ? result : undefined;
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
