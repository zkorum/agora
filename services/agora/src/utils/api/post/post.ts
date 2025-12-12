import { axiosInstance, api } from "../client";
import { buildAuthorizationHeader } from "../../crypto/ucan/operation";
import type {
  ApiV1ConversationFetchRecentPost200ResponseConversationDataListInner,
  ApiV1ConversationCreatePost200Response,
  ApiV1ConversationImportPost200Response,
  ApiV1ConversationImportPostRequest,
} from "src/api";
import type { ImportCsvConversationResponse } from "src/shared/types/dto";
import { CSV_UPLOAD_FIELD_NAMES } from "src/shared-app-api/csvUpload";
import {
  type ApiV1ConversationCreatePostRequest,
  type ApiV1ConversationFetchRecentPostRequest,
  DefaultApiAxiosParamCreator,
  DefaultApiFactory,
  type ApiV1ModerationConversationWithdrawPostRequest,
} from "src/api";
import type { AxiosErrorResponse, AxiosSuccessResponse } from "../common";
import { useCommonApi } from "../common";
import { useNotify } from "../../ui/notify";
import { useRouter } from "vue-router";
import type {
  ExtendedConversation,
  FeedSortAlgorithm,
  moderationStatusOptionsType,
  EventSlug,
} from "src/shared/types/zod";
import type {
  FetchFeedResponse,
  ValidateCsvResponse,
  GetConversationImportStatusResponse,
  GetActiveImportResponse,
} from "src/shared/types/dto";
import { zodExtendedConversationData } from "src/shared/types/zod";
import { Dto } from "src/shared/types/dto";

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
      if (axiosInstance.isAxiosError(error)) {
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
    requiresEventTicket?: EventSlug;
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
    requiresEventTicket?: EventSlug;
  }

  type ImportConversationSuccessResponse =
    AxiosSuccessResponse<ApiV1ConversationImportPost200Response>;
  type ImportConversationResponse =
    | ImportConversationSuccessResponse
    | AxiosErrorResponse;

  interface ImportConversationFromCsvParams {
    summaryFile: File;
    commentsFile: File;
    votesFile: File;
    postAsOrganizationName: string;
    targetIsoConvertDateString: string | undefined;
    isIndexed: boolean;
    isLoginRequired: boolean;
    requiresEventTicket?: EventSlug;
  }

  async function importConversationFromCsv(
    params: ImportConversationFromCsvParams
  ): Promise<ImportCsvConversationResponse> {
    const formData = new FormData();

    // Add files with correct field names
    formData.append(CSV_UPLOAD_FIELD_NAMES.SUMMARY_FILE, params.summaryFile);
    formData.append(CSV_UPLOAD_FIELD_NAMES.COMMENTS_FILE, params.commentsFile);
    formData.append(CSV_UPLOAD_FIELD_NAMES.VOTES_FILE, params.votesFile);

    // Add metadata
    formData.append("postAsOrganization", params.postAsOrganizationName);
    formData.append(
      "indexConversationAt",
      params.targetIsoConvertDateString || ""
    );
    formData.append("isIndexed", String(params.isIndexed));
    formData.append("isLoginRequired", String(params.isLoginRequired));
    formData.append("requiresEventTicket", params.requiresEventTicket || "");

    // Get URL from OpenAPI spec
    const { url, options } =
      await DefaultApiAxiosParamCreator().apiV1ConversationImportCsvPost();
    const encodedUcan = await buildEncodedUcan(url, options);

    // Use createRawAxiosRequestConfig with extended timeout for large files
    const config = createRawAxiosRequestConfig({
      encodedUcan,
      timeoutProfile: "extended",
    });

    const response = await api.post(url, formData, {
      ...config,
      headers: {
        ...config.headers,
        "Content-Type": "multipart/form-data",
      },
    });

    return Dto.importCsvConversationResponse.parse(response.data);
  }

  async function importConversation({
    polisUrl,
    postAsOrganizationName,
    targetIsoConvertDateString,
    isIndexed,
    isLoginRequired,
    requiresEventTicket,
  }: ImportConversationProps): Promise<ImportConversationResponse> {
    try {
      const params: ApiV1ConversationImportPostRequest = {
        polisUrl,
        postAsOrganization: postAsOrganizationName,
        indexConversationAt: targetIsoConvertDateString,
        isIndexed,
        isLoginRequired,
        requiresEventTicket,
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
    requiresEventTicket,
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
        requiresEventTicket,
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

  interface ValidateCsvFilesParams {
    summaryFile: File | null;
    commentsFile: File | null;
    votesFile: File | null;
  }

  async function validateCsvFiles({
    summaryFile,
    commentsFile,
    votesFile,
  }: ValidateCsvFilesParams): Promise<ValidateCsvResponse> {
    try {
      const formData = new FormData();

      // Only add files that are present
      if (summaryFile) {
        formData.append(CSV_UPLOAD_FIELD_NAMES.SUMMARY_FILE, summaryFile);
      }
      if (commentsFile) {
        formData.append(CSV_UPLOAD_FIELD_NAMES.COMMENTS_FILE, commentsFile);
      }
      if (votesFile) {
        formData.append(CSV_UPLOAD_FIELD_NAMES.VOTES_FILE, votesFile);
      }

      // Get URL from OpenAPI spec
      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1ConversationValidateCsvPost();
      const encodedUcan = await buildEncodedUcan(url, options);

      // Use standard timeout for validation (should be fast)
      const config = createRawAxiosRequestConfig({
        encodedUcan,
      });

      const response = await api.post(url, formData, {
        ...config,
        headers: {
          ...config.headers,
          "Content-Type": "multipart/form-data",
        },
      });

      return Dto.validateCsvResponse.parse(response.data);
    } catch (error) {
      console.error("CSV validation error:", error);
      throw error;
    }
  }

  async function getConversationImportStatus(
    importSlugId: string
  ): Promise<GetConversationImportStatusResponse> {
    const { url, options } =
      await DefaultApiAxiosParamCreator().apiV1ConversationImportStatusImportSlugIdGet(
        importSlugId
      );
    const encodedUcan = await buildEncodedUcan(url, options);

    const response = await DefaultApiFactory(
      undefined,
      undefined,
      api
    ).apiV1ConversationImportStatusImportSlugIdGet(importSlugId, {
      headers: {
        ...buildAuthorizationHeader(encodedUcan),
      },
    });

    return Dto.getConversationImportStatusResponse.parse(response.data);
  }

  async function getActiveImport(): Promise<GetActiveImportResponse> {
    const { url, options } =
      await DefaultApiAxiosParamCreator().apiV1ConversationImportActiveGet();
    const encodedUcan = await buildEncodedUcan(url, options);

    const response = await DefaultApiFactory(
      undefined,
      undefined,
      api
    ).apiV1ConversationImportActiveGet({
      headers: {
        ...buildAuthorizationHeader(encodedUcan),
      },
    });

    return Dto.getActiveImportResponse.parse(response.data);
  }

  return {
    createNewPost,
    fetchRecentPost,
    fetchPostBySlugId,
    createInternalPostData,
    deletePostBySlugId,
    importConversation,
    importConversationFromCsv,
    validateCsvFiles,
    getConversationImportStatus,
    getActiveImport,
  };
}
