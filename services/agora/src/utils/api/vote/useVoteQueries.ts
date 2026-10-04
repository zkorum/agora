import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { storeToRefs } from "pinia";
import type { OpinionVoteParams } from "src/composables/opinion/types";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useAuthenticationStore } from "src/stores/authentication";
import type { AnalysisData } from "src/utils/api/comment/analysisData";
import { getUserVotesQueryKey } from "src/utils/query/conversationQueryKeys";
import {
  isQueryForViewerScope,
  useViewerQueryScope,
} from "src/utils/query/viewerScope";
import { computed, type MaybeRefOrGetter, reactive, toValue } from "vue";

import { useNotify } from "../../ui/notify";
import { useBackendAuthApi } from "../auth";
import { useInvalidateCommentQueries } from "../comment/useCommentQueries";
import { useCommonApi } from "../common";
import { classifyApiError } from "../error";
import { useBackendVoteApi } from "../vote";
import {
  type UseVoteQueriesTranslations,
  useVoteQueriesTranslations,
} from "./useVoteQueries.i18n";
import {
  applyOptimisticVote,
  confirmVoteCache,
  restoreVoteCache,
} from "./voteCache";

const userClusteredInSession = reactive(new Set<string>());
function clusterSessionKey({
  conversationSlugId,
  voterId,
}: {
  conversationSlugId: string;
  voterId: string | undefined;
}): string {
  return JSON.stringify([conversationSlugId, voterId]);
}

export function useUserVotesQuery({
  postSlugId,
}: {
  postSlugId: MaybeRefOrGetter<string>;
}) {
  const { fetchUserVotesForPostSlugIds } = useBackendVoteApi();
  const { isAuthInitialized, isGuestOrLoggedIn, userId } = storeToRefs(
    useAuthenticationStore()
  );

  return useQuery({
    queryKey: computed(() =>
      getUserVotesQueryKey({
        conversationSlugId: toValue(postSlugId),
        voterId: userId.value,
      })
    ),
    queryFn: ({ signal }) =>
      fetchUserVotesForPostSlugIds({
        conversationSlugIdList: [toValue(postSlugId)],
        signal,
      }),
    enabled: computed(
      () =>
        isAuthInitialized.value &&
        isGuestOrLoggedIn.value &&
        toValue(postSlugId) !== ""
    ),
    staleTime: 1000 * 60 * 5, // 5 minutes like comments
    retry: false, // Disable auto-retry
  });
}

export function useVoteMutation(postSlugId: string) {
  const queryClient = useQueryClient();
  const { castVoteForComment } = useBackendVoteApi();
  const { showNotifyMessage } = useNotify();
  const { t } = useComponentI18n<UseVoteQueriesTranslations>(
    useVoteQueriesTranslations
  );
  const { markAnalysisAsStale } = useInvalidateCommentQueries();
  const { getErrorMessage } = useCommonApi();
  const { ensureParticipationAuthState } = useBackendAuthApi();
  const { userId } = storeToRefs(useAuthenticationStore());
  const viewerScope = useViewerQueryScope();

  function currentVotesKey() {
    return getUserVotesQueryKey({
      conversationSlugId: postSlugId,
      voterId: userId.value,
    });
  }

  return useMutation({
    mutationFn: (
      variables: OpinionVoteParams & { isCurrent: () => boolean }
    ) => {
      const { opinionSlugId, voteAction } = variables;
      const analysisQueryData = queryClient.getQueriesData<AnalysisData>({
        queryKey: ["analysis", postSlugId],
        predicate: (query) =>
          isQueryForViewerScope({
            queryKey: query.queryKey,
            viewerScope: viewerScope.value,
          }),
      });

      const cacheKnowsUserIsClustered = analysisQueryData.some(
        ([, analysisData]) =>
          analysisData?.polisClusters !== undefined &&
          Object.values(analysisData.polisClusters).some(
            (cluster) => cluster?.isUserInCluster === true
          )
      );

      const sessionKnowsUserIsClustered = userClusteredInSession.has(
        clusterSessionKey({
          conversationSlugId: postSlugId,
          voterId: userId.value,
        })
      );

      const returnIsUserClustered = !(
        cacheKnowsUserIsClustered || sessionKnowsUserIsClustered
      );

      return castVoteForComment({
        opinionSlugId,
        votingAction: voteAction,
        returnIsUserClustered,
        isCurrent: variables.isCurrent,
      });
    },

    onMutate: async (variables) => {
      const { opinionSlugId, voteAction } = variables;
      const { isCurrent } = variables;
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ["userVotes", postSlugId] }),
        queryClient.cancelQueries({ queryKey: ["comments", postSlugId] }),
      ]);
      if (!isCurrent())
        throw new DOMException("Voting session changed", "AbortError");

      const snapshot = applyOptimisticVote({
        queryClient,
        votesKey: currentVotesKey(),
        params: { opinionSlugId, voteAction },
      });
      return { snapshot };
    },

    onError: (error: unknown, variables, context) => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      if (!variables.isCurrent()) return;
      if (context !== undefined)
        restoreVoteCache({
          queryClient,
          votesKey: currentVotesKey(),
          snapshot: context.snapshot,
        });

      const apiError = classifyApiError(error);
      if (apiError.kind === "transport") {
        showNotifyMessage(getErrorMessage(apiError));
      } else {
        showNotifyMessage(t("failedToCastVote"));
      }
    },

    onSuccess: async (data, variables, context) => {
      if (!variables.isCurrent()) return;
      if (!data.success) {
        if (context !== undefined)
          restoreVoteCache({
            queryClient,
            votesKey: currentVotesKey(),
            snapshot: context.snapshot,
          });
        return;
      }

      // Guest creation may change the cache key while the vote is in flight.
      await ensureParticipationAuthState();
      if (!variables.isCurrent()) return;
      const votesKey = currentVotesKey();
      await queryClient.cancelQueries({ queryKey: votesKey });
      if (!variables.isCurrent()) return;
      if (context !== undefined) {
        confirmVoteCache({ queryClient, votesKey, snapshot: context.snapshot });
      }

      if (data.userIsClustered === true) {
        userClusteredInSession.add(
          clusterSessionKey({
            conversationSlugId: postSlugId,
            voterId: userId.value,
          })
        );
        markAnalysisAsStale(postSlugId);
      }

      // If vote was cancelled, mark My Votes query as stale (no immediate refetch)
      // This ensures cancelled opinions disappear on next filter switch/refresh
      if (variables.voteAction === "cancel") {
        void queryClient.invalidateQueries({
          queryKey: ["comments", postSlugId, "my_votes"],
          refetchType: "none", // Only mark stale, don't refetch immediately
        });
      }
    },

    retry: false, // Disable auto-retry
  });
}

// Utility function to invalidate vote-related queries
export function useInvalidateVoteQueries() {
  const queryClient = useQueryClient();

  return {
    invalidateUserVotes: (postSlugId: string) => {
      return queryClient.invalidateQueries({
        queryKey: ["userVotes", postSlugId],
      });
    },
  };
}

// Composable to check if user was clustered in this session
export function useUserClusteringSession() {
  const { userId } = storeToRefs(useAuthenticationStore());
  return {
    isUserClusteredInSession: (postSlugId: string) => {
      return userClusteredInSession.has(
        clusterSessionKey({
          conversationSlugId: postSlugId,
          voterId: userId.value,
        })
      );
    },
  };
}
