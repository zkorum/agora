import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/vue-query";
import { storeToRefs } from "pinia";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type {
  AnalysisFreshnessRequest,
  FetchCommentStatsResponse,
} from "src/shared/types/dto";
import type { AnalysisView, OpinionItem, PolisKey } from "src/shared/types/zod";
import { useLanguageStore } from "src/stores/language";
import { useUserStore } from "src/stores/user";
import {
  buildAnalysisFreshnessRequest,
  DESCRIPTION_READINESS_RETRY_INTERVAL_MS,
  shouldRetryAnalysisData,
} from "src/utils/analysis/analysisFreshness";
import { computed, type MaybeRefOrGetter, toValue } from "vue";

import { useNotify } from "../../ui/notify";
import type { AxiosErrorResponse } from "../common";
import { getErrorMessage } from "../common";
import { updateConversationQueryCache } from "../post/useConversationQuery";
import type { AnalysisData, CommentTabFilters } from "./comment";
import { buildAnalysisData, useBackendCommentApi } from "./comment";
import {
  type UseCommentQueriesTranslations,
  useCommentQueriesTranslations,
} from "./useCommentQueries.i18n";

export function useCommentsQuery({
  conversationSlugId,
  filter,
  clusterKey,
  voteCount,
  enabled = true,
}: {
  conversationSlugId: MaybeRefOrGetter<string>;
  filter: CommentTabFilters;
  clusterKey?: PolisKey;
  voteCount?: MaybeRefOrGetter<number | undefined>;
  enabled?: MaybeRefOrGetter<boolean>;
}) {
  const { fetchCommentsForPost } = useBackendCommentApi();

  return useQuery({
    queryKey: [
      "comments",
      computed(() => toValue(conversationSlugId)),
      filter,
      clusterKey,
    ],
    queryFn: () =>
      fetchCommentsForPost(toValue(conversationSlugId), filter, clusterKey),
    enabled: computed(
      () => toValue(enabled) && toValue(conversationSlugId) !== ""
    ),
    staleTime: getAnalysisStaleTime(toValue(voteCount)), // Dynamic cache based on conversation size
    // Note: bypassed by manual invalidation on tab changes
    placeholderData: (previousData) => previousData, // Preserve previous data during refetches
    retry: false, // Disable auto-retry
  });
}

export function useHiddenCommentsQuery({
  conversationSlugId,
  voteCount,
  enabled = true,
}: {
  conversationSlugId: MaybeRefOrGetter<string>;
  voteCount?: MaybeRefOrGetter<number | undefined>;
  enabled?: MaybeRefOrGetter<boolean>;
}) {
  const { fetchHiddenCommentsForPost } = useBackendCommentApi();

  return useQuery({
    queryKey: ["hiddenComments", computed(() => toValue(conversationSlugId))],
    queryFn: () => fetchHiddenCommentsForPost(toValue(conversationSlugId)),
    enabled: computed(
      () => toValue(enabled) && toValue(conversationSlugId) !== ""
    ),
    staleTime: getAnalysisStaleTime(toValue(voteCount)), // Dynamic cache based on conversation size
    // Note: bypassed by manual invalidation on tab changes
    placeholderData: (previousData) => previousData, // Preserve previous data during refetches
    retry: false, // Disable auto-retry
  });
}

export function useCommentStatsQuery({
  conversationSlugId,
  enabled = true,
}: {
  conversationSlugId: MaybeRefOrGetter<string>;
  enabled?: MaybeRefOrGetter<boolean>;
}) {
  const { fetchCommentStatsForPost } = useBackendCommentApi();

  return useQuery({
    queryKey: ["commentStats", computed(() => toValue(conversationSlugId))],
    queryFn: () => fetchCommentStatsForPost(toValue(conversationSlugId)),
    enabled: computed(
      () => toValue(enabled) && toValue(conversationSlugId) !== ""
    ),
    placeholderData: (previousData) => previousData,
    staleTime: 30_000,
    retry: false,
  });
}

export function pickCommentStatsForActionBar(
  stats: FetchCommentStatsResponse
): Pick<
  FetchCommentStatsResponse,
  | "opinionCount"
  | "participantCount"
  | "voteCount"
  | "totalParticipantCount"
  | "totalVoteCount"
