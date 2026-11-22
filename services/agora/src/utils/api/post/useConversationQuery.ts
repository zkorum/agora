import {
  type QueryClient,
  useQuery,
  useQueryClient,
} from "@tanstack/vue-query";
import { storeToRefs } from "pinia";
import type {
  ConversationContentFetchResponse,
  GetConversationResponse,
  SSEConversationRankingStatsUpdatedData,
} from "src/shared/types/dto";
import type { ExtendedConversation } from "src/shared/types/zod";
import { useLanguageStore } from "src/stores/language";
import {
  getConversationContentQueryKey,
  getConversationDisplayContentQueryKey,
} from "src/utils/api/contentTranslation/conversationContentQuery";
import { getConversationQueryKey } from "src/utils/query/conversationQueryKeys";
import {
  isQueryForViewerScope,
  useViewerQueryScope,
  type ViewerQueryScope,
} from "src/utils/query/viewerScope";
import {
  computed,
  type MaybeRefOrGetter,
  onActivated,
  onDeactivated,
  ref,
  toValue,
} from "vue";

import { useBackendPostApi } from "./post";
import { reconcileQvCalculationLifecycle } from "./qvCalculationState";
import { reconcileQvStats } from "./qvStatsUpdate";
import {
  clearRetainedConversationRankingStatsUpdate,
  compareComparisonCloseSelectionVersions,
  getRetainedConversationRankingStatsUpdate,
} from "./rankingStatsUpdate";

type ReadyConversationResponse = Extract<
  GetConversationResponse,
  { status: "ready" }
>;
export type ConversationDetail = Omit<ReadyConversationResponse, "status">;
export type ConversationDetailData =
  ReadyConversationResponse["conversationData"];

type ConversationCacheData = ExtendedConversation | ConversationDetailData;
type ConversationCacheEntry = ExtendedConversation | ConversationDetail;
type ConversationCacheChanges = {
  metadata?: ConversationDetailData["metadata"];
  interaction?: ConversationDetailData["interaction"];
  payload?: ExtendedConversation["payload"];
};

export function applyConversationRankingStatsUpdate(params: {
  conversation: ExtendedConversation;
  data: SSEConversationRankingStatsUpdatedData;
}): ExtendedConversation;
export function applyConversationRankingStatsUpdate(params: {
  conversation: ConversationDetailData;
  data: SSEConversationRankingStatsUpdatedData;
}): ConversationDetailData;
export function applyConversationRankingStatsUpdate({
  conversation,
  data,
}: {
  conversation: ConversationCacheData;
  data: SSEConversationRankingStatsUpdatedData;
}): ConversationCacheData {
  if (
    conversation.metadata.conversationType !== "prioritizing" ||
    conversation.metadata.prioritizationType !== "comparisons"
  ) {
    return conversation;
  }
  const previousSnapshotId = conversation.metadata.rankingStatsSnapshotId;
  const previousVersion = conversation.metadata.comparisonCloseSelectionVersion;
  const incomingVersion = data.comparisonCloseSelectionVersion;
  if (data.closedSelectionChanged === true && !conversation.metadata.isClosed) {
    // A publication for the previous close must not undo reopening.
    return conversation;
  }
  if (previousVersion !== undefined && incomingVersion !== undefined) {
    if (
      compareComparisonCloseSelectionVersions({
        left: incomingVersion,
        right: previousVersion,
      }) <= 0
    )
      return conversation;
  } else {
    if (previousVersion !== undefined && data.isClosed) return conversation;
    if (
      previousSnapshotId !== undefined &&
      data.rankingStatsSnapshotId <= previousSnapshotId
    )
      return conversation;
  }

  return {
    ...conversation,
    metadata: {
      ...conversation.metadata,
      rankingStatsSnapshotId: data.rankingStatsSnapshotId,
      comparisonCloseSelectionVersion: incomingVersion ?? previousVersion,
      opinionCount: data.opinionCount,
      voteCount: data.voteCount,
      participantCount: data.participantCount,
      totalOpinionCount: data.totalOpinionCount,
      totalVoteCount: data.totalVoteCount,
      totalParticipantCount: data.totalParticipantCount,
      moderatedOpinionCount: data.moderatedOpinionCount,
      hiddenOpinionCount: data.hiddenOpinionCount,
      isClosed: data.isClosed,
      isFinalizing: false,
    },
  };
}

