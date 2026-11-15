import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { storeToRefs } from "pinia";
import type {
  ComparisonLoadResponse,
  ComparisonSaveRequest,
  ComparisonSaveResponse,
  ConversationParticipationRejection,
  PrioritizationItem,
  RankingStatsCheckpointsResponse,
} from "src/shared/types/dto";
import type { ComparisonEngineState } from "src/shared/utils/comparisonEngine";
import { useLanguageStore } from "src/stores/language";
import { getRetainedConversationRankingStatsUpdate } from "src/utils/api/post/rankingStatsUpdate";
import { updateConversationQueryCache } from "src/utils/api/post/useConversationQuery";
import { hasPendingComparisonItemTranslations } from "src/utils/comparisonTranslation";
import { getComparisonLoadQueryKey } from "src/utils/query/conversationQueryKeys";
import { useViewerQueryScope } from "src/utils/query/viewerScope";
import type { ContentTranslationSubscription } from "src/utils/translation/contentTranslationSubscriptions";
import {
  isContentTranslationEventForIdentity,
  useContentTranslationRecovery,
} from "src/utils/translation/useContentTranslationRecovery";
import { computed, type MaybeRefOrGetter, toValue } from "vue";

import { useBackendAuthApi } from "../auth";
import { useComparisonApi } from "./comparison";