> {
  return {
    opinionCount: stats.opinionCount,
    participantCount: stats.participantCount,
    voteCount: stats.voteCount,
    totalParticipantCount: stats.totalParticipantCount,
    totalVoteCount: stats.totalVoteCount,
  };
}

/**
 * Calculate optimal stale time based on conversation size
 * After this time, data is considered stale and will refetch on next access
 *
 * Backend constraints:
 * - Math-updater scans every 2s (MATH_UPDATER_SCAN_INTERVAL_MS)
 * - Minimum 2s between updates per conversation (MATH_UPDATER_MIN_TIME_BETWEEN_UPDATES_MS)
 * - Singleton deduplication windows: 2s, 8s, 28s (based on vote count)
 * - Network processing time: ~2s
 *
 * Buffer calculation: singleton window + 2s buffer for scan + network
 */
export function getAnalysisStaleTime(voteCount?: number): number {
  if (!voteCount) return 30000; // Default 30s if unknown (huge conversation default)

  // Buffer for scan interval (2s) + network processing + safety margin
  const BUFFER_MS = 2000; // 2 seconds buffer

  if (voteCount < 1000) {
    // Small conversations (< 1K votes): 2s singleton + 2s buffer = 4s
    return 2000 + BUFFER_MS;
  } else if (voteCount < 1000000) {
    // Medium conversations (1K-1M votes): 8s singleton + 2s buffer = 10s
    return 8000 + BUFFER_MS;
  } else {
    // Huge conversations (1M+ votes): 28s singleton + 2s buffer = 30s
    return 28000 + BUFFER_MS;
  }
}

type BackendCommentApi = ReturnType<typeof useBackendCommentApi>;

export async function fetchAnalysisDataWithCache({
  queryClient,
  fetchAnalysisMetadataData,
  fetchAnalysisContentData,
  conversationSlugId,
  analysisView,
  checkpointViewSnapshotId,
  aiLabelingEnabled,
  displayLanguage,
  voteCount,
  freshness,
}: {
  queryClient: QueryClient;
  fetchAnalysisMetadataData: BackendCommentApi["fetchAnalysisMetadataData"];
  fetchAnalysisContentData: BackendCommentApi["fetchAnalysisContentData"];
  conversationSlugId: string;
  analysisView: AnalysisView | undefined;
  checkpointViewSnapshotId: number | undefined;
  aiLabelingEnabled: boolean | undefined;
  displayLanguage: string;
  voteCount: number | undefined;
  freshness: AnalysisFreshnessRequest | null;
}): Promise<AnalysisData> {
  const metadata = await queryClient.fetchQuery({
    queryKey: [
      "analysisMetadata",
      conversationSlugId,
      analysisView,
      checkpointViewSnapshotId,
      aiLabelingEnabled,
      displayLanguage,
    ],
    queryFn: () =>
      fetchAnalysisMetadataData({
        conversationSlugId,
        analysisView,
        checkpointViewSnapshotId,
        freshness,
      }),
    staleTime: 0,
  });

  const resolvedCandidateId = metadata.analysisViewState.resolvedCandidateId;
  const resolvedContentViewSnapshotId = metadata.conversationViewSnapshotId;
  const contentResult =
    resolvedContentViewSnapshotId === undefined || resolvedCandidateId === null
      ? undefined
      : await queryClient.fetchQuery({
          queryKey: [
            "analysisContent",
            conversationSlugId,
            resolvedContentViewSnapshotId,
            resolvedCandidateId,
            displayLanguage,
          ],
          queryFn: () =>
            fetchAnalysisContentData({
              conversationSlugId,
              conversationViewSnapshotId: resolvedContentViewSnapshotId,
              candidateId: resolvedCandidateId,
              freshness,
            }),
          staleTime: freshness === null ? getAnalysisStaleTime(voteCount) : 0,
        });

  return buildAnalysisData({ metadata, content: contentResult });
}

