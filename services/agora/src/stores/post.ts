import { defineStore, storeToRefs } from "pinia";
import { ref } from "vue";
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

export const usePostStore = defineStore("post", () => {
  const { fetchRecentPost, composeInternalPostList } = useBackendPostApi();

  const { loadUserProfile } = useUserStore();

  const { isGuestOrLoggedIn } = storeToRefs(useAuthenticationStore());

  const hasPendingNewPosts = ref(false);

  const endOfFeed = ref(false);

  const initializedFeed = ref(false);

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

  async function loadPostData(loadMoreData: boolean): Promise<boolean> {
    let lastSlugId: undefined | string = undefined;

    if (loadMoreData) {
      const lastPostItem = masterPostDataList.value.at(-1);
      if (lastPostItem) {
        lastSlugId = lastPostItem.metadata.conversationSlugId;
      }
    }

    const response = await fetchRecentPost(lastSlugId, isGuestOrLoggedIn.value);

    if (response != null) {
      const internalDataList = composeInternalPostList(response.postDataList);
      if (loadMoreData) {
        if (response.postDataList.length > 0) {
          masterPostDataList.value.push(...internalDataList);
          trimHomeFeedSize(60);
        } else {
          // Empty so do nothing
        }
      } else {
        masterPostDataList.value = internalDataList;
        hasPendingNewPosts.value = false;
      }

      endOfFeed.value = response.reachedEndOfFeed;

      initializedFeed.value = true;

      if (response.postDataList.length > 0) {
        return true;
      } else {
        return false;
      }
    } else {
      initializedFeed.value = true;
      return false;
    }
  }

  function trimHomeFeedSize(targetPostSize: number) {
    if (masterPostDataList.value.length > targetPostSize) {
      masterPostDataList.value = masterPostDataList.value.slice(
        masterPostDataList.value.length - targetPostSize
      );
    }
  }

  async function hasNewPostCheck(): Promise<void> {
    if (hasPendingNewPosts.value == true && initializedFeed.value) {
      return;
    }

    const response = await fetchRecentPost(undefined, isGuestOrLoggedIn.value);
    if (response != null) {
      if (response.postDataList.length == 0) {
        hasPendingNewPosts.value = false;
      } else {
        if (masterPostDataList.value.length == 0) {
          hasPendingNewPosts.value = true;
        } else {
          if (
            new Date(response.postDataList[0].metadata.createdAt).getTime() !=
            masterPostDataList.value[0].metadata.createdAt.getTime()
          ) {
            hasPendingNewPosts.value = true;
          } else {
            hasPendingNewPosts.value = false;
          }
        }
      }
    } else {
      hasPendingNewPosts.value = false;
    }
  }

  async function resetPostData() {
    masterPostDataList.value = [];
    await Promise.all([loadPostData(false), loadUserProfile()]);
  }

  return {
    loadPostData,
    hasNewPostCheck,
    resetPostData,
    masterPostDataList,
    emptyPostDataList,
    emptyPost,
    endOfFeed,
    hasPendingNewPosts,
    initializedFeed,
  };
});
