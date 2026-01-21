import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { storeToRefs } from "pinia";
import type { VotingAction } from "src/shared/types/zod";
import { useAuthenticationStore } from "src/stores/authentication";
import { computed, type MaybeRefOrGetter, toValue } from "vue";

import { useNotify } from "../../ui/notify";
import { useBackendAuthApi } from "../auth";
import { useInvalidateCommentQueries } from "../comment/useCommentQueries";
import type { AxiosErrorResponse } from "../common";
import { useCommonApi } from "../common";
import { useBackendVoteApi } from "../vote";

// Track clustering status across component mounts (session-level persistence)
const userClusteredInSession = new Map<string, boolean>();

export function useUserVotesQuery({ postSlugId }: { postSlugId: MaybeRefOrGetter<string> }) {
  const { fetchUserVotesForPostSlugIds } = useBackendVoteApi();
  const { isAuthInitialized, isGuestOrLoggedIn } = storeToRefs(useAuthenticationStore());

  return useQuery({
    queryKey: ["userVotes", computed(() => toValue(postSlugId))],
    queryFn: () => fetchUserVotesForPostSlugIds([toValue(postSlugId)]),
    enabled: computed(() => isAuthInitialized.value && isGuestOrLoggedIn.value && toValue(postSlugId) !== ""),
    staleTime: 1000 * 60 * 5, // 5 minutes like comments
    retry: false, // Disable auto-retry
  });
}

export function useVoteMutation(postSlugId: string) {
  const queryClient = useQueryClient();
  const { castVoteForComment } = useBackendVoteApi();
  const { showNotifyMessage } = useNotify();
  const { markAnalysisAsStale } = useInvalidateCommentQueries();
  const { getErrorMessage } = useCommonApi();
  const { updateAuthState } = useBackendAuthApi();

  return useMutation({
    mutationFn: ({
      opinionSlugId,
      voteAction,
    }: {
      opinionSlugId: string;
      voteAction: VotingAction;
    }) => {
      // Check BOTH cache AND session to determine if we should request clustering status
      const analysisData = queryClient.getQueryData<{
        polisClusters?: Record<string, { isUserInCluster?: boolean } | undefined>;
      }>(["analysis", postSlugId]);

      // Check if cache knows user is clustered
      const cacheKnowsUserIsClustered =
        analysisData?.polisClusters &&
        Object.values(analysisData.polisClusters).some(
          (cluster) => cluster?.isUserInCluster === true
        );

      // Check if session knows user is clustered
      const sessionKnowsUserIsClustered = userClusteredInSession.get(postSlugId) === true;

      // Request clustering status ONLY if NEITHER knows
      const returnIsUserClustered = !(cacheKnowsUserIsClustered || sessionKnowsUserIsClustered);

      return castVoteForComment(opinionSlugId, voteAction, { returnIsUserClustered });
    },

    // Optimistic update: update cache immediately before server responds
    onMutate: async ({ opinionSlugId, voteAction }) => {
      const userVotesKey = ["userVotes", postSlugId];
      const commentsKey = ["comments", postSlugId];

      // Get previous vote from cache BEFORE updating (for vote count delta calculation)
      const oldUserVotesData = queryClient.getQueryData<Array<{ opinionSlugId: string; votingAction: string }>>(userVotesKey);
      const previousVote = oldUserVotesData?.find(v => v.opinionSlugId === opinionSlugId);

      // Cancel outgoing refetches to prevent them from overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: userVotesKey });
      await queryClient.cancelQueries({ queryKey: commentsKey });

      // Snapshot BOTH caches for rollback
      const previousUserVotes = queryClient.getQueryData(userVotesKey);
      const previousComments = queryClient.getQueriesData({ queryKey: commentsKey });

      // Optimistically update userVotes cache (for vote highlighting)
      queryClient.setQueryData<Array<{ opinionSlugId: string; votingAction: string }>>(userVotesKey, (oldData) => {
        if (!oldData) return [];

        // Remove existing vote for this opinion (if any)
        const filteredVotes = oldData.filter(vote => vote.opinionSlugId !== opinionSlugId);

        // If not canceling, add the new vote
        if (voteAction !== "cancel") {
          return [...filteredVotes, { opinionSlugId, votingAction: voteAction }];
        }

        return filteredVotes;
      });

      // Optimistically update ALL comments caches (for vote counts)
      queryClient.setQueriesData<Array<{ opinionSlugId: string; numAgrees: number; numDisagrees: number; numPasses: number }>>(
        { queryKey: commentsKey },
        (oldComments) => {
          if (!oldComments) return oldComments;

          return oldComments.map(comment => {
            if (comment.opinionSlugId !== opinionSlugId) return comment;

            // Calculate vote count delta based on previous and new votes
            const delta = { agree: 0, disagree: 0, pass: 0 };

            // Remove old vote count
            if (previousVote?.votingAction === "agree") delta.agree--;
            if (previousVote?.votingAction === "disagree") delta.disagree--;
            if (previousVote?.votingAction === "pass") delta.pass--;

            // Add new vote count
            if (voteAction === "agree") delta.agree++;
            if (voteAction === "disagree") delta.disagree++;
            if (voteAction === "pass") delta.pass++;

            return {
              ...comment,
              numAgrees: comment.numAgrees + delta.agree,
              numDisagrees: comment.numDisagrees + delta.disagree,
              numPasses: comment.numPasses + delta.pass,
            };
          });
        }
      );

      // Return context with BOTH previous values for rollback
      return { previousUserVotes, previousComments };
    },

    onError: (error: AxiosErrorResponse, _variables, context) => {
      // Rollback BOTH caches to previous state on error
      if (context?.previousUserVotes !== undefined) {
        queryClient.setQueryData(["userVotes", postSlugId], context.previousUserVotes);
      }
      if (context?.previousComments !== undefined) {
        // Restore all comments cache entries
        for (const [queryKey, data] of context.previousComments) {
          queryClient.setQueryData(queryKey, data);
        }
      }

      // Handle error notification
      if (error?.code) {
        showNotifyMessage(getErrorMessage(error));
      } else {
        showNotifyMessage("Failed to cast vote. Please try again.");
      }
    },

    onSuccess: async (data, variables) => {
      // If backend confirms user is clustered, track it and mark analysis as stale
      if (data.success && data.userIsClustered === true) {
        // Track in session - this STOPS all future clustering requests
        userClusteredInSession.set(postSlugId, true);

        // Mark analysis as stale WITHOUT immediate refetch
        // Will refetch ONLY when user clicks "View analysis" or visits analysis tab
        markAnalysisAsStale(postSlugId);
      }

      // Update auth state if vote succeeded (guest user may have been created)
      if (data.success) {
        await updateAuthState({
          partialLoginStatus: { isKnown: true },
        });
      }

      // If vote was cancelled, mark My Votes query as stale (no immediate refetch)
      // This ensures cancelled opinions disappear on next filter switch/refresh
      if (variables.voteAction === "cancel") {
        void queryClient.invalidateQueries({
          queryKey: ["comments", postSlugId, "my_votes"],
          refetchType: 'none', // Only mark stale, don't refetch immediately
        });
      }

      // Note: We don't invalidate userVotes here to avoid read replica lag issues
      // The optimistic update from onMutate will persist until natural cache expiration (staleTime: 5min)
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

// Composable to check if user was clustered in this session
export function useUserClusteringSession() {
  return {
    isUserClusteredInSession: (postSlugId: string) => {
      return userClusteredInSession.get(postSlugId) === true;
    },
  };
}