function isConversationDetail(
  conversation: ConversationCacheEntry
): conversation is ConversationDetail {
  return "conversationData" in conversation && "displayContent" in conversation;
}

function preserveNewerSnapshotMetadata({
  fetchedConversation,
  cachedConversation,
  cachedConversationBeforeFetch,
}: {
  fetchedConversation: ConversationDetail;
  cachedConversation: ConversationDetail | undefined;
  cachedConversationBeforeFetch: ConversationDetail | undefined;
}): ConversationDetail {
  if (cachedConversation === undefined) {
    return fetchedConversation;
  }

  const cachedMetadata = cachedConversation.conversationData.metadata;
  const fetchedMetadata = fetchedConversation.conversationData.metadata;
  if (
    cachedMetadata.conversationType === "prioritizing" &&
    cachedMetadata.prioritizationType === "qv" &&
    fetchedMetadata.conversationType === "prioritizing" &&
    fetchedMetadata.prioritizationType === "qv" &&
    cachedMetadata.qvGeneration !== undefined &&
    (fetchedMetadata.qvGeneration === undefined ||
      cachedMetadata.qvGeneration > fetchedMetadata.qvGeneration)
  ) {
    return {
      ...fetchedConversation,
      conversationData: {
        ...fetchedConversation.conversationData,
        metadata: {
          ...fetchedMetadata,
          qvGeneration: cachedMetadata.qvGeneration,
          isClosed: cachedMetadata.isClosed,
          isFinalizing: cachedMetadata.isFinalizing,
        },
      },
    };
  }
  if (
    cachedMetadata.conversationType === "prioritizing" &&
    cachedMetadata.prioritizationType === "comparisons" &&
    fetchedMetadata.conversationType === "prioritizing" &&
    fetchedMetadata.prioritizationType === "comparisons"
  ) {
    const cachedSnapshotId = cachedMetadata.rankingStatsSnapshotId;
    const fetchedSnapshotId = fetchedMetadata.rankingStatsSnapshotId;
    const cachedVersion = cachedMetadata.comparisonCloseSelectionVersion;
    const fetchedVersion = fetchedMetadata.comparisonCloseSelectionVersion;
    const acceptPublication =
      cachedSnapshotId === undefined ||
      (fetchedSnapshotId !== undefined &&
        (fetchedSnapshotId > cachedSnapshotId ||
          (fetchedSnapshotId === cachedSnapshotId &&
            cachedConversation === cachedConversationBeforeFetch)));
    const acceptFetched = (() => {
      if (cachedVersion === undefined) return acceptPublication;
      if (fetchedVersion === undefined)
        return !fetchedMetadata.isClosed && acceptPublication;
      if (
        !cachedMetadata.isClosed &&
        cachedVersion.closeId === fetchedVersion.closeId
      )
        return false;
      const order = compareComparisonCloseSelectionVersions({
        left: fetchedVersion,
        right: cachedVersion,
      });
      return (
        order > 0 ||
        (order === 0 && cachedConversation === cachedConversationBeforeFetch)
      );
    })();
    if (acceptFetched) {
      // Keep the last close watermark on an open cache entry until a later
      // close replaces it. A delayed read of that old close cannot reopen it.
      if (cachedVersion === undefined || fetchedVersion !== undefined)
        return fetchedConversation;
      return {
        ...fetchedConversation,
        conversationData: {
          ...fetchedConversation.conversationData,
          metadata: {
            ...fetchedMetadata,
            comparisonCloseSelectionVersion: cachedVersion,
          },
        },
      };
    }

    return {
      ...fetchedConversation,
      conversationData: {
        ...fetchedConversation.conversationData,
        metadata: {
          ...fetchedMetadata,
          rankingStatsSnapshotId: cachedSnapshotId,
          comparisonCloseSelectionVersion: cachedVersion,
          opinionCount: cachedMetadata.opinionCount,
          voteCount: cachedMetadata.voteCount,
          participantCount: cachedMetadata.participantCount,
          totalOpinionCount: cachedMetadata.totalOpinionCount,
          totalVoteCount: cachedMetadata.totalVoteCount,
          totalParticipantCount: cachedMetadata.totalParticipantCount,
          moderatedOpinionCount: cachedMetadata.moderatedOpinionCount,
          hiddenOpinionCount: cachedMetadata.hiddenOpinionCount,
          isClosed: cachedMetadata.isClosed,
          isFinalizing: cachedMetadata.isFinalizing,
        },
      },
    };
  }

  if (
    cachedMetadata.conversationType !== "polis" ||
    fetchedMetadata.conversationType !== "polis"
  ) {
    return fetchedConversation;
  }

  const cachedSnapshotId = cachedMetadata.conversationViewSnapshotId;
  const fetchedSnapshotId = fetchedMetadata.conversationViewSnapshotId;

  if (
    cachedSnapshotId === undefined ||
    fetchedSnapshotId === undefined ||
    fetchedSnapshotId >= cachedSnapshotId
  ) {
    return fetchedConversation;
  }

  return {
    ...fetchedConversation,
    conversationData: {
      ...fetchedConversation.conversationData,
      metadata: {
        ...fetchedMetadata,
        conversationViewSnapshotId: cachedSnapshotId,
        opinionCount: cachedMetadata.opinionCount,
        voteCount: cachedMetadata.voteCount,
        participantCount: cachedMetadata.participantCount,
        totalOpinionCount: cachedMetadata.totalOpinionCount,
        totalVoteCount: cachedMetadata.totalVoteCount,
        totalParticipantCount: cachedMetadata.totalParticipantCount,
        moderatedOpinionCount: cachedMetadata.moderatedOpinionCount,
        hiddenOpinionCount: cachedMetadata.hiddenOpinionCount,
        isClosed: cachedMetadata.isClosed,
        isFinalizing: cachedMetadata.isFinalizing,
      },
    },
  };
}

