import {
  hashKey,
  type InfiniteData,
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/vue-query";
import { storeToRefs } from "pinia";
import type { FetchFeedRequest, FetchFeedResponse } from "src/shared/types/dto";
import type { FeedSortAlgorithm } from "src/shared/types/zod";
import { useHomeFeedStore } from "src/stores/homeFeed";
import { useLanguageStore } from "src/stores/language";
import { useViewerQueryScope } from "src/utils/query/viewerScope";
import { useQvStatsSubscriptions } from "src/utils/sse/qvStatsSubscriptions";
import {
  computed,
  type MaybeRefOrGetter,
  onActivated,
  toValue,
  watch,
} from "vue";

import { initialFeedRequest, nextFeedRequest } from "./feedPageBoundary";
import { type FeedQueryKey, getFeedQueryKey } from "./feedQueryKey";
import { useBackendPostApi } from "./post";
import { reconcileQvCalculationLifecycle } from "./qvCalculationState";
import { reconcileQvStats } from "./qvStatsUpdate";

export function useFeedQuery({
  enabled = true,
}: { enabled?: MaybeRefOrGetter<boolean> } = {}) {
  const { fetchFeedPage } = useBackendPostApi();
  const feedStore = useHomeFeedStore();
  const { currentHomeFeedTab } = storeToRefs(feedStore);
  const { displayLanguage, spokenLanguages } = storeToRefs(useLanguageStore());
  const queryClient = useQueryClient();
  const viewerScope = useViewerQueryScope();
  const queryKey = computed(() =>
    getFeedQueryKey({
      sortAlgorithm: currentHomeFeedTab.value,
      displayLanguage: displayLanguage.value,
      spokenLanguages: spokenLanguages.value,
      viewerScope: viewerScope.value,
    })
  );

  const query = useInfiniteQuery<
    FetchFeedResponse,
    Error,
    InfiniteData<FetchFeedResponse, FetchFeedRequest>,
    FeedQueryKey,
    FetchFeedRequest
  >({
    queryKey,
    queryFn: async ({ pageParam, signal, queryKey: requestKey }) => {
      const page = await fetchFeedPage({
        request: pageParam,
        loadPersonalizedData: requestKey[4].userId !== undefined,
        signal,
      });
      if (
        pageParam.cursor === null &&
        !signal.aborted &&
        hashKey(requestKey) === hashKey(queryKey.value)
      ) {
        feedStore.confirmFeedHead({
          tab: page.sortAlgorithm,
          slugIds: page.feedItemList.map(
            (item) => item.conversationData.metadata.conversationSlugId
          ),
        });
      }
      return {
        ...page,
        feedItemList: page.feedItemList.map((item) => ({
          ...item,
          conversationData: reconcileQvCalculationLifecycle({
            queryClient,
            conversation: reconcileQvStats({
              queryClient,
              conversation: item.conversationData,
            }),
          }),
        })),
      };
    },
    initialPageParam: computed(() =>
      initialFeedRequest(currentHomeFeedTab.value)
    ),
    getNextPageParam: nextFeedRequest,
    enabled: computed(() => toValue(enabled)),
    staleTime: Infinity,
    retry: false,
  });

  watch(
    () => query.data.value?.pages[0],
    (page) => {
      if (page !== undefined)
        feedStore.initializeFeedHead({
          tab: page.sortAlgorithm,
          slugIds: page.feedItemList.map(
            (item) => item.conversationData.metadata.conversationSlugId
          ),
        });
    },
    { immediate: true }
  );
  useQvStatsSubscriptions(() =>
    toValue(enabled)
      ? (query.data.value?.pages.flatMap((page) =>
          page.feedItemList.flatMap(({ conversationData: { metadata } }) =>
            metadata.conversationType === "prioritizing" &&
            metadata.prioritizationType === "qv"
              ? [metadata.conversationSlugId]
              : []
          )
        ) ?? [])
      : []
  );
  onActivated(() => {
    // A global replay cursor can advance while this KeepAlive page is inactive.
    // Keep cached cards visible, but recover participation missed before resubscription.
    if (
      toValue(enabled) &&
      query.data.value?.pages.some((page) =>
        page.feedItemList.some(
          ({ conversationData: { metadata } }) =>
            metadata.conversationType === "prioritizing" &&
            metadata.prioritizationType === "qv"
        )
      )
    )
      void query.refetch();
  });

  const refreshes = new Map<string, Promise<void>>();
  async function refreshFeed(): Promise<void> {
    const key = queryKey.value;
    const scope = hashKey(key);
    const existing = refreshes.get(scope);
    if (existing !== undefined) return await existing;
    const refresh = (async () => {
      await queryClient.cancelQueries({ queryKey: key, exact: true });
      if (scope !== hashKey(queryKey.value)) return;
      // A deliberate refresh starts a new traversal without re-fetching visited pages.
      queryClient.setQueryData<
        InfiniteData<FetchFeedResponse, FetchFeedRequest>
      >(key, (data) =>
        data === undefined
          ? undefined
          : {
              pages: data.pages.slice(0, 1),
              pageParams: data.pageParams.slice(0, 1),
            }
      );
      await query.refetch({ cancelRefetch: false });
    })();
    refreshes.set(scope, refresh);
    try {
      await refresh;
    } finally {
      if (refreshes.get(scope) === refresh) refreshes.delete(scope);
    }
  }

  return { ...query, refreshFeed };
}

export function useInvalidateFeedQuery() {
  const queryClient = useQueryClient();
  return {
    invalidateFeed: () => {
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
    invalidateFeedTab: (tab: FeedSortAlgorithm) => {
      void queryClient.invalidateQueries({ queryKey: ["feed", tab] });
    },
  };
}