export function useAnalysisQuery({
  conversationSlugId,
  analysisView,
  checkpointViewSnapshotId,
  aiLabelingEnabled,
  voteCount,
  enabled = true,
}: {
  conversationSlugId: MaybeRefOrGetter<string>;
  analysisView?: MaybeRefOrGetter<AnalysisView | undefined>;
  checkpointViewSnapshotId?: MaybeRefOrGetter<number | undefined>;
  aiLabelingEnabled?: MaybeRefOrGetter<boolean | undefined>;
  voteCount?: MaybeRefOrGetter<number | undefined>;
  enabled?: MaybeRefOrGetter<boolean>;
}) {
  const { fetchAnalysisMetadataData, fetchAnalysisContentData } =
    useBackendCommentApi();
  const queryClient = useQueryClient();
  const { displayLanguage } = storeToRefs(useLanguageStore());

  return useQuery({
    queryKey: [
      "analysis",
      computed(() => toValue(conversationSlugId)),
      computed(() => toValue(analysisView)),
      computed(() => toValue(checkpointViewSnapshotId)),
      computed(() => toValue(aiLabelingEnabled)),
      computed(() => displayLanguage.value),
    ],
    queryFn: async () => {
      const resolvedConversationSlugId = toValue(conversationSlugId);
      const resolvedAnalysisView = toValue(analysisView);
      const resolvedCheckpointViewSnapshotId = toValue(
        checkpointViewSnapshotId
      );
      const resolvedAiLabelingEnabled = toValue(aiLabelingEnabled);
      const resolvedDisplayLanguage = displayLanguage.value;
      const resolvedVoteCount = toValue(voteCount);
      const resolvedQueryKey = [
        "analysis",
        resolvedConversationSlugId,
        resolvedAnalysisView,
        resolvedCheckpointViewSnapshotId,
        resolvedAiLabelingEnabled,
        resolvedDisplayLanguage,
      ];
      const previousAnalysis = queryClient.getQueryData<AnalysisData>(
        resolvedQueryKey
      );
      const freshness = buildAnalysisFreshnessRequest({
        previousAnalysis,
        expectedSnapshotId: null,
        expectedDescriptionLocales: [],
        enablePrimaryFallback: true,
      });
      const analysisData = await fetchAnalysisDataWithCache({
        queryClient,
        fetchAnalysisMetadataData,
        fetchAnalysisContentData,
        conversationSlugId: resolvedConversationSlugId,
        analysisView: resolvedAnalysisView,
        checkpointViewSnapshotId: resolvedCheckpointViewSnapshotId,
        aiLabelingEnabled: resolvedAiLabelingEnabled,
        displayLanguage: resolvedDisplayLanguage,
        voteCount: resolvedVoteCount,
        freshness,
      });

      const snapshot = analysisData.conversationViewSnapshot;
      if (
        resolvedCheckpointViewSnapshotId === undefined &&
        snapshot !== undefined
      ) {
        updateConversationQueryCache({
          queryClient,
          conversationSlugId: resolvedConversationSlugId,
          updateConversation: (conversation) => {
            const previousSnapshotId =
              conversation.metadata.conversationViewSnapshotId;
            if (
              previousSnapshotId !== undefined &&
              snapshot.conversationViewSnapshotId < previousSnapshotId
            ) {
              return conversation;
            }

            return {
              ...conversation,
              metadata: {
                ...conversation.metadata,
                conversationViewSnapshotId: snapshot.conversationViewSnapshotId,
                opinionCount: snapshot.opinionCount,
                voteCount: snapshot.voteCount,
                participantCount: snapshot.participantCount,
                totalOpinionCount: snapshot.totalOpinionCount,
                totalVoteCount: snapshot.totalVoteCount,
                totalParticipantCount: snapshot.totalParticipantCount,
                moderatedOpinionCount: snapshot.moderatedOpinionCount,
                hiddenOpinionCount: snapshot.hiddenOpinionCount,
                isClosed: snapshot.isClosed,
              },
            };
          },
        });
      }

      return analysisData;
    },
    enabled: computed(
      () => toValue(enabled) && toValue(conversationSlugId) !== ""
    ),
    staleTime: getAnalysisStaleTime(toValue(voteCount)), // Dynamic cache based on conversation size
    // Note: When votes/comments happen, markAnalysisAsStale() is called
    // This marks data as stale immediately, so next access will refetch
    placeholderData: (previousData) => previousData, // Preserve previous data during analysis refreshes
    refetchInterval: (query) =>
      shouldRetryAnalysisData(query.state.data)
        ? DESCRIPTION_READINESS_RETRY_INTERVAL_MS
        : false,
    retry: false, // Disable auto-retry
  });
}

