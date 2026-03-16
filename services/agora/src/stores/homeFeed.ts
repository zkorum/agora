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

  let localTopConversationSlugIdList: string[] = [];

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
      participationMode: "strong_verification",
      conversationType: "polis",
      isIndexed: true,
      conversationSlugId: "",
      isClosed: false,
      isEdited: false,
      moderation: {
        status: "unmoderated",
      },
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
    localTopConversationSlugIdList = [...data.topConversationSlugIdList];

    canLoadMore.value = true;
    loadMore();
  }

  async function hasNewPostCheck(): Promise<void> {
    if (hasPendingCurrentTab.value) {
      return;
    }

    if (localTopConversationSlugIdList.length === 0) {
      return;
    }

    const pendingRef =
      currentHomeFeedTab.value === "new"
        ? hasPendingNewTab
        : hasPendingFollowingTab;

    try {
      const response = await fetchRecentPost({
        loadUserPollData: isGuestOrLoggedIn.value,
        sortAlgorithm: currentHomeFeedTab.value,
      });

      if (
        response.status == "success" &&
        response.data.topConversationSlugIdList.length > 0
      ) {
        const newItems = response.data.topConversationSlugIdList.filter(
          (slugId: string) => !localTopConversationSlugIdList.includes(slugId)
        );
        if (newItems.length > 0) {
          localTopConversationSlugIdList =
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
    const changed =
      topSlugIds.length !== localTopConversationSlugIdList.length ||
      topSlugIds.some((id, i) => id !== localTopConversationSlugIdList[i]);
    if (changed) {
      hasPendingFollowingTab.value = true;
    }
  }

  function clearFeedData() {
    fullHomeFeedList = [];
    partialHomeFeedList.value = [];
    hasPendingNewTab.value = false;
    hasPendingFollowingTab.value = false;
    localTopConversationSlugIdList = [];
    canLoadMore.value = true;
  }

  return {
    setFeedData,
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
