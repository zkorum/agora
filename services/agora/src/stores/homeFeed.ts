import { defineStore, storeToRefs } from "pinia";
import type { ExtendedConversation } from "src/shared/types/zod";
import { useBackendPostApi } from "src/utils/api/post/post";
import { ref, watch } from "vue";

import { useAuthenticationStore } from "./authentication";
import { useUserStore } from "./user";

// Constants for timing and pagination
const MINIMUM_LOADING_DURATION_MS = 400;
const POSTS_PER_PAGE = 10;

export type HomeFeedSortOption = "following" | "new";

export const useHomeFeedStore = defineStore("homeFeed", () => {
  const { fetchRecentPost } = useBackendPostApi();

  const { loadUserProfile } = useUserStore();

  const { isGuestOrLoggedIn } = storeToRefs(useAuthenticationStore());

  const hasPendingNewPosts = ref(false);

  const initializedFeed = ref(false);
  const canLoadMore = ref(true);
  const isLoadingFeed = ref(false);

  const currentHomeFeedTab = ref<HomeFeedSortOption>("following");

  let localTopConversationSlugIdList: string[] = [];

  const emptyPost: ExtendedConversation = {
    metadata: {
      createdAt: new Date(),
      opinionCount: 0,
      voteCount: 0,
      participantCount: 0,
      authorUsername: "",
      lastReactedAt: new Date(),
      isLoginRequired: true,
      isIndexed: true,
      conversationSlugId: "",
      updatedAt: new Date(),
      isClosed: false,
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

  watch(currentHomeFeedTab, async () => {
    await loadPostData();
  });

  async function loadPostData(): Promise<boolean> {
    isLoadingFeed.value = true;
    const loadingStartTime = Date.now();
    const wasInitialized = initializedFeed.value;

    try {
      const response = await fetchRecentPost({
        loadUserPollData: isGuestOrLoggedIn.value,
        sortAlgorithm: currentHomeFeedTab.value,
      });

      if (response.status == "success") {
        fullHomeFeedList = response.data.conversationDataList;
        partialHomeFeedList.value = [];
        hasPendingNewPosts.value = false;
        localTopConversationSlugIdList =
          response.data.topConversationSlugIdList;

        canLoadMore.value = true;
        loadMore();

        return true; // Success
      } else {
        console.error("Failed to load post data:", response);
        return false; // Failure
      }
    } catch (error) {
      console.error("Error loading post data:", error);
      return false; // Error occurred
    } finally {
      // Enforce minimum loading duration to prevent flash
      const elapsed = Date.now() - loadingStartTime;
      const minimumDuration = wasInitialized ? MINIMUM_LOADING_DURATION_MS : 0; // Only delay for tab switches
      const remainingTime = Math.max(0, minimumDuration - elapsed);

      if (remainingTime > 0) {
        setTimeout(() => {
          // Set both states simultaneously to prevent flash
          initializedFeed.value = true;
          isLoadingFeed.value = false;
        }, remainingTime);
      } else {
        // Set immediately if no delay needed
        initializedFeed.value = true;
        isLoadingFeed.value = false;
      }
    }
  }

  async function hasNewPostCheck(): Promise<void> {
    if (hasPendingNewPosts.value == true || !initializedFeed.value) {
      return;
    }

    try {
      const response = await fetchRecentPost({
        loadUserPollData: isGuestOrLoggedIn.value,
        sortAlgorithm: currentHomeFeedTab.value,
      });

      if (
        response.status == "success" &&
        response.data.topConversationSlugIdList.length > 0
      ) {
        // Check for any new slug IDs
        const newItems = response.data.topConversationSlugIdList.filter(
          (slugId: string) => !localTopConversationSlugIdList.includes(slugId)
        );
        if (newItems.length > 0) {
          localTopConversationSlugIdList =
            response.data.topConversationSlugIdList;
          hasPendingNewPosts.value = true;
        } else {
          hasPendingNewPosts.value = false;
        }
      } else {
        hasPendingNewPosts.value = false;
      }
    } catch (error) {
      console.error("Error checking for new posts:", error);
      hasPendingNewPosts.value = false;
    }
  }

  async function resetPostData() {
    fullHomeFeedList = [];
    partialHomeFeedList.value = [];
    await Promise.all([loadPostData(), loadUserProfile()]);
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

  return {
    loadPostData,
    hasNewPostCheck,
    resetPostData,
    loadMore,
    partialHomeFeedList,
    emptyPost,
    hasPendingNewPosts,
    initializedFeed,
    currentHomeFeedTab,
    canLoadMore,
    isLoadingFeed,
  };
});
