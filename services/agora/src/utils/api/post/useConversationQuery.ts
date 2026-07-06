import {
  type QueryClient,
  useQuery,
  useQueryClient,
} from "@tanstack/vue-query";
import { storeToRefs } from "pinia";
import type {
  ConversationContentFetchResponse,
  GetConversationResponse,
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
} from "src/utils/api/contentTranslation/useContentTranslationQueries";
import { computed, type MaybeRefOrGetter, toValue } from "vue";

import { useBackendPostApi } from "./post";

type ReadyConversationResponse = Extract<
  GetConversationResponse,
  { status: "ready" }
>;
export type ConversationDetail = Omit<ReadyConversationResponse, "status">;
export type ConversationDetailData = ReadyConversationResponse["conversationData"];

type ConversationCacheData = ExtendedConversation | ConversationDetailData;
type ConversationCacheEntry = ExtendedConversation | ConversationDetail;

function isConversationDetail(
  conversation: ConversationCacheEntry
): conversation is ConversationDetail {
  return "conversationData" in conversation && "displayContent" in conversation;
}

function preserveNewerSnapshotMetadata({
  fetchedConversation,
  cachedConversation,
}: {
  fetchedConversation: ConversationDetail;
  cachedConversation: ConversationDetail | undefined;
}): ConversationDetail {
  const cachedSnapshotId =
    cachedConversation?.conversationData.metadata.conversationViewSnapshotId;
  const fetchedSnapshotId =
    fetchedConversation.conversationData.metadata.conversationViewSnapshotId;

  if (
    cachedConversation === undefined ||
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
        ...fetchedConversation.conversationData.metadata,
        conversationViewSnapshotId: cachedSnapshotId,
        opinionCount: cachedConversation.conversationData.metadata.opinionCount,
        voteCount: cachedConversation.conversationData.metadata.voteCount,
        participantCount:
          cachedConversation.conversationData.metadata.participantCount,
        totalOpinionCount:
          cachedConversation.conversationData.metadata.totalOpinionCount,
        totalVoteCount:
          cachedConversation.conversationData.metadata.totalVoteCount,
        totalParticipantCount:
          cachedConversation.conversationData.metadata.totalParticipantCount,
        moderatedOpinionCount:
          cachedConversation.conversationData.metadata.moderatedOpinionCount,
        hiddenOpinionCount:
          cachedConversation.conversationData.metadata.hiddenOpinionCount,
      },
    },
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

  queryClient.setQueriesData<ConversationCacheEntry>({ queryKey }, (oldData) => {
    if (!oldData) {
      return oldData;
    }

    return updateCacheEntry(oldData);
  });

  if (
    fallbackConversation !== undefined &&
    (isConversationDetail(fallbackConversation)
      ? fallbackConversation.conversationData.metadata.conversationSlugId
      : fallbackConversation.metadata.conversationSlugId) === conversationSlugId
  ) {
    queryClient.setQueryData(
      queryKey,
      updateCacheEntry(fallbackConversation)
    );
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
  const sortedSpokenLanguages = computed(() => [...spokenLanguages.value].sort());

  return useQuery({
    queryKey: [
      "conversation",
      computed(() => toValue(conversationSlugId)),
      displayLanguage,
      sortedSpokenLanguages,
    ],
    queryFn: async () => {
      const slugId = toValue(conversationSlugId);
      const targetLanguageCode = displayLanguage.value;
      const requestedSpokenLanguages = [...spokenLanguages.value];
      const fetchedConversation = await fetchConversationBySlugIdWithDisplayContent({
        postSlugId: slugId,
        loadPersonalizedData: isGuestOrLoggedIn.value,
      });
      const cachedConversation = queryClient.getQueryData<ConversationDetail>([
        "conversation",
        slugId,
      ]);
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

      return preserveNewerSnapshotMetadata({
        fetchedConversation,
        cachedConversation,
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
