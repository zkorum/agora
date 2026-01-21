import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { storeToRefs } from "pinia";
import { useAuthenticationStore } from "src/stores/authentication";
import { computed, type MaybeRefOrGetter, toValue } from "vue";

import { useBackendPostApi } from "./post";

export function useConversationQuery({
  conversationSlugId,
  enabled = true,
}: {
  conversationSlugId: MaybeRefOrGetter<string>;
  enabled?: MaybeRefOrGetter<boolean>;
}) {
  const { fetchPostBySlugId } = useBackendPostApi();
  const { isGuestOrLoggedIn } = storeToRefs(useAuthenticationStore());

  return useQuery({
    queryKey: [
      "conversation",
      computed(() => toValue(conversationSlugId)),
    ],
    queryFn: async () => {
      const slugId = toValue(conversationSlugId);
      // Auto-detect auth state: fetch personalized data when authenticated
      const result = await fetchPostBySlugId(slugId, isGuestOrLoggedIn.value);
      if (result === null) {
        throw new Error("Conversation not found");
      }
      return result;
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
