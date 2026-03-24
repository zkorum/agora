import { defineStore, storeToRefs } from "pinia";
import type { FetchFeedResponse } from "src/shared/types/dto";
import type { ExtendedConversation } from "src/shared/types/zod";
import { useBackendPostApi } from "src/utils/api/post/post";
import { computed, ref } from "vue";

import { useAuthenticationStore } from "./authentication";

const POSTS_PER_PAGE = 10;

export type HomeFeedSortOption = "following" | "new";

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

  const emptyPost: ExtendedConversation = {
    metadata: {
      createdAt: new Date(),
      opinionCount: 0,
      voteCount: 0,
      participantCount: 0,
      totalOpinionCount: 0,
      totalVoteCount: 0,
      totalParticipantCount: 0,
      moderatedOpinionCount: 0,
      hiddenOpinionCount: 0,
      authorUsername: "",
      lastReactedAt: new Date(),
      participationMode: "account_required",
      conversationType: "polis",
      isIndexed: true,
      conversationSlugId: "",
      isClosed: false,
      isEdited: false,
      moderation: {
        status: "unmoderated",
      },
      externalSourceConfig: null,
    },
    payload: {
      title: "",
      body: "",
      poll: [],
    },
    interaction: {
      hasVoted: false,
      votedIndex: 0,
    },
  };

  let fullHomeFeedList: ExtendedConversation[] = [];
  const partialHomeFeedList = ref<ExtendedConversation[]>([]);

  function setFeedData(data: FetchFeedResponse) {
    fullHomeFeedList = [...data.conversationDataList];
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
        loadUserPollData: isGuestOrLoggedIn.value,
        sortAlgorithm: tab,
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
      const itemsToLoad: ExtendedConversation[] = fullHomeFeedList.splice(
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
    emptyPost,
    hasPendingNewTab,
    hasPendingFollowingTab,
    hasPendingCurrentTab,
    currentHomeFeedTab,
    canLoadMore,
  };
});
