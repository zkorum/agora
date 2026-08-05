import { defineStore, storeToRefs } from "pinia";
import type { FetchFeedResponse } from "src/shared/types/dto";
import { useBackendPostApi } from "src/utils/api/post/post";
import { computed, ref } from "vue";

import { useAuthenticationStore } from "./authentication";

const POSTS_PER_PAGE = 10;

export type HomeFeedSortOption = "following" | "new";
type HomeFeedItem = FetchFeedResponse["feedItemList"][number];

export const useHomeFeedStore = defineStore("homeFeed", () => {
  const { fetchRecentPost } = useBackendPostApi();

  const { isGuestOrLoggedIn } = storeToRefs(useAuthenticationStore());

  const hasPendingNewTab = ref(false);
  const hasPendingFollowingTab = ref(false);

  const hasPendingCurrentTab = computed(() =>
    currentHomeFeedTab.value === "new"
      ? hasPendingNewTab.value
      : hasPendingFollowingTab.value
  );

  const canLoadMore = ref(true);

  const currentHomeFeedTab = ref<HomeFeedSortOption>("following");

  let localTopSlugIds: Record<HomeFeedSortOption, string[]> = {
    new: [],
    following: [],
  };

  let fullHomeFeedList: HomeFeedItem[] = [];
  const partialHomeFeedList = ref<HomeFeedItem[]>([]);

  function setFeedData(data: FetchFeedResponse) {
    fullHomeFeedList = [...data.feedItemList];
    partialHomeFeedList.value = [];
    if (currentHomeFeedTab.value === "new") {
      hasPendingNewTab.value = false;
    } else {
      hasPendingFollowingTab.value = false;
    }
    localTopSlugIds[currentHomeFeedTab.value] = [...data.topConversationSlugIdList];

    canLoadMore.value = true;
    loadMore();
  }

  async function hasNewPostCheck(tabOverride?: HomeFeedSortOption): Promise<void> {
    const tab = tabOverride ?? currentHomeFeedTab.value;
    const localList = localTopSlugIds[tab];

    if (localList.length === 0) {
      return;
    }

    const pendingRef =
      tab === "new"
        ? hasPendingNewTab
        : hasPendingFollowingTab;

    try {
      const response = await fetchRecentPost({
        loadPersonalizedData: isGuestOrLoggedIn.value,
        sortAlgorithm: tab,
        includeDisplayContent: false,
      });

      if (
        response.status == "success" &&
        response.data.topConversationSlugIdList.length > 0
      ) {
        const newItems = response.data.topConversationSlugIdList.filter(
          (slugId: string) => !localList.includes(slugId)
        );
        if (newItems.length > 0) {
          localTopSlugIds[tab] =
            response.data.topConversationSlugIdList;
          pendingRef.value = true;
        } else {
          pendingRef.value = false;
        }
      } else {
        pendingRef.value = false;
      }
    } catch (error) {
      console.error("Error checking for new posts:", error);
      pendingRef.value = false;
    }
  }

  function loadMore(): boolean {
    if (fullHomeFeedList.length > 0) {
      const itemsToLoad: HomeFeedItem[] = fullHomeFeedList.splice(
        0,
        Math.min(POSTS_PER_PAGE, fullHomeFeedList.length)
      );
      partialHomeFeedList.value = partialHomeFeedList.value.concat(itemsToLoad);
    }

    const hasMore = fullHomeFeedList.length > 0;
    return hasMore;
  }

  function onPopularConversationUpdate(topSlugIds: string[]): void {
    const localList = localTopSlugIds["following"];
    if (localList.length === 0) {
      hasPendingFollowingTab.value = true;
      return;
    }
    const TOP_N = 3;
    const localTop = localList.slice(0, TOP_N);
    const remoteTop = topSlugIds.slice(0, TOP_N);
    const changed =
      remoteTop.length !== localTop.length ||
      remoteTop.some((id, i) => id !== localTop[i]);
    if (changed) {
      hasPendingFollowingTab.value = true;
    }
  }

  function clearFeedDisplay() {
    fullHomeFeedList = [];
    partialHomeFeedList.value = [];
    canLoadMore.value = true;
  }

  function clearFeedData() {
    fullHomeFeedList = [];
    partialHomeFeedList.value = [];
    hasPendingNewTab.value = false;
    hasPendingFollowingTab.value = false;
    localTopSlugIds = { new: [], following: [] };
    canLoadMore.value = true;
  }

  return {
    setFeedData,
    clearFeedDisplay,
    clearFeedData,
    hasNewPostCheck,
    onPopularConversationUpdate,
    loadMore,
    partialHomeFeedList,
    hasPendingNewTab,
    hasPendingFollowingTab,
    hasPendingCurrentTab,
    currentHomeFeedTab,
    canLoadMore,
  };
});