function mergeRetainedRankingStatsUpdate({
  conversation,
  update,
}: {
  conversation: ConversationDetail;
  update: SSEConversationRankingStatsUpdatedData | undefined;
}): ConversationDetail {
  const metadata = conversation.conversationData.metadata;
  if (
    update === undefined ||
    metadata.conversationType !== "prioritizing" ||
    metadata.prioritizationType !== "comparisons"
  ) {
    return conversation;
  }

  return {
    ...conversation,
    conversationData: applyConversationRankingStatsUpdate({
      conversation: conversation.conversationData,
      data: update,
    }),
  };
}

export function updateConversationQueryCache({
  queryClient,
  conversationSlugId,
  updateConversation,
  fallbackConversation,
  viewerScope,
}: {
  queryClient: QueryClient;
  conversationSlugId: string;
  updateConversation: (
    conversation: ConversationCacheData
  ) => ConversationCacheChanges;
  fallbackConversation?: ConversationCacheEntry;
  viewerScope?: ViewerQueryScope;
}): void {
  const queryKey = ["conversation", conversationSlugId];

  const updateCacheEntry = (
    conversation: ConversationCacheEntry
  ): ConversationCacheEntry => {
    if (isConversationDetail(conversation)) {
      const changes = updateConversation(conversation.conversationData);
      return {
        ...conversation,
        conversationData: {
          ...conversation.conversationData,
          metadata: changes.metadata ?? conversation.conversationData.metadata,
          interaction:
            changes.interaction ?? conversation.conversationData.interaction,
        },
      };
    }

    const changes = updateConversation(conversation);
    return {
      ...conversation,
      metadata: changes.metadata ?? conversation.metadata,
      interaction: changes.interaction ?? conversation.interaction,
      payload: changes.payload ?? conversation.payload,
    };
  };

  queryClient.setQueriesData<ConversationCacheEntry>(
    {
      queryKey,
      predicate: (query) =>
        viewerScope === undefined ||
        isQueryForViewerScope({ queryKey: query.queryKey, viewerScope }),
    },
    (oldData) => {
      if (!oldData) {
        return oldData;
      }

      return updateCacheEntry(oldData);
    }
  );

  if (
    fallbackConversation !== undefined &&
    (isConversationDetail(fallbackConversation)
      ? fallbackConversation.conversationData.metadata.conversationSlugId
      : fallbackConversation.metadata.conversationSlugId) === conversationSlugId
  ) {
    queryClient.setQueryData(queryKey, updateCacheEntry(fallbackConversation));
  }
}

