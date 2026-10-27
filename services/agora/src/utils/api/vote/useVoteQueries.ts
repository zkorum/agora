import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { isAxiosError } from "axios";
import { storeToRefs } from "pinia";
import type { OpinionVoteParams } from "src/composables/opinion/types";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useAuthenticationStore } from "src/stores/authentication";
import type { AnalysisData } from "src/utils/api/comment/analysisData";
import {
  getUserVotesQueryKey,
  type UserVotesQueryKey,
} from "src/utils/query/conversationQueryKeys";
import {
  isQueryForViewerScope,
  useViewerQueryScope,
} from "src/utils/query/viewerScope";
import { computed, type MaybeRefOrGetter, reactive, toValue, watch } from "vue";

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
import {
  getVoteSubmissionQueue,
  type VoteSubmission,
} from "./voteSubmissionQueue";

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

export function useVoteMutation({
  postSlugId,
  feedback = "inline",
}: {
  postSlugId: string;
  feedback?: "inline" | "session";
}) {
  const queryClient = useQueryClient();
  const { castVoteForComment } = useBackendVoteApi();
  const { showNotifyMessage } = useNotify();
  const { t } = useComponentI18n<UseVoteQueriesTranslations>(
    useVoteQueriesTranslations
  );
  const { markAnalysisAsStale } = useInvalidateCommentQueries();
  const { getErrorMessage } = useCommonApi();
  const { ensureParticipationAuthState } = useBackendAuthApi();
  const authStore = useAuthenticationStore();
  const { userId } = storeToRefs(authStore);
  const viewerScope = useViewerQueryScope();
  const submissions = getVoteSubmissionQueue(queryClient);

  function captureViewer() {
    let voterId = userId.value;
    let isValid = true;
    const stop = watch(
      userId,
      (nextVoterId) => {
        if (
          isValid &&
          voterId === undefined &&
          nextVoterId !== undefined &&
          authStore.isGuest
        ) {
          voterId = nextVoterId;
        } else if (nextVoterId !== voterId) {
          isValid = false;
        }
      },
      { flush: "sync" }
    );
    return {
      isCurrent: () => isValid && userId.value === voterId,
      // A returning account still waits for its earlier writes, although old
      // session callbacks must remain invalid after switching away and back.
      isSameViewer: () =>
        userId.value === voterId && (voterId !== undefined || isValid),
      votesKey: () =>
        getUserVotesQueryKey({ conversationSlugId: postSlugId, voterId }),
      stop,
    };
  }

  type VoteVariables = Readonly<
    OpinionVoteParams & { isCurrent: () => boolean }
  >;
  type SubmissionVariables = VoteVariables & {
    clientAction: { sessionId: string; sequence: number };
    isCurrentViewer: () => boolean;
    ownerVotesKey: () => UserVotesQueryKey;
    readsCancelled: Promise<void>;
    submission: VoteSubmission;
  };

  function rollbackSubmission(variables: SubmissionVariables): void {
    if (!variables.submission.isLatest()) return;
    restoreVoteCache({
      queryClient,
      votesKey: variables.ownerVotesKey(),
      snapshot: variables.submission.snapshot,
      vote: variables.submission.confirmedVote(),
    });
  }

  const mutation = useMutation({
    mutationFn: async (variables: SubmissionVariables) => {
      await variables.readsCancelled;
      if (!variables.isCurrent() || !variables.submission.isLatest())
        return undefined;
      const { opinionSlugId, voteAction } = variables;
      const analysisQueryData =
        feedback === "inline"
          ? queryClient.getQueriesData<AnalysisData>({
              queryKey: ["analysis", postSlugId],
              predicate: (query) =>
                isQueryForViewerScope({
                  queryKey: query.queryKey,
                  viewerScope: viewerScope.value,
                }),
            })
          : [];

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

      const returnIsUserClustered =
        feedback === "inline" &&
        !(cacheKnowsUserIsClustered || sessionKnowsUserIsClustered);

      const response = await castVoteForComment({
        opinionSlugId,
        votingAction: voteAction,
        returnIsUserClustered,
        isCurrent: variables.isCurrent,
        sourceVersion: variables.sourceVersion,
        clientAction: variables.clientAction,
      });
      // Receipt of an accepted write matters even if its view was replaced:
      // a newer choice may need to roll back to this vote.
      if (response.success) variables.submission.confirm();
      return response;
    },

    onError: (error: unknown, variables) => {
      rollbackSubmission(variables);
      if (error instanceof DOMException && error.name === "AbortError") return;
      if (!variables.isCurrent() || !variables.submission.isLatest()) return;
      if (feedback === "session") return;

      const apiError = classifyApiError(error);
      if (apiError.kind === "transport") {
        showNotifyMessage(getErrorMessage(apiError));
      } else {
        showNotifyMessage(t("failedToCastVote"));
      }
    },

    onSuccess: async (data, variables) => {
      if (data === undefined || !data.success) {
        rollbackSubmission(variables);
        if (!variables.isCurrentViewer()) return;
        if (
          variables.submission.isLatest() &&
          data?.reason === "statement_changed" &&
          feedback === "inline"
        ) {
          const voterId = userId.value;
          await Promise.all([
            queryClient.invalidateQueries({
              queryKey: ["comments", postSlugId],
              predicate: (query) => query.queryKey[3] === voterId,
            }),
            queryClient.invalidateQueries({
              queryKey: ["nextUnansweredOpinion", postSlugId],
              predicate: (query) => query.queryKey[3] === voterId,
            }),
          ]);
        }
        return;
      }
      if (!variables.isCurrentViewer()) return;

      // Guest creation may change the cache key while the vote is in flight.
      try {
        await ensureParticipationAuthState();
      } catch {
        // An accepted vote remains accepted if subsequent session refresh fails.
        if (variables.isCurrent() && variables.submission.isLatest()) {
          showNotifyMessage(t("voteSavedSessionRefreshFailed"));
        }
        return;
      }
      if (!variables.isCurrentViewer()) return;
      const votesKey = variables.ownerVotesKey();
      await queryClient.cancelQueries({ queryKey: votesKey });
      if (!variables.isCurrentViewer()) return;
      if (variables.submission.isLatest()) {
        confirmVoteCache({
          queryClient,
          votesKey,
          snapshot: variables.submission.snapshot,
        });
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
          predicate: (query) => query.queryKey[3] === votesKey[2],
          refetchType: "none", // Only mark stale, don't refetch immediately
        });
      }
    },

    retry: (failures, error) =>
      feedback === "session" &&
      failures < 2 &&
      isAxiosError(error) &&
      (error.response === undefined ||
        error.response.status >= 500 ||
        error.response.status === 429),
  });

  async function cancelVoteReads(votesKey: UserVotesQueryKey): Promise<void> {
    await Promise.all([
      queryClient.cancelQueries({ queryKey: votesKey, exact: true }),
      queryClient.cancelQueries({
        queryKey: ["comments", postSlugId],
        predicate: (query) => query.queryKey[3] === votesKey[2],
      }),
    ]);
  }

  async function mutateAsync({
    opinionSlugId,
    voteAction,
    sourceVersion,
    isCurrent: isCurrentView,
  }: VoteVariables) {
    const params = { opinionSlugId, voteAction, sourceVersion };
    const viewer = captureViewer();
    const isCurrent = () => viewer.isCurrent() && isCurrentView();
    try {
      if (!isCurrent()) return undefined;
      // Cancellation starts synchronously; register the tap before awaiting it
      // so different read-completion times cannot reorder the user's choices.
      const votesKey = viewer.votesKey();
      const readsCancelled = cancelVoteReads(votesKey);
      const clientAction = submissions.nextAction();
      const result = await submissions.submit({
        conversationSlugId: postSlugId,
        snapshot: applyOptimisticVote({
          queryClient,
          votesKey,
          params,
        }),
        // View lifetime must not break ordering for the same viewer.
        isSameViewer: viewer.isSameViewer,
        execute: (submission) =>
          mutation.mutateAsync({
            ...params,
            isCurrent,
            isCurrentViewer: viewer.isCurrent,
            ownerVotesKey: viewer.votesKey,
            readsCancelled,
            submission,
            clientAction,
          }),
      });
      return isCurrent() ? result : undefined;
    } catch (error) {
      if (!isCurrent()) return undefined;
      throw error;
    } finally {
      viewer.stop();
    }
  }

  return { mutateAsync };
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
