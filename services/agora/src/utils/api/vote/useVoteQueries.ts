import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useBackendVoteApi } from "../vote";
import { useAuthenticationStore } from "src/stores/authentication";
import { useInvalidateCommentQueries } from "../comment/useCommentQueries";
import type { VotingAction } from "src/shared/types/zod";
import type { AxiosErrorResponse } from "../common";
import { getErrorMessage } from "../common";
import { useNotify } from "../../ui/notify";

export function useUserVotesQuery({ postSlugId }: { postSlugId: string }) {
  const { fetchUserVotesForPostSlugIds } = useBackendVoteApi();
  const { isGuestOrLoggedIn } = storeToRefs(useAuthenticationStore());

  return useQuery({
    queryKey: ["userVotes", postSlugId],
    queryFn: () => fetchUserVotesForPostSlugIds([postSlugId]),
    enabled: computed(() => postSlugId.length > 0 && isGuestOrLoggedIn.value),
    staleTime: 1000 * 60 * 5, // 5 minutes like comments
    retry: false, // Disable auto-retry
  });
}

export function useVoteMutation(postSlugId: string) {
  const { castVoteForComment } = useBackendVoteApi();
  const { showNotifyMessage } = useNotify();
  const { markAnalysisAsStale } = useInvalidateCommentQueries();

  return useMutation({
    mutationFn: ({
      opinionSlugId,
      voteAction,
    }: {
      opinionSlugId: string;
      voteAction: VotingAction;
    }) => castVoteForComment(opinionSlugId, voteAction),

    onError: (error: AxiosErrorResponse) => {
      // Handle error notification only
      if (error?.code) {
        showNotifyMessage(getErrorMessage(error));
      } else {
        showNotifyMessage("Failed to cast vote. Please try again.");
      }
    },

    onSuccess: () => {
      // Mark analysis data as stale when a vote is cast without refetching immediately
      // This ensures data is considered outdated but only refetches when the user actually visits the analysis tab
      markAnalysisAsStale(postSlugId);
    },

    retry: false, // Disable auto-retry
  });
}

// Utility function to invalidate vote-related queries
export function useInvalidateVoteQueries() {
  const queryClient = useQueryClient();

  return {
    invalidateUserVotes: (postSlugId: string) => {
      void queryClient.invalidateQueries({
        queryKey: ["userVotes", postSlugId],
      });
    },
    invalidateAll: (postSlugId: string) => {
      void queryClient.invalidateQueries({
        queryKey: ["userVotes", postSlugId],
      });
    },
  };
}