export function useConversationQuery({
  conversationSlugId,
  enabled = true,
}: {
  conversationSlugId: MaybeRefOrGetter<string>;
  enabled?: MaybeRefOrGetter<boolean>;
}) {
  const { fetchConversationBySlugIdWithDisplayContent } = useBackendPostApi();
  const { displayLanguage, spokenLanguages } = storeToRefs(useLanguageStore());
  const queryClient = useQueryClient();
  const viewerScope = useViewerQueryScope();
  const isActive = ref(true);
  onActivated(() => {
    isActive.value = true;
  });
  onDeactivated(() => {
    isActive.value = false;
  });
  const sortedSpokenLanguages = computed(() =>
    [...spokenLanguages.value].sort()
  );

  return useQuery({
    queryKey: computed(() =>
      getConversationQueryKey({
        conversationSlugId: toValue(conversationSlugId),
        displayLanguage: displayLanguage.value,
        spokenLanguages: sortedSpokenLanguages.value,
        viewerScope: viewerScope.value,
      })
    ),
    queryFn: async ({ queryKey, signal }) => {
      const [
        ,
        slugId,
        targetLanguageCode,
        requestedSpokenLanguages,
        requestedViewerScope,
      ] = queryKey;
      const cachedConversationBeforeFetch =
        queryClient.getQueryData<ConversationDetail>(queryKey);
      const fetchedConversation =
        await fetchConversationBySlugIdWithDisplayContent({
          postSlugId: slugId,
          loadPersonalizedData: requestedViewerScope.userId !== undefined,
          displayLanguage: targetLanguageCode,
          signal,
        });
      if (signal.aborted) {
        throw new DOMException(
          "Conversation request was aborted",
          "AbortError"
        );
      }
      const cachedConversation =
        queryClient.getQueryData<ConversationDetail>(queryKey);
      const fetchedMetadata = fetchedConversation.conversationData.metadata;
      if (
        fetchedMetadata.conversationType === "prioritizing" &&
        fetchedMetadata.prioritizationType === "comparisons" &&
        fetchedMetadata.rankingStatsSnapshotId !== undefined
      ) {
        clearRetainedConversationRankingStatsUpdate({
          queryClient,
          conversationSlugId: slugId,
          throughSnapshotId: fetchedMetadata.rankingStatsSnapshotId,
        });
      }
      queryClient.setQueryData<ConversationContentFetchResponse>(
        getConversationDisplayContentQueryKey({
          conversationSlugId: slugId,
          targetLanguageCode,
          spokenLanguages: requestedSpokenLanguages,
        }),
        fetchedConversation.displayContent
      );
      if (fetchedConversation.displayContent.status === "available") {
        queryClient.setQueryData<ConversationContentFetchResponse>(
          getConversationContentQueryKey({
            conversationSlugId: slugId,
            sourceVersion: fetchedConversation.displayContent.sourceVersion,
            mode: fetchedConversation.displayContent.mode,
            targetLanguageCode,
            spokenLanguages: requestedSpokenLanguages,
          }),
          fetchedConversation.displayContent
        );
      }

      const conversationWithPreservedCache = preserveNewerSnapshotMetadata({
        fetchedConversation,
        cachedConversation,
        cachedConversationBeforeFetch,
      });
      const reconciled = mergeRetainedRankingStatsUpdate({
        conversation: conversationWithPreservedCache,
        update: getRetainedConversationRankingStatsUpdate({
          queryClient,
          conversationSlugId: slugId,
        }),
      });
      if (cachedConversation !== undefined) {
        reconcileQvStats({
          queryClient,
          conversation: cachedConversation.conversationData,
        });
      }
      return {
        ...reconciled,
        conversationData: reconcileQvCalculationLifecycle({
          queryClient,
          conversation: reconcileQvStats({
            queryClient,
            conversation: reconciled.conversationData,
          }),
        }),
      };
    },
    enabled: computed(() => toValue(enabled) && isActive.value),
    placeholderData: (previousData, previousQuery) =>
      previousQuery?.queryKey[1] === toValue(conversationSlugId) &&
      isQueryForViewerScope({
        queryKey: previousQuery.queryKey,
        viewerScope: viewerScope.value,
      })
        ? previousData
        : undefined,
    staleTime: 60 * 1000,
    refetchInterval: (query) =>
      query.state.data?.conversationData.metadata.isFinalizing === true
        ? 3000
        : false,
    refetchIntervalInBackground: false,
    retry: false,
  });
}

export function useInvalidateConversationQuery() {
  const queryClient = useQueryClient();

  return {
    invalidateConversation: (conversationSlugId: string) => {
      void queryClient.invalidateQueries({
        queryKey: ["conversation", conversationSlugId],
      });
    },
  };
}