export function useAnalysisCheckpointsQuery({
  conversationSlugId,
  enabled = true,
}: {
  conversationSlugId: MaybeRefOrGetter<string>;
  enabled?: MaybeRefOrGetter<boolean>;
}) {
  const { fetchAnalysisCheckpoints } = useBackendCommentApi();

  return useQuery({
    queryKey: [
      "analysisCheckpoints",
      computed(() => toValue(conversationSlugId)),
    ],
    queryFn: () =>
      fetchAnalysisCheckpoints({
        conversationSlugId: toValue(conversationSlugId),
      }),
    enabled: computed(
      () => toValue(enabled) && toValue(conversationSlugId) !== ""
    ),
    staleTime: 30000,
    placeholderData: (previousData) => previousData, // Preserve timeline during refreshes
    retry: false,
  });
}

export function useCreateCommentMutation() {
  const { createNewComment } = useBackendCommentApi();
  const queryClient = useQueryClient();
  const { showNotifyMessage } = useNotify();
  const { t } = useComponentI18n<UseCommentQueriesTranslations>(
    useCommentQueriesTranslations
  );
  const { markAnalysisAsStale } = useInvalidateCommentQueries();

  return useMutation({
    mutationFn: ({
      commentBody,
      conversationSlugId,
    }: {
      commentBody: string;
      conversationSlugId: string;
    }) => createNewComment(commentBody, conversationSlugId),
    onSuccess: (data, variables) => {
      // Only proceed if the comment creation was successful
      if (data.success) {
        // Invalidate and refetch comments for this conversation
        void queryClient.invalidateQueries({
          queryKey: ["comments", variables.conversationSlugId],
        });
        // Mark analysis as stale without immediate refetch
        // Let the refetchInterval handle updates based on conversation activity
        markAnalysisAsStale(variables.conversationSlugId);
      } else {
        // Handle business logic failures (like conversation_locked)
        showNotifyMessage(
          t("failedToCreateCommentWithReason", {
            reason: data.reason ?? "unknown",
          })
        );
      }
    },
    onError: (error: AxiosErrorResponse) => {
      // Handle technical errors (network, server errors, etc.)
      if (error?.code) {
        showNotifyMessage(getErrorMessage(error));
      } else {
        showNotifyMessage(t("failedToCreateComment"));
      }
    },
    retry: false, // Disable auto-retry
  });
}

export function useDeleteCommentMutation() {
  const { deleteCommentBySlugId } = useBackendCommentApi();
  const queryClient = useQueryClient();
  const { showNotifyMessage } = useNotify();
  const { t } = useComponentI18n<UseCommentQueriesTranslations>(
    useCommentQueriesTranslations
  );
  const userStore = useUserStore();

  interface DeleteCommentMutationVariables {
    commentSlugId: string;
    conversationSlugId: string;
    moderation: OpinionItem["moderation"];
  }

  return useMutation({
    mutationFn: ({ commentSlugId }: DeleteCommentMutationVariables) =>
      deleteCommentBySlugId(commentSlugId),
    onSuccess: (_data, variables, _context: unknown) => {
      // Remove from TanStack Query cache (conversation page - all filters)
      queryClient.setQueriesData<OpinionItem[]>(
        { queryKey: ["comments"] },
        (oldData) =>
          oldData?.filter(
            (opinion) => opinion.opinionSlugId !== variables.commentSlugId
          ) ?? []
      );

      queryClient.setQueriesData<OpinionItem[]>(
        { queryKey: ["hiddenComments"] },
        (oldData) =>
          oldData?.filter(
            (opinion) => opinion.opinionSlugId !== variables.commentSlugId
          ) ?? []
      );

      updateConversationQueryCache({
        queryClient,
        conversationSlugId: variables.conversationSlugId,
        updateConversation: (conversation) => {
          const isUnmoderated = variables.moderation.status === "unmoderated";
          const isMoved =
            variables.moderation.status === "moderated" &&
            variables.moderation.action === "move";
          const isHidden =
            variables.moderation.status === "moderated" &&
            variables.moderation.action === "hide";

          return {
            ...conversation,
            metadata: {
              ...conversation.metadata,
              opinionCount: Math.max(
                0,
                conversation.metadata.opinionCount - (isUnmoderated ? 1 : 0)
              ),
              totalOpinionCount: Math.max(
                0,
                conversation.metadata.totalOpinionCount - 1
              ),
              moderatedOpinionCount: Math.max(
                0,
                conversation.metadata.moderatedOpinionCount - (isMoved ? 1 : 0)
              ),
              hiddenOpinionCount: Math.max(
                0,
                conversation.metadata.hiddenOpinionCount - (isHidden ? 1 : 0)
              ),
            },
          };
        },
      });

      void queryClient.invalidateQueries({
        queryKey: ["conversation", variables.conversationSlugId],
      });

      // Remove from Pinia store (profile page)
      const indexToRemove = userStore.profileData.userCommentList.findIndex(
        (item) => item.opinionItem.opinionSlugId === variables.commentSlugId
      );
      if (indexToRemove !== -1) {
        userStore.profileData.userCommentList.splice(indexToRemove, 1);
      }

      showNotifyMessage(t("commentDeletedSuccessfully"));
    },
    onError: (error: AxiosErrorResponse) => {
      if (error?.code) {
        showNotifyMessage(getErrorMessage(error));
      } else {
        showNotifyMessage(t("failedToDeleteComment"));
      }
    },
    retry: false, // Disable auto-retry
  });
}

