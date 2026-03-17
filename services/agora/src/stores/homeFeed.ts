import { defineStore, storeToRefs } from "pinia";
import type { FetchFeedResponse } from "src/shared/types/dto";
import type { ExtendedConversation } from "src/shared/types/zod";
import { useBackendPostApi } from "src/utils/api/post/post";
import { ref } from "vue";

import { useAuthenticationStore } from "./authentication";

const POSTS_PER_PAGE = 10;

export type HomeFeedSortOption = "following" | "new";

export const useHomeFeedStore = defineStore("homeFeed", () => {
  const { fetchRecentPost } = useBackendPostApi();

  const { isGuestOrLoggedIn } = storeToRefs(useAuthenticationStore());

  const hasPendingNewPosts = ref(false);

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
  let fullHomeFeedIndex = 0;
  const partialHomeFeedList = ref<ExtendedConversation[]>([]);

  function setFeedData(data: FetchFeedResponse) {
    fullHomeFeedList = [...data.conversationDataList];
    fullHomeFeedIndex = 0;
    partialHomeFeedList.value = [];
    hasPendingNewPosts.value = false;
    localTopConversationSlugIdList = data.topConversationSlugIdList;

    canLoadMore.value = true;
    loadMore();
  }

  async function hasNewPostCheck(): Promise<void> {
    if (hasPendingNewPosts.value == true) {
      return;
    }

    if (localTopConversationSlugIdList.length === 0) {
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

  function loadMore(): boolean {
    if (fullHomeFeedIndex < fullHomeFeedList.length) {
      const end = Math.min(
        fullHomeFeedIndex + POSTS_PER_PAGE,
        fullHomeFeedList.length
      );
      const itemsToLoad = fullHomeFeedList.slice(fullHomeFeedIndex, end);
      fullHomeFeedIndex = end;
      partialHomeFeedList.value =
        partialHomeFeedList.value.concat(itemsToLoad);
    }

    return fullHomeFeedIndex < fullHomeFeedList.length;
  }

  return {
    setFeedData,
    hasNewPostCheck,
    loadMore,
    partialHomeFeedList,
    emptyPost,
    hasPendingNewPosts,
    currentHomeFeedTab,
    canLoadMore,
  };
});