export function useComparisonItemsQuery({
  conversationSlugId,
  enabled,
}: {
  conversationSlugId: MaybeRefOrGetter<string>;
  enabled: MaybeRefOrGetter<boolean>;
}) {
  const { fetchComparisonItems } = useComparisonApi();
  const { displayLanguage, spokenLanguages } = storeToRefs(useLanguageStore());
  const query = useQuery({
    queryKey: [
      "comparison-items",
      computed(() => toValue(conversationSlugId)),
      computed(() => displayLanguage.value),
      computed(() => spokenLanguages.value.join(",")),
    ],
    queryFn: async ({ signal }): Promise<PrioritizationItem[]> => {
      const response = await fetchComparisonItems({
        conversationSlugId: toValue(conversationSlugId),
        lifecycleFilter: "active",
        signal,
      });
      if (response.status !== "success") {
        throw new Error("Failed to fetch comparison items");
      }
      return response.data.items;
    },
    enabled: computed(() => toValue(enabled)),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  useContentTranslationRecovery({
    subscription: computed<ContentTranslationSubscription>(() => ({
      kind: "conversation",
      conversationSlugId: toValue(conversationSlugId),
      targetLanguageCode: displayLanguage.value,
    })),
    canRefresh: computed(() => !query.isFetching.value),
    identity: computed(() =>
      JSON.stringify([
        "comparison-items",
        toValue(conversationSlugId),
        displayLanguage.value,
        [...spokenLanguages.value].sort(),
      ])
    ),
    enabled,
    isPending: computed(() =>
      hasPendingComparisonItemTranslations(query.data.value)
    ),
    classifyEvent: (data) => {
      const isCurrentItem = query.data.value?.some((item) =>
        isContentTranslationEventForIdentity({
          data,
          subject: {
            kind: "ranking_item",
            conversationSlugId: toValue(conversationSlugId),
            itemSlugId: item.slugId,
            sourceVersion: item.displayContent.sourceVersion,
          },
          targetLanguageCode: displayLanguage.value,
        })
      );
      return isCurrentItem === true ? "refresh" : "ignore";
    },
    refresh: async () => {
      const result = await query.refetch();
      if (result.isError) {
        return "pending";
      }
      return hasPendingComparisonItemTranslations(result.data)
        ? "pending"
        : "settled";
    },
    onFailure: () => undefined,
  });

  return query;
}

export function useComparisonLoadQuery({
  conversationSlugId,
  enabled,
}: {
  conversationSlugId: MaybeRefOrGetter<string>;
  enabled: MaybeRefOrGetter<boolean>;
}) {
  const { loadComparisonResponse } = useComparisonApi();
  const viewerScope = useViewerQueryScope();

  return useQuery({
    queryKey: computed(() =>
      getComparisonLoadQueryKey({
        conversationSlugId: toValue(conversationSlugId),
        viewerScope: viewerScope.value,
      })
    ),
    queryFn: async ({ signal }): Promise<ComparisonLoadResponse> => {
      const response = await loadComparisonResponse({
        conversationSlugId: toValue(conversationSlugId),
        signal,
      });
      if (response.status !== "success") {
        throw new Error("Failed to load comparison state");
      }
      return response.data;
    },
    enabled: computed(() => toValue(enabled)),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

export function useRankingStatsCheckpointsQuery({
  conversationSlugId,
  requestedRankingStatsSnapshotId,
  enabled,
}: {
  conversationSlugId: MaybeRefOrGetter<string>;
  requestedRankingStatsSnapshotId: MaybeRefOrGetter<number | undefined>;
  enabled: MaybeRefOrGetter<boolean>;
}) {
  const { fetchRankingStatsCheckpoints } = useComparisonApi();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: [
      "ranking-stats-checkpoints",
      computed(() => toValue(conversationSlugId)),
    ],
    queryFn: async (): Promise<RankingStatsCheckpointsResponse> => {
      const requestedSnapshotId = toValue(requestedRankingStatsSnapshotId);
      const retainedSnapshotId = getRetainedConversationRankingStatsUpdate({
        queryClient,
        conversationSlugId: toValue(conversationSlugId),
      })?.rankingStatsSnapshotId;
      const freshnessSnapshotId =
        requestedSnapshotId === undefined
          ? retainedSnapshotId
          : retainedSnapshotId === undefined
            ? requestedSnapshotId
            : Math.max(requestedSnapshotId, retainedSnapshotId);
      const response = await fetchRankingStatsCheckpoints({
        conversationSlugId: toValue(conversationSlugId),
        requestedRankingStatsSnapshotId: freshnessSnapshotId,
      });
      if (response.status !== "success") {
        throw new Error("Failed to fetch ranking checkpoints");
      }
      return response.data;
    },
    enabled: computed(() => toValue(enabled)),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

export interface ComparisonSaveContext {
  previousState: ComparisonEngineState;
  previousCandidates: string[];
  isCurrent: () => boolean;
  isParticipationCurrent: () => boolean;
}

interface ComparisonSaveMutationParams extends Pick<
  ComparisonSaveRequest,
  "ranking" | "comparisons" | "isComplete"
> {
  context: ComparisonSaveContext;
}

export function useComparisonSaveMutation({
  conversationSlugId,
  comparisonMethod,
  onRollback,
  onBlocked,
  onNetworkError,
  onSessionRefreshError,
}: {
  conversationSlugId: MaybeRefOrGetter<string>;
  comparisonMethod: MaybeRefOrGetter<ComparisonSaveRequest["comparisonMethod"]>;
  onRollback: (context: ComparisonSaveContext) => void;
  onBlocked: (rejection: ConversationParticipationRejection) => void;
  onNetworkError: () => void;
  onSessionRefreshError: () => void;
}) {
  const { saveComparisonResponse } = useComparisonApi();
  const { ensureParticipationAuthState } = useBackendAuthApi();
  const queryClient = useQueryClient();
  const viewerScope = useViewerQueryScope();

  return useMutation({
    mutationFn: async (params: ComparisonSaveMutationParams) => {
      const response = await saveComparisonResponse({
        conversationSlugId: toValue(conversationSlugId),
        comparisonMethod: toValue(comparisonMethod),
        ranking: params.ranking,
        comparisons: params.comparisons,
        isComplete: params.isComplete,
        isCurrent: params.context.isCurrent,
      });
      if (response.status !== "success") {
        throw new Error("Failed to save comparison response");
      }
      return response.data;
    },

    onSuccess: async (data: ComparisonSaveResponse, variables) => {
      if (!variables.context.isCurrent()) return;
      if (!data.success) {
        onRollback(variables.context);
        if (variables.context.isParticipationCurrent()) onBlocked(data);
        return;
      }

      try {
        await ensureParticipationAuthState();
      } catch {
        // Persistence succeeded. A failed guest/session refresh must not roll
        // back an accepted answer or write it into an uncertain viewer scope.
        if (variables.context.isCurrent()) onSessionRefreshError();
        return;
      }
      if (!variables.context.isCurrent()) return;

      const slugId = toValue(conversationSlugId);

      // Cancel in-flight refetches to prevent read replica stale data
      // from overwriting our optimistic updates (same pattern as Polis useVoteMutation)
      await queryClient.cancelQueries({ queryKey: ["conversation", slugId] });
      await queryClient.cancelQueries({
        queryKey: ["comparison-load", slugId],
      });
      if (!variables.context.isCurrent()) return;

      // Compute count deltas (supports vote, undo, and redo)
      const comparisonDelta =
        variables.comparisons.length -
        variables.context.previousState.comparisons.length;
      const becameParticipant =
        variables.context.previousState.comparisons.length === 0 &&
        variables.comparisons.length > 0;
      const lostParticipant =
        variables.context.previousState.comparisons.length > 0 &&
        variables.comparisons.length === 0;
      const participantDelta = becameParticipant ? 1 : lostParticipant ? -1 : 0;

      // Optimistically update conversation counts
      updateConversationQueryCache({
        queryClient,
        conversationSlugId: slugId,
        updateConversation: (old) => ({
          ...old,
          metadata: {
            ...old.metadata,
            voteCount: old.metadata.voteCount + comparisonDelta,
            totalVoteCount: old.metadata.totalVoteCount + comparisonDelta,
            ...(participantDelta !== 0
              ? {
                  participantCount:
                    old.metadata.participantCount + participantDelta,
                  totalParticipantCount:
                    old.metadata.totalParticipantCount + participantDelta,
                }
              : {}),
          },
        }),
      });

      // Write saved state directly to cache instead of invalidating
      // (avoids read replica lag returning stale data before buffer flushes)
      queryClient.setQueryData<ComparisonLoadResponse>(
        getComparisonLoadQueryKey({
          conversationSlugId: slugId,
          viewerScope: viewerScope.value,
        }),
        (old) => ({
          ranking: variables.ranking,
          comparisons: variables.comparisons.map((c) => ({
            best: c.best,
            worst: c.worst,
            set: c.set,
          })),
          isComplete: variables.isComplete,
          candidateSets: data.candidateSets,
          perUserScores: old?.perUserScores ?? null,
        })
      );

      // Note: We don't invalidate the conversation query here to avoid
      // read replica lag overwriting the optimistic counts above.
      // The conversation query refreshes naturally on analysis tab switch
      // (via the route watcher in useConversationParentState).
    },

    onError: (_error, variables) => {
      if (!variables.context.isCurrent()) return;
      onRollback(variables.context);
      onNetworkError();
    },

    retry: false,
  });
}