// Utility function to invalidate comment-related queries
export function useInvalidateCommentQueries() {
  const queryClient = useQueryClient();

  return {
    invalidateComments: (conversationSlugId: string) => {
      void queryClient.invalidateQueries({
        queryKey: ["comments", conversationSlugId],
      });
    },
    invalidateHiddenComments: (conversationSlugId: string) => {
      void queryClient.invalidateQueries({
        queryKey: ["hiddenComments", conversationSlugId],
      });
    },
    invalidateAnalysis: (conversationSlugId: string) => {
      void queryClient.invalidateQueries({
        queryKey: ["analysis", conversationSlugId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["analysisMetadata", conversationSlugId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["analysisContent", conversationSlugId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["analysisCheckpoints", conversationSlugId],
      });
    },
    invalidateAnalysisCheckpoints: (conversationSlugId: string) => {
      void queryClient.invalidateQueries({
        queryKey: ["analysisCheckpoints", conversationSlugId],
      });
    },
    forceRefreshAnalysis: (conversationSlugId: string) => {
      // Force immediate refetch bypassing staleTime completely
      void queryClient.invalidateQueries({
        queryKey: ["analysis", conversationSlugId],
        refetchType: "active", // Force active queries to refetch immediately
      });
      void queryClient.invalidateQueries({
        queryKey: ["analysisMetadata", conversationSlugId],
        refetchType: "active",
      });
      void queryClient.invalidateQueries({
        queryKey: ["analysisContent", conversationSlugId],
        refetchType: "active",
      });
      void queryClient.invalidateQueries({
        queryKey: ["analysisCheckpoints", conversationSlugId],
        refetchType: "active",
      });

      // Also trigger immediate refetch for any matching queries
      void queryClient.refetchQueries({
        queryKey: ["analysis", conversationSlugId],
      });
      void queryClient.refetchQueries({
        queryKey: ["analysisMetadata", conversationSlugId],
      });
      void queryClient.refetchQueries({
        queryKey: ["analysisContent", conversationSlugId],
      });
      void queryClient.refetchQueries({
        queryKey: ["analysisCheckpoints", conversationSlugId],
      });
    },
    markAnalysisAsStale: (conversationSlugId: string) => {
      void queryClient.invalidateQueries({
        queryKey: ["analysis", conversationSlugId],
        refetchType: "none", // Mark as stale but don't refetch immediately
      });
      void queryClient.invalidateQueries({
        queryKey: ["analysisMetadata", conversationSlugId],
        refetchType: "none",
      });
      void queryClient.invalidateQueries({
        queryKey: ["analysisContent", conversationSlugId],
        refetchType: "none",
      });
      void queryClient.invalidateQueries({
        queryKey: ["analysisCheckpoints", conversationSlugId],
        refetchType: "none",
      });
    },
    markCommentsAsStale: (conversationSlugId: string) => {
      return Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["comments", conversationSlugId],
          refetchType: "none", // Mark as stale but don't refetch immediately
        }),
        queryClient.invalidateQueries({
          queryKey: ["hiddenComments", conversationSlugId],
          refetchType: "none",
        }),
      ]);
    },
    invalidateAll: (conversationSlugId: string) => {
      return Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["comments", conversationSlugId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["hiddenComments", conversationSlugId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["analysis", conversationSlugId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["analysisMetadata", conversationSlugId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["analysisContent", conversationSlugId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["analysisCheckpoints", conversationSlugId],
        }),
      ]);
    },
  };
}
