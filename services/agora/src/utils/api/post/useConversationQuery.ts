import {
  type QueryClient,
  useQuery,
  useQueryClient,
} from "@tanstack/vue-query";
import { storeToRefs } from "pinia";
import type { ExtendedConversation } from "src/shared/types/zod";
import { useAuthenticationStore } from "src/stores/authentication";
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
  const { fetchPostBySlugId } = useBackendPostApi();
  const { isGuestOrLoggedIn } = storeToRefs(useAuthenticationStore());
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["conversation", computed(() => toValue(conversationSlugId))],
    queryFn: async () => {
      const slugId = toValue(conversationSlugId);
      const fetchedConversation = await fetchPostBySlugId(
        slugId,
        isGuestOrLoggedIn.value
      );
      const cachedConversation = queryClient.getQueryData<ExtendedConversation>([
        "conversation",
        slugId,
      ]);

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
