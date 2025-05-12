import { axios, api } from "boot/axios";
import { buildAuthorizationHeader } from "../crypto/ucan/operation";
import {
  type ApiV1ConversationCreatePostRequest,
  type ApiV1ConversationFetchRecentPostRequest,
  ApiV1ConversationFetchRecentPost200ResponseConversationDataListInner,
  DefaultApiAxiosParamCreator,
  DefaultApiFactory,
  type ApiV1ModerationConversationWithdrawPostRequest,
  ApiV1ConversationCreatePost200Response,
} from "src/api";
import {
  AxiosErrorResponse,
  AxiosSuccessResponse,
  useCommonApi,
} from "./common";
import { useNotify } from "../ui/notify";
import { useRouter } from "vue-router";
import type {
  ExtendedConversation,
  moderationStatusOptionsType,
} from "src/shared/types/zod";
import type { DummyPollOptionFormat } from "src/stores/homeFeed";

export function useBackendPostApi() {
  const {
    buildEncodedUcan,
    createRawAxiosRequestConfig,
    createAxiosErrorResponse,
  } = useCommonApi();

  const { showNotifyMessage } = useNotify();

  const router = useRouter();

  function createInternalPostData(
    postElement: ApiV1ConversationFetchRecentPost200ResponseConversationDataListInner
  ): ExtendedConversation {
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
  ): Promise<ExtendedConversation | null> {
    try {
      const params: ApiV1ModerationConversationWithdrawPostRequest = {
        conversationSlugId: postSlugId,
      };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1ConversationGetPost(params);
      if (!loadUserPollResponse) {
        const response = await DefaultApiFactory(
          undefined,
          undefined,
          api
        ).apiV1ConversationGetPost(params, {});

        return createInternalPostData(response.data.conversationData);
      } else {
        const encodedUcan = await buildEncodedUcan(url, options);
        const response = await DefaultApiFactory(
          undefined,
          undefined,
          api
        ).apiV1ConversationGetPost(params, {
          headers: {
            ...buildAuthorizationHeader(encodedUcan),
          },
        });

        return createInternalPostData(response.data.conversationData);
      }
    } catch (error) {
      const DEFAULT_ERROR = "Failed to fetch conversation by slug ID.";
      console.error(error);
      if (axios.isAxiosError(error)) {
        if (error.status == 400) {
          showNotifyMessage("Conversation resource not found.");
        } else {
          showNotifyMessage(DEFAULT_ERROR);
        }
      } else {
        showNotifyMessage(DEFAULT_ERROR);
      }

      await router.push({ name: "/" });

      return null;
    }
  }

  async function fetchRecentPost(
    lastSlugId: string | undefined,
    loadUserPollData: boolean
  ) {
    try {
      const params: ApiV1ConversationFetchRecentPostRequest = {
        lastSlugId: lastSlugId,
      };

      if (!loadUserPollData) {
        const response = await DefaultApiFactory(
          undefined,
          undefined,
          api
        ).apiV1ConversationFetchRecentPost(params, {});

        return {
          postDataList: response.data.conversationDataList,
          reachedEndOfFeed: response.data.reachedEndOfFeed,
        };
      } else {
        const { url, options } =
          await DefaultApiAxiosParamCreator().apiV1ConversationFetchRecentPost(
            params
          );
        const encodedUcan = await buildEncodedUcan(url, options);
        const response = await DefaultApiFactory(
          undefined,
          undefined,
          api
        ).apiV1ConversationFetchRecentPost(params, {
          headers: {
            ...buildAuthorizationHeader(encodedUcan),
          },
        });

        return {
          postDataList: response.data.conversationDataList,
          reachedEndOfFeed: response.data.reachedEndOfFeed,
        };
      }
    } catch (e) {
      console.error(e);
      showNotifyMessage("Failed to fetch recent posts from the server.");
      return null;
    }
  }

  interface CreateNewPostProps {
    postTitle: string;
    postBody: string | undefined;
    pollingOptionList: string[] | undefined;
    postAsOrganizationName: string;
    targetIsoConvertDateString: string | undefined;
    isIndexed: boolean;
    isLoginRequired: boolean;
  }

  type CreateNewPostSuccessResponse =
    AxiosSuccessResponse<ApiV1ConversationCreatePost200Response>;
  type CreateNewPostResponse =
    | CreateNewPostSuccessResponse
    | AxiosErrorResponse;
  async function createNewPost({
    postTitle,
    postBody,
    pollingOptionList,
    postAsOrganizationName,
    targetIsoConvertDateString,
    isIndexed,
    isLoginRequired,
  }: CreateNewPostProps): Promise<CreateNewPostResponse> {
    try {
      const params: ApiV1ConversationCreatePostRequest = {
        conversationTitle: postTitle,
        conversationBody: postBody,
        pollingOptionList: pollingOptionList,
        isIndexed: isIndexed,
        isLoginRequired: isLoginRequired,
        postAsOrganization: postAsOrganizationName,
        indexConversationAt: targetIsoConvertDateString,
      };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1ConversationCreatePost(params);
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1ConversationCreatePost(
        params,
        createRawAxiosRequestConfig({ encodedUcan: encodedUcan })
      );

      return {
        data: response.data,
        status: "success",
      };
    } catch (e) {
      return createAxiosErrorResponse(e);
    }
  }

  function composeInternalPostList(
    incomingPostList: ApiV1ConversationFetchRecentPost200ResponseConversationDataListInner[]
  ): ExtendedConversation[] {
    const parsedList: ExtendedConversation[] = [];
    incomingPostList.forEach((item) => {
      const moderationStatus = item.metadata.moderation
        .status as moderationStatusOptionsType;

      const newPost: ExtendedConversation = {
        metadata: {
          authorUsername: String(item.metadata.authorUsername),
          opinionCount: item.metadata.opinionCount,
          voteCount: item.metadata.voteCount,
          participantCount: item.metadata.participantCount,
          createdAt: new Date(item.metadata.createdAt),
          lastReactedAt: new Date(item.metadata.lastReactedAt),
          conversationSlugId: item.metadata.conversationSlugId,
          updatedAt: new Date(item.metadata.updatedAt),
          moderation: {
            status: moderationStatus,
            action: item.metadata.moderation.action,
            reason: item.metadata.moderation.reason,
            explanation: item.metadata.moderation.explanation,
            createdAt: new Date(item.metadata.moderation.createdAt),
            updatedAt: new Date(item.metadata.moderation.updatedAt),
          },
          isIndexed: item.metadata.isIndexed,
          isLoginRequired: item.metadata.isLoginRequired,
          organization: {
            description: item.metadata.organization?.description || "",
            imageUrl: item.metadata.organization?.imageUrl || "",
            name: item.metadata.organization?.name || "",
            websiteUrl: item.metadata.organization?.websiteUrl || "",
          },
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
        polis: item.polis,
      };

      parsedList.push(newPost);
    });

    return parsedList;
  }

  async function deletePostBySlugId(postSlugId: string) {
    try {
      const params: ApiV1ModerationConversationWithdrawPostRequest = {
        conversationSlugId: postSlugId,
      };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1ConversationDeletePost(params);
      const encodedUcan = await buildEncodedUcan(url, options);
      await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1ConversationDeletePost(params, {
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      });
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
