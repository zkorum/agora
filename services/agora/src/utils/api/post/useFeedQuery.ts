import {
  useQuery,
  useQueryClient,
} from "@tanstack/vue-query";
import { storeToRefs } from "pinia";
import { useAuthenticationStore } from "src/stores/authentication";
import { useHomeFeedStore } from "src/stores/homeFeed";
import { computed, type MaybeRefOrGetter, toValue } from "vue";

import { useBackendPostApi } from "./post";

export function useFeedQuery({
  enabled = true,
}: {
  enabled?: MaybeRefOrGetter<boolean>;
} = {}) {
  const { fetchRecentPost } = useBackendPostApi();
  const { isGuestOrLoggedIn } = storeToRefs(useAuthenticationStore());
  const { currentHomeFeedTab } = storeToRefs(useHomeFeedStore());

  return useQuery({
    queryKey: ["feed", computed(() => currentHomeFeedTab.value)],
    queryFn: async () => {
      const response = await fetchRecentPost({
        loadUserPollData: isGuestOrLoggedIn.value,
        sortAlgorithm: currentHomeFeedTab.value,
      });
      if (response.status !== "success") {
        throw new Error("Failed to fetch feed");
      }
      return response.data;
    },
    enabled: computed(() => toValue(enabled)),
    staleTime: Infinity,
  });
}

export function useInvalidateFeedQuery() {
  const queryClient = useQueryClient();

  return {
    invalidateFeed: () => {
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
    invalidateFeedTab: (tab: string) => {
      void queryClient.invalidateQueries({ queryKey: ["feed", tab] });
    },
  };
}
