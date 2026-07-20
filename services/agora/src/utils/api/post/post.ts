import {
  type ApiV1ConversationFetchRecentPostRequest,
  type ApiV1ModerationConversationWithdrawPostRequest,
  DefaultApiAxiosParamCreator,
  DefaultApiFactory,
} from "src/api";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type {
  ConversationLanguageSettingsSource,
  CreateNewConversationRequest,
  CreateNewConversationResponse,
  GetConversationCreateProjectOptionsResponse,
  GetConversationResponse,
  ImportConversationResponse,
  ImportCsvConversationResponse,
} from "src/shared/types/dto";
import type {
  FetchFeedResponse,
  GetActiveImportResponse,
  GetConversationImportStatusResponse,
  ValidateCsvResponse,
} from "src/shared/types/dto";
import { Dto } from "src/shared/types/dto";
import type {
  ConversationMultilingualSetting,
  EventSlug,
  ExtendedConversation,
  FeedSortAlgorithm,
  ParticipationMode,
  PreferredOpinionGroupCount,
} from "src/shared/types/zod";
import { zodExtendedConversationData } from "src/shared/types/zod";
import { CSV_UPLOAD_FIELD_NAMES } from "src/shared-app-api/csvUpload";
import { useRouter } from "vue-router";

import {
  buildAuthorizationHeader,
  FILE_UPLOAD_UCAN_LIFETIME_SECONDS,
} from "../../crypto/ucan/operation";
import { useNotify } from "../../ui/notify";
import { api, axiosInstance } from "../client";
import type { AxiosErrorResponse, AxiosSuccessResponse } from "../common";
import { useCommonApi } from "../common";
import {
  type PostApiTranslations,
  postApiTranslations,
} from "./post.i18n";

type ReadyConversationResponse = Extract<
  GetConversationResponse,
  { status: "ready" }
>;
type FetchConversationBySlugIdResult = Omit<ReadyConversationResponse, "status">;

