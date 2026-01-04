import { useQuery } from "@tanstack/vue-query";
import { computed, type MaybeRefOrGetter, toValue } from "vue";

import { useBackendPostApi } from "./post";

export function useConversationQuery({
  conversationSlugId,
  loadUserPollResponse = false,
  enabled = true,
}: {
  conversationSlugId: MaybeRefOrGetter<string>;
  loadUserPollResponse?: boolean;
  enabled?: MaybeRefOrGetter<boolean>;
}) {
  const { fetchPostBySlugId } = useBackendPostApi();

  return useQuery({
    queryKey: [
      "conversation",
      computed(() => toValue(conversationSlugId)),
      loadUserPollResponse,
    ],
    queryFn: async () => {
      const slugId = toValue(conversationSlugId);
      const result = await fetchPostBySlugId(slugId, loadUserPollResponse);
      if (result === null) {
        throw new Error("Conversation not found");
      }
      return result;
    },
    enabled: computed(
      () => toValue(enabled) && toValue(conversationSlugId).length > 0
    ),
    staleTime: 60 * 1000,
    retry: false,
  });
}
