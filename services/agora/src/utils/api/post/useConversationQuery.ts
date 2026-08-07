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
import {
  zodExtendedConversationData,
  zodExtendedConversationDisplayData,
} from "src/shared/types/zod";
import { useAuthenticationStore } from "src/stores/authentication";
import { useLanguageStore } from "src/stores/language";
import {
  getConversationContentQueryKey,
  getConversationDisplayContentQueryKey,
} from "src/utils/api/contentTranslation/conversationContentQuery";
import { computed, type MaybeRefOrGetter, toValue } from "vue";

import { useBackendPostApi } from "./post";
import {
  clearRetainedConversationRankingStatsUpdate,
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

export function applyConversationRankingStatsUpdate({
  conversation,
  data,
}: {
  conversation: ConversationCacheData;
  data: SSEConversationRankingStatsUpdatedData;
}): ConversationCacheData {
  if (conversation.metadata.conversationType !== "ranking") {
    return conversation;
  }
  const previousSnapshotId = conversation.metadata.rankingStatsSnapshotId;
  if (
    previousSnapshotId !== undefined &&
    data.rankingStatsSnapshotId <= previousSnapshotId
  ) {
    return conversation;
  }

  return {
    ...conversation,
    metadata: {
      ...conversation.metadata,
      rankingStatsSnapshotId: data.rankingStatsSnapshotId,
      opinionCount: data.opinionCount,
      voteCount: data.voteCount,
      participantCount: data.participantCount,
      totalOpinionCount: data.totalOpinionCount,
      totalVoteCount: data.totalVoteCount,
      totalParticipantCount: data.totalParticipantCount,
      moderatedOpinionCount: data.moderatedOpinionCount,
      hiddenOpinionCount: data.hiddenOpinionCount,
      isClosed: data.isClosed,
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
    cachedMetadata.conversationType === "ranking" &&
    fetchedMetadata.conversationType === "ranking"
  ) {
    const cachedSnapshotId = cachedMetadata.rankingStatsSnapshotId;
    const fetchedSnapshotId = fetchedMetadata.rankingStatsSnapshotId;
    if (
      cachedSnapshotId === undefined ||
      (fetchedSnapshotId !== undefined &&
        (fetchedSnapshotId > cachedSnapshotId ||
          (fetchedSnapshotId === cachedSnapshotId &&
            cachedConversation === cachedConversationBeforeFetch)))
    ) {
      return fetchedConversation;
    }

    return {
      ...fetchedConversation,
      conversationData: {
        ...fetchedConversation.conversationData,
        metadata: {
          ...fetchedMetadata,
          rankingStatsSnapshotId: cachedSnapshotId,
          opinionCount: cachedMetadata.opinionCount,
          voteCount: cachedMetadata.voteCount,
          participantCount: cachedMetadata.participantCount,
          totalOpinionCount: cachedMetadata.totalOpinionCount,
          totalVoteCount: cachedMetadata.totalVoteCount,
          totalParticipantCount: cachedMetadata.totalParticipantCount,
          moderatedOpinionCount: cachedMetadata.moderatedOpinionCount,
          hiddenOpinionCount: cachedMetadata.hiddenOpinionCount,
          isClosed: cachedMetadata.isClosed,
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
    metadata.conversationType !== "ranking" ||
    (metadata.rankingStatsSnapshotId !== undefined &&
      metadata.rankingStatsSnapshotId >= update.rankingStatsSnapshotId)
  ) {
    return conversation;
  }

  return {
    ...conversation,
    conversationData: zodExtendedConversationDisplayData.parse(
      applyConversationRankingStatsUpdate({
        conversation: conversation.conversationData,
        data: update,
      })
    ),
  };
}

export function updateConversationQueryCache({
  queryClient,
  conversationSlugId,
  updateConversation,
  fallbackConversation,
}: {
  queryClient: QueryClient;
  conversationSlugId: string;
  updateConversation: (
    conversation: ConversationCacheData
  ) => ConversationCacheData;
  fallbackConversation?: ConversationCacheEntry;
}): void {
  const queryKey = ["conversation", conversationSlugId];

  const updateCacheEntry = (
    conversation: ConversationCacheEntry
  ): ConversationCacheEntry => {
    if (isConversationDetail(conversation)) {
      return {
        ...conversation,
        conversationData: zodExtendedConversationDisplayData.parse(
          updateConversation(conversation.conversationData)
        ),
      };
    }

    return zodExtendedConversationData.parse(updateConversation(conversation));
  };

  queryClient.setQueriesData<ConversationCacheEntry>(
    { queryKey },
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
  const { isGuestOrLoggedIn } = storeToRefs(useAuthenticationStore());
  const { displayLanguage, spokenLanguages } = storeToRefs(useLanguageStore());
  const queryClient = useQueryClient();
  const sortedSpokenLanguages = computed(() =>
    [...spokenLanguages.value].sort()
  );

  return useQuery({
    queryKey: [
      "conversation",
      computed(() => toValue(conversationSlugId)),
      displayLanguage,
      sortedSpokenLanguages,
    ],
    queryFn: async ({ queryKey }) => {
      const slugId = toValue(conversationSlugId);
      const cachedConversationBeforeFetch =
        queryClient.getQueryData<ConversationDetail>(queryKey);
      const targetLanguageCode = displayLanguage.value;
      const requestedSpokenLanguages = [...spokenLanguages.value];
      const fetchedConversation =
        await fetchConversationBySlugIdWithDisplayContent({
          postSlugId: slugId,
          loadPersonalizedData: isGuestOrLoggedIn.value,
        });
      const cachedConversation =
        queryClient.getQueryData<ConversationDetail>(queryKey);
      const fetchedMetadata = fetchedConversation.conversationData.metadata;
      if (
        fetchedMetadata.conversationType === "ranking" &&
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
      return mergeRetainedRankingStatsUpdate({
        conversation: conversationWithPreservedCache,
        update: getRetainedConversationRankingStatsUpdate({
          queryClient,
          conversationSlugId: slugId,
        }),
      });
    },
    enabled: computed(() => toValue(enabled)),
    staleTime: 60 * 1000,
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