export function useBackendPostApi() {
  const {
    buildEncodedUcan,
    createRawAxiosRequestConfig,
    createAxiosErrorResponse,
  } = useCommonApi();

  const { showNotifyMessage } = useNotify();
  const { t } = useComponentI18n<PostApiTranslations>(postApiTranslations);

  const router = useRouter();

  async function handleGetConversationResponse(
    data: GetConversationResponse
  ): Promise<FetchConversationBySlugIdResult> {
    if (data.status === "importing") {
      await router.replace({
        name: "/conversation/import/[importSlugId]",
        params: { importSlugId: data.importSlugId },
      });
      throw new Error("Conversation import is still processing");
    }

    return {
      conversationData: data.conversationData,
      displayContent: data.displayContent,
    };
  }

  async function fetchConversationBySlugIdWithDisplayContent({
    postSlugId,
    loadPersonalizedData,
  }: {
    postSlugId: string;
    loadPersonalizedData: boolean;
  }): Promise<FetchConversationBySlugIdResult> {
    try {
      const params = Dto.getConversationRequest.parse({
        conversationSlugId: postSlugId,
      });
      const url = "/api/v1/conversation/get";
      const options = { method: "POST" };
      if (!loadPersonalizedData) {
        const response = await api.post(url, params);
        const data = Dto.getConversationResponse.parse(response.data);

        return await handleGetConversationResponse(data);
      } else {
        const encodedUcan = await buildEncodedUcan(url, options);
        const response = await api.post(url, params, {
          headers: {
            ...buildAuthorizationHeader(encodedUcan),
          },
        });
        const data = Dto.getConversationResponse.parse(response.data);

        return await handleGetConversationResponse(data);
      }
    } catch (error) {
      if (axiosInstance.isAxiosError(error) && error.status === 404) {
        const conversationNotFoundMessage = t("conversationNotFound");
        showNotifyMessage(conversationNotFoundMessage);
        await router.push({ name: "/" });
        throw new Error(conversationNotFoundMessage, { cause: error });
      }
      throw error;
    }
  }

  type FetchRecentPostSuccessResponse = AxiosSuccessResponse<FetchFeedResponse>;

  type FetchRecentPostResponse =
    | FetchRecentPostSuccessResponse
    | AxiosErrorResponse;

  interface FetchRecentPostProps {
    loadPersonalizedData: boolean;
    sortAlgorithm: FeedSortAlgorithm;
  }

  async function fetchRecentPost({
    loadPersonalizedData,
    sortAlgorithm,
  }: FetchRecentPostProps): Promise<FetchRecentPostResponse> {
    try {
      const params: ApiV1ConversationFetchRecentPostRequest = {
        sortAlgorithm: sortAlgorithm,
      };

      if (!loadPersonalizedData) {
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
      return createAxiosErrorResponse(e);
    }
  }

  async function fetchConversationCreateProjectOptions({
    postAsOrganizationSlug,
  }: {
    postAsOrganizationSlug: string;
  }): Promise<GetConversationCreateProjectOptionsResponse> {
    const url = "/api/v1/project/create-options/list";
    const params = Dto.getConversationCreateProjectOptionsRequest.parse({
      postAsOrganization: postAsOrganizationSlug,
    });
    const encodedUcan = await buildEncodedUcan(url, { method: "POST" });
    const response = await api.post(
      url,
      params,
      createRawAxiosRequestConfig({ encodedUcan })
    );
    return Dto.getConversationCreateProjectOptionsResponse.parse(response.data);
  }

  type CreateNewPostSuccessResponse =
    AxiosSuccessResponse<CreateNewConversationResponse>;
  type CreateNewPostResponse =
    | CreateNewPostSuccessResponse
    | AxiosErrorResponse;

  interface ImportConversationProps {
    polisUrl: string;
    projectSlug?: string;
    languageSettingsSource: ConversationLanguageSettingsSource;
    postAsOrganizationSlug: string;
    isIndexed: boolean;
    participationMode: ParticipationMode;
    multilingualSetting: ConversationMultilingualSetting;
    requiresEventTicket?: EventSlug;
    aiLabelingEnabled: boolean;
    preferredOpinionGroupCount: PreferredOpinionGroupCount;
  }

  type ImportConversationApiResponse =
    | AxiosSuccessResponse<ImportConversationResponse>
    | AxiosErrorResponse;

  interface ImportConversationFromCsvParams {
    summaryFile: File;
    commentsFile: File;
    votesFile: File;
    projectSlug?: string;
    languageSettingsSource: ConversationLanguageSettingsSource;
    postAsOrganizationSlug: string;
    isIndexed: boolean;
    participationMode: ParticipationMode;
    multilingualSetting: ConversationMultilingualSetting;
    requiresEventTicket?: EventSlug;
    aiLabelingEnabled: boolean;
    preferredOpinionGroupCount: PreferredOpinionGroupCount;
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
    formData.append("projectSlug", params.projectSlug ?? "");
    formData.append("languageSettingsSource", params.languageSettingsSource);
    formData.append("postAsOrganization", params.postAsOrganizationSlug);
    formData.append("isIndexed", String(params.isIndexed));
    formData.append("participationMode", params.participationMode);
    formData.append(
      "multilingualSetting",
      JSON.stringify(params.multilingualSetting)
    );
    formData.append("requiresEventTicket", params.requiresEventTicket || "");
    formData.append("aiLabelingEnabled", String(params.aiLabelingEnabled));
    formData.append(
      "preferredOpinionGroupCount",
      params.preferredOpinionGroupCount === null
        ? ""
        : String(params.preferredOpinionGroupCount)
    );

    // Get URL from OpenAPI spec
    const { url, options } =
      await DefaultApiAxiosParamCreator().apiV1ConversationImportCsvPost();
    const encodedUcan = await buildEncodedUcan(
      url,
      options,
      "create",
      FILE_UPLOAD_UCAN_LIFETIME_SECONDS
    );

    // Use createRawAxiosRequestConfig with file-upload timeout for large files
    const config = createRawAxiosRequestConfig({
      encodedUcan,
      timeoutProfile: "file-upload",
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
    projectSlug,
    languageSettingsSource,
    postAsOrganizationSlug,
    isIndexed,
    participationMode,
    multilingualSetting,
    requiresEventTicket,
    aiLabelingEnabled,
    preferredOpinionGroupCount,
  }: ImportConversationProps): Promise<ImportConversationApiResponse> {
    try {
      const params = Dto.importConversationRequest.parse({
        polisUrl,
        projectSlug,
        languageSettingsSource,
        postAsOrganization: postAsOrganizationSlug,
        isIndexed,
        participationMode,
        multilingualSetting,
        requiresEventTicket,
        aiLabelingEnabled,
        preferredOpinionGroupCount,
      });

      const url = "/api/v1/conversation/import";
      const options = { method: "POST" };
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await api.post(
        url,
        params,
        createRawAxiosRequestConfig({
          encodedUcan: encodedUcan,
          timeoutProfile: "extended",
        })
      );

      return {
        data: Dto.importConversationResponse.parse(response.data),
        status: "success",
      };
    } catch (e) {
      return createAxiosErrorResponse(e);
    }
  }

  async function createNewPost(
    request: CreateNewConversationRequest
  ): Promise<CreateNewPostResponse> {
    try {
      const params = Dto.createNewConversationRequest.parse(request);
      const url = "/api/v1/conversation/create";
      const options = { method: "POST" };
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await api.post(
        url,
        params,
        createRawAxiosRequestConfig({ encodedUcan: encodedUcan })
      );

      return {
        data: Dto.createNewConversationResponse.parse(response.data),
        status: "success",
      };
    } catch (e) {
      return createAxiosErrorResponse(e);
    }
  }

  function composeInternalPostList(
    incomingPostList: unknown[]
  ): ExtendedConversation[] {
    // Use zod to parse and validate - zodDateTimeFlexible handles date conversion automatically
    const conversationListResult = zodExtendedConversationData
      .array()
      .safeParse(incomingPostList);

    if (!conversationListResult.success) {
      console.error(
        "Failed to parse conversation data with zod:",
        conversationListResult.error
      );
      showNotifyMessage(t("invalidConversationData"));
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
      showNotifyMessage(t("failedToDeletePost"));
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
      const encodedUcan = await buildEncodedUcan(
        url,
        options,
        "create",
        FILE_UPLOAD_UCAN_LIFETIME_SECONDS
      );

      // Use file-upload timeout for validation (large files can take time to upload and parse)
      const config = createRawAxiosRequestConfig({
        encodedUcan,
        timeoutProfile: "file-upload",
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
    const params = { importSlugId };
    const { url, options } =
      await DefaultApiAxiosParamCreator().apiV1ConversationImportStatusPost(
        params
      );
    const encodedUcan = await buildEncodedUcan(url, options);

    const response = await DefaultApiFactory(
      undefined,
      undefined,
      api
    ).apiV1ConversationImportStatusPost(params, {
      headers: {
        ...buildAuthorizationHeader(encodedUcan),
      },
    });

    return Dto.getConversationImportStatusResponse.parse(response.data);
  }

  async function getActiveImport(): Promise<GetActiveImportResponse> {
    const { url, options } =
      await DefaultApiAxiosParamCreator().apiV1ConversationImportActivePost();
    const encodedUcan = await buildEncodedUcan(url, options);

    const response = await DefaultApiFactory(
      undefined,
      undefined,
      api
    ).apiV1ConversationImportActivePost({
      headers: {
        ...buildAuthorizationHeader(encodedUcan),
      },
    });

    return Dto.getActiveImportResponse.parse(response.data);
  }

  async function closeConversation(params: {
    conversationSlugId: string;
  }): Promise<{
    success: boolean;
    reason?: "not_allowed" | "already_closed";
  }> {
    const { url, options } =
      await DefaultApiAxiosParamCreator().apiV1ConversationClosePost({
        conversationSlugId: params.conversationSlugId,
      });
    const encodedUcan = await buildEncodedUcan(url, options);

    const response = await DefaultApiFactory(
      undefined,
      undefined,
      api
    ).apiV1ConversationClosePost(
      { conversationSlugId: params.conversationSlugId },
      {
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      }
    );

    const data = Dto.closeConversationResponse.parse(response.data);
    return data;
  }

  async function openConversation(params: {
    conversationSlugId: string;
  }): Promise<{
    success: boolean;
    reason?: "not_allowed" | "already_open";
  }> {
    const { url, options } =
      await DefaultApiAxiosParamCreator().apiV1ConversationOpenPost({
        conversationSlugId: params.conversationSlugId,
      });
    const encodedUcan = await buildEncodedUcan(url, options);

    const response = await DefaultApiFactory(
      undefined,
      undefined,
      api
    ).apiV1ConversationOpenPost(
      { conversationSlugId: params.conversationSlugId },
      {
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      }
    );

    const data = Dto.openConversationResponse.parse(response.data);
    return data;
  }

  return {
    createNewPost,
    fetchRecentPost,
    fetchConversationBySlugIdWithDisplayContent,
    deletePostBySlugId,
    importConversation,
    importConversationFromCsv,
    fetchConversationCreateProjectOptions,
    validateCsvFiles,
    getConversationImportStatus,
    getActiveImport,
    closeConversation,
    openConversation,
  };
}
