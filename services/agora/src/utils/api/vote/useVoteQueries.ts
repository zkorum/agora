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
  const { invalidateAnalysis } = useInvalidateCommentQueries();

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
      // Invalidate analysis data immediately when a vote is cast
      // This ensures fresh data when users switch to the analysis tab
      invalidateAnalysis(postSlugId);
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
