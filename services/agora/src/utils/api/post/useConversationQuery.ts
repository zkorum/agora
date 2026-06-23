import {
  type QueryClient,
  useQuery,
  useQueryClient,
} from "@tanstack/vue-query";
import { storeToRefs } from "pinia";
import type { ConversationContentFetchResponse } from "src/shared/types/dto";
import type { ExtendedConversation } from "src/shared/types/zod";
import { useAuthenticationStore } from "src/stores/authentication";
import { useLanguageStore } from "src/stores/language";
import {
  getConversationContentQueryKey,
  getConversationDisplayContentQueryKey,
} from "src/utils/api/contentTranslation/useContentTranslationQueries";
import { computed, type MaybeRefOrGetter, toValue } from "vue";

import { useBackendPostApi } from "./post";

function preserveNewerSnapshotMetadata({
  fetchedConversation,
  cachedConversation,
}: {
  fetchedConversation: ExtendedConversation;
  cachedConversation: ExtendedConversation | undefined;
}): ExtendedConversation {
  const cachedSnapshotId =
    cachedConversation?.metadata.conversationViewSnapshotId;
  const fetchedSnapshotId = fetchedConversation.metadata.conversationViewSnapshotId;

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
    metadata: {
      ...fetchedConversation.metadata,
      conversationViewSnapshotId: cachedSnapshotId,
      opinionCount: cachedConversation.metadata.opinionCount,
      voteCount: cachedConversation.metadata.voteCount,
      participantCount: cachedConversation.metadata.participantCount,
      totalOpinionCount: cachedConversation.metadata.totalOpinionCount,
      totalVoteCount: cachedConversation.metadata.totalVoteCount,
      totalParticipantCount: cachedConversation.metadata.totalParticipantCount,
      moderatedOpinionCount: cachedConversation.metadata.moderatedOpinionCount,
      hiddenOpinionCount: cachedConversation.metadata.hiddenOpinionCount,
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
    conversation: ExtendedConversation
  ) => ExtendedConversation;
  fallbackConversation?: ExtendedConversation;
}): void {
  const queryKey = ["conversation", conversationSlugId];

  queryClient.setQueriesData<ExtendedConversation>({ queryKey }, (oldData) => {
    if (!oldData) {
      return oldData;
    }

    return updateConversation(oldData);
  });

  if (
    fallbackConversation?.metadata.conversationSlugId === conversationSlugId
  ) {
    queryClient.setQueryData(
      queryKey,
      updateConversation(fallbackConversation)
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
      const fetchedConversation = await fetchConversationBySlugIdWithDisplayContent({
        postSlugId: slugId,
        loadPersonalizedData: isGuestOrLoggedIn.value,
      });
      const cachedConversation = queryClient.getQueryData<ExtendedConversation>([
        "conversation",
        slugId,
      ]);
      queryClient.setQueryData<ConversationContentFetchResponse>(
        getConversationDisplayContentQueryKey({
          conversationSlugId: slugId,
          targetLanguageCode: displayLanguage.value,
          spokenLanguages: spokenLanguages.value,
        }),
        fetchedConversation.displayContent
      );
      if (fetchedConversation.displayContent.status === "available") {
        queryClient.setQueryData<ConversationContentFetchResponse>(
          getConversationContentQueryKey({
            conversationSlugId: slugId,
            contentId: fetchedConversation.displayContent.contentId,
            mode: fetchedConversation.displayContent.mode,
            targetLanguageCode: displayLanguage.value,
            spokenLanguages: spokenLanguages.value,
          }),
          fetchedConversation.displayContent
        );
      }

      return preserveNewerSnapshotMetadata({
        fetchedConversation: fetchedConversation.conversationData,
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
