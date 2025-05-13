import { defineStore, storeToRefs } from "pinia";
import { ref, watch } from "vue";
import { useBackendPostApi } from "src/utils/api/post";
import { useAuthenticationStore } from "./authentication";
import type { ExtendedConversation } from "src/shared/types/zod";
import { useUserStore } from "./user";

export interface DummyPollOptionFormat {
  index: number;
  option: string;
  numResponses: number;
}

export interface DummyCommentFormat {
  index: number;
  createdAt: Date;
  comment: string;
  numUpvotes: number;
  numDownvotes: number;
  slugId: string;
}

export interface DummyPostMetadataFormat {
  uid: string;
  slugId: string;
  isHidden: boolean;
  createdAt: string;
  commentCount: number;
  communityId: string;
  posterName: string;
  posterImagePath: string;
}

export interface DummyPostUserVote {
  hasVoted: boolean;
  voteIndex: number;
}

export type PossibleCommentRankingActions = "like" | "dislike" | "pass";

export interface UserRankedCommentItem {
  index: number;
  action: PossibleCommentRankingActions;
}

export interface DummyCommentRankingFormat {
  rankedCommentList: Map<number, PossibleCommentRankingActions>;
  assignedRankingItems: number[];
}

export interface DummyUserPollResponse {
  hadResponded: boolean;
  responseIndex: number;
}

export interface DummyUserPostDataFormat {
  slugId: string;
  poll: {
    castedVote: boolean;
    votedIndex: number;
  };
  comment: { ratedIndexList: number[] };
}

export interface DummyPostDataFormat extends ExtendedConversation {
  userInteraction: {
    pollResponse: DummyUserPollResponse;
    commentRanking: DummyCommentRankingFormat;
  };
}

export type HomeFeedSortOption = "following" | "new";

export const useHomeFeedStore = defineStore("homeFeed", () => {
  const { fetchRecentPost } = useBackendPostApi();

  const { loadUserProfile } = useUserStore();

  const { isGuestOrLoggedIn } = storeToRefs(useAuthenticationStore());

  const hasPendingNewPosts = ref(false);

  const initializedFeed = ref(false);

  const currentHomeFeedTab = ref<HomeFeedSortOption>("following");

  let localTopConversationSlugIdList: string[] = [];

  const emptyPost: DummyPostDataFormat = {
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
    polis: {
      aiSummary: undefined,
      clusters: [],
    },
    userInteraction: {
      commentRanking: {
        assignedRankingItems: [],
        rankedCommentList: new Map<number, PossibleCommentRankingActions>(),
      },
      pollResponse: {
        hadResponded: false,
        responseIndex: 0,
      },
    },
  };

  const masterPostDataList = ref<ExtendedConversation[]>([]);
  const emptyPostDataList = ref<ExtendedConversation[]>([
    emptyPost,
    emptyPost,
    emptyPost,
    emptyPost,
  ]);

  watch(currentHomeFeedTab, async () => {
    await loadPostData();
  });

  async function loadPostData(): Promise<boolean> {
    const response = await fetchRecentPost({
      lastSlugId: undefined,
      loadUserPollData: isGuestOrLoggedIn.value,
      sortAlgorithm: "following",
    });

    if (response.status == "success") {
      masterPostDataList.value = response.data.conversationDataList;
      hasPendingNewPosts.value = false;

      initializedFeed.value = true;

      return false;
    } else {
      initializedFeed.value = true;
      return false;
    }
  }

  async function hasNewPostCheck(): Promise<void> {
    if (hasPendingNewPosts.value == true || !initializedFeed.value) {
      return;
    }

    const response = await fetchRecentPost({
      lastSlugId: undefined,
      loadUserPollData: isGuestOrLoggedIn.value,
      sortAlgorithm: "following",
    });
    if (
      response.status == "success" &&
      response.data.topConversationSlugIdList.length > 0
    ) {
      // Check for any new slug IDs
      const newItems = response.data.topConversationSlugIdList.filter(
        (slugId) => !localTopConversationSlugIdList.includes(slugId)
      );
      localTopConversationSlugIdList = response.data.topConversationSlugIdList;
      hasPendingNewPosts.value = newItems.length > 0;
    } else {
      hasPendingNewPosts.value = false;
    }
  }

  async function resetPostData() {
    masterPostDataList.value = [];
    await Promise.all([loadPostData(), loadUserProfile()]);
  }

  return {
    loadPostData,
    hasNewPostCheck,
    resetPostData,
    masterPostDataList,
    emptyPostDataList,
    emptyPost,
    hasPendingNewPosts,
    initializedFeed,
    currentHomeFeedTab,
  };
});
