import { axios, api } from "boot/axios";
import { buildAuthorizationHeader } from "../crypto/ucan/operation";
import {
  DefaultApiAxiosParamCreator,
  DefaultApiFactory,
  type ApiV1FeedFetchRecentPost200ResponsePostDataListInner,
  type ApiV1FeedFetchRecentPostRequest,
  type ApiV1PostCreatePostRequest,
  type ApiV1PostDeletePostRequest,
  type ApiV1PostFetchPostBySlugIdPostRequest,
} from "src/api";
import { useCommonApi } from "./common";
import { useNotify } from "../ui/notify";
import { useRouter } from "vue-router";
import type { ExtendedPost } from "src/shared/types/zod";
import type { DummyPollOptionFormat } from "src/stores/post";

export function useBackendPostApi() {
  const { buildEncodedUcan } = useCommonApi();

  const { showNotifyMessage } = useNotify();

  const router = useRouter();

  function createInternalPostData(
    postElement: ApiV1FeedFetchRecentPost200ResponsePostDataListInner
  ): ExtendedPost {
    // Create the polling object
    const pollOptionList: DummyPollOptionFormat[] = [];
    postElement.payload.poll?.forEach((pollOption) => {
      const internalItem: DummyPollOptionFormat = {
        index: pollOption.optionNumber - 1,
        numResponses: pollOption.numResponses,
        option: pollOption.optionTitle,
      };
      pollOptionList.push(internalItem);
    });

    const parseditem = composeInternalPostList([postElement])[0];
    return parseditem;
  }

  async function fetchPostBySlugId(
    postSlugId: string,
    loadUserPollResponse: boolean
  ): Promise<ExtendedPost | null> {
    try {
      const params: ApiV1PostFetchPostBySlugIdPostRequest = {
        postSlugId: postSlugId,
        isAuthenticatedRequest: loadUserPollResponse,
      };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1PostFetchPostBySlugIdPost(
          params
        );
      if (!loadUserPollResponse) {
        const response = await DefaultApiFactory(
          undefined,
          undefined,
          api
        ).apiV1PostFetchPostBySlugIdPost(params, {});

        return createInternalPostData(response.data.postData);
      } else {
        const encodedUcan = await buildEncodedUcan(url, options);
        const response = await DefaultApiFactory(
          undefined,
          undefined,
          api
        ).apiV1PostFetchPostBySlugIdPost(params, {
          headers: {
            ...buildAuthorizationHeader(encodedUcan),
          },
        });

        return createInternalPostData(response.data.postData);
      }
    } catch (error) {
      console.error(error);
      if (axios.isAxiosError(error)) {
        if (error.status == 400) {
          showNotifyMessage("Post resource not found.");
          await router.push({ name: "default-home-feed" });
        }
      } else {
        showNotifyMessage("Failed to fetch post by slug ID.");
      }

      return null;
    }
  }

  async function fetchRecentPost(
    lastSlugId: string | undefined,
    loadUserPollData: boolean
  ) {
    try {
      const params: ApiV1FeedFetchRecentPostRequest = {
        showHidden: false,
        lastSlugId: lastSlugId,
        isAuthenticatedRequest: loadUserPollData,
      };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1FeedFetchRecentPost(params);
      if (!loadUserPollData) {
        const response = await DefaultApiFactory(
          undefined,
          undefined,
          api
        ).apiV1FeedFetchRecentPost(params, {});

        return {
          postDataList: response.data.postDataList,
          reachedEndOfFeed: response.data.reachedEndOfFeed,
        };
      } else {
        const encodedUcan = await buildEncodedUcan(url, options);
        const response = await DefaultApiFactory(
          undefined,
          undefined,
          api
        ).apiV1FeedFetchRecentPost(params, {
          headers: {
            ...buildAuthorizationHeader(encodedUcan),
          },
        });

        return {
          postDataList: response.data.postDataList,
          reachedEndOfFeed: response.data.reachedEndOfFeed,
        };
      }
    } catch (e) {
      console.error(e);
      showNotifyMessage("Failed to fetch recent posts from the server.");
      return null;
    }
  }

  async function createNewPost(
    postTitle: string,
    postBody: string | undefined,
    pollingOptionList: string[] | undefined
  ) {
    try {
      const params: ApiV1PostCreatePostRequest = {
        postTitle: postTitle,
        postBody: postBody,
        pollingOptionList: pollingOptionList,
      };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1PostCreatePost(params);
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1PostCreatePost(params, {
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      });
      return response.data;
    } catch (e) {
      console.error(e);
      showNotifyMessage("Failed to create the new post.");
      return null;
    }
  }

  function composeInternalPostList(
    incomingPostList: ApiV1FeedFetchRecentPost200ResponsePostDataListInner[]
  ): ExtendedPost[] {
    const parsedList: ExtendedPost[] = [];

    incomingPostList.forEach((item) => {
      const newPost: ExtendedPost = {
        metadata: {
          authorUsername: String(item.metadata.authorUsername),
          commentCount: item.metadata.commentCount,
          createdAt: new Date(item.metadata.createdAt),
          lastReactedAt: new Date(item.metadata.lastReactedAt),
          postSlugId: item.metadata.postSlugId,
          updatedAt: new Date(item.metadata.updatedAt),
          authorImagePath: item.metadata.authorImagePath,
          isHidden: item.metadata.isHidden,
          isLocked: item.metadata.isLocked,
        },
        payload: {
          title: item.payload.title,
          body: item.payload.body,
          poll: item.payload.poll,
        },
        interaction: {
          hasVoted: item.interaction.hasVoted,
          votedIndex: item.interaction.votedIndex - 1,
        },
      };

      parsedList.push(newPost);
    });

    return parsedList;
  }

  async function deletePostBySlugId(postSlugId: string) {
    try {
      const params: ApiV1PostDeletePostRequest = {
        postSlugId: postSlugId,
      };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1PostDeletePost(params);
      const encodedUcan = await buildEncodedUcan(url, options);
      await DefaultApiFactory(undefined, undefined, api).apiV1PostDeletePost(
        params,
        {
          headers: {
            ...buildAuthorizationHeader(encodedUcan),
          },
        }
      );
      return true;
    } catch (e) {
      console.error(e);
      showNotifyMessage("Failed to delete the post.");
      return false;
    }
  }

  return {
    createNewPost,
    fetchRecentPost,
    fetchPostBySlugId,
    createInternalPostData,
    composeInternalPostList,
    deletePostBySlugId,
  };
}
