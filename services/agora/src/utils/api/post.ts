import { axios, api } from "boot/axios";
import { buildAuthorizationHeader } from "../crypto/ucan/operation";
import type {
  ApiV1ConversationFetchRecentPost200ResponseConversationDataListInner,
  ApiV1ConversationCreatePost200Response,
  ApiV1ConversationImportPostRequest,
} from "src/api";
import {
  type ApiV1ConversationCreatePostRequest,
  type ApiV1ConversationFetchRecentPostRequest,
  DefaultApiAxiosParamCreator,
  DefaultApiFactory,
  type ApiV1ModerationConversationWithdrawPostRequest,
} from "src/api";
import type { AxiosErrorResponse, AxiosSuccessResponse } from "./common";
import { useCommonApi } from "./common";
import { useNotify } from "../ui/notify";
import { useRouter } from "vue-router";
import type {
  ExtendedConversation,
  FeedSortAlgorithm,
  moderationStatusOptionsType,
} from "src/shared/types/zod";
import type { FetchFeedResponse } from "src/shared/types/dto";
import { zodExtendedConversationData } from "src/shared/types/zod";

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

  type FetchRecentPostSuccessResponse = AxiosSuccessResponse<FetchFeedResponse>;

  type FetchRecentPostResponse =
    | FetchRecentPostSuccessResponse
    | AxiosErrorResponse;

  interface FetchRecentPostProps {
    loadUserPollData: boolean;
    sortAlgorithm: FeedSortAlgorithm;
  }

  async function fetchRecentPost({
    loadUserPollData,
    sortAlgorithm,
  }: FetchRecentPostProps): Promise<FetchRecentPostResponse> {
    try {
      const params: ApiV1ConversationFetchRecentPostRequest = {
        sortAlgorithm: sortAlgorithm,
      };

      if (!loadUserPollData) {
        const response = await DefaultApiFactory(
          undefined,
          undefined,
          api
        ).apiV1ConversationFetchRecentPost(params, {});

        return {
          status: "success",
          data: {
            conversationDataList: composeInternalPostList(
              response.data.conversationDataList
            ),
            topConversationSlugIdList: response.data.topConversationSlugIdList,
          },
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
          status: "success",
          data: {
            conversationDataList: composeInternalPostList(
              response.data.conversationDataList
            ),
            topConversationSlugIdList: response.data.topConversationSlugIdList,
          },
        };
      }
    } catch (e) {
      console.error(e);
      showNotifyMessage("Failed to fetch recent posts from the server.");
      return createAxiosErrorResponse(e);
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
    seedOpinionList: string[];
  }

  type CreateNewPostSuccessResponse =
    AxiosSuccessResponse<ApiV1ConversationCreatePost200Response>;
  type CreateNewPostResponse =
    | CreateNewPostSuccessResponse
    | AxiosErrorResponse;

  interface ImportConversationProps {
    polisUrl: string;
    postAsOrganizationName: string;
    targetIsoConvertDateString: string | undefined;
    isIndexed: boolean;
    isLoginRequired: boolean;
  }

  type ImportConversationSuccessResponse =
    AxiosSuccessResponse<ApiV1ConversationCreatePost200Response>;
  type ImportConversationResponse =
    | ImportConversationSuccessResponse
    | AxiosErrorResponse;

  async function importConversation({
    polisUrl,
    postAsOrganizationName,
    targetIsoConvertDateString,
    isIndexed,
    isLoginRequired,
  }: ImportConversationProps): Promise<ImportConversationResponse> {
    try {
      const params: ApiV1ConversationImportPostRequest = {
        polisUrl,
        postAsOrganization: postAsOrganizationName,
        indexConversationAt: targetIsoConvertDateString,
        isIndexed,
        isLoginRequired,
      };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1ConversationImportPost(params);
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1ConversationImportPost(
        params,
        createRawAxiosRequestConfig({
          encodedUcan: encodedUcan,
          timeoutProfile: "extended",
        })
      );

      return {
        data: response.data,
        status: "success",
      };
    } catch (e) {
      return createAxiosErrorResponse(e);
    }
  }

  async function createNewPost({
    postTitle,
    postBody,
    pollingOptionList,
    postAsOrganizationName,
    targetIsoConvertDateString,
    isIndexed,
    isLoginRequired,
    seedOpinionList,
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
        seedOpinionList: seedOpinionList,
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
    // Convert API response format to zod-compatible format (string dates to Date objects)
    const transformedList = incomingPostList.map((item) => ({
      ...item,
      metadata: {
        ...item.metadata,
        createdAt: new Date(item.metadata.createdAt),
        updatedAt: new Date(item.metadata.updatedAt),
        lastReactedAt: new Date(item.metadata.lastReactedAt),
        moderation:
          (item.metadata.moderation.status as moderationStatusOptionsType) ===
          "moderated"
            ? {
                ...item.metadata.moderation,
                createdAt: new Date(item.metadata.moderation.createdAt),
                updatedAt: new Date(item.metadata.moderation.updatedAt),
              }
            : item.metadata.moderation,
      },
    }));

    // Use zod to parse and validate the transformed conversation data
    const conversationListResult = zodExtendedConversationData
      .array()
      .safeParse(transformedList);

    if (!conversationListResult.success) {
      console.error(
        "Failed to parse conversation data with zod:",
        conversationListResult.error
      );
      showNotifyMessage("Invalid conversation data received from server.");
      return [];
    }

    return conversationListResult.data;
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
    deletePostBySlugId,
    importConversation,
  };
}
