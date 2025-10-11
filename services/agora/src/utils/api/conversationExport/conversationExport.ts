import { api } from "../client";
import {
  DefaultApiAxiosParamCreator,
  DefaultApiFactory,
  type ApiV1ModerationConversationWithdrawPostRequest,
} from "src/api";
import { useCommonApi } from "../common";
import type {
  RequestConversationExportResponse,
  GetConversationExportStatusResponse,
  GetConversationExportHistoryResponse,
} from "src/shared/types/dto";

export function useBackendConversationExportApi() {
  const { buildEncodedUcan, createRawAxiosRequestConfig } = useCommonApi();

  async function fetchExportHistory(
    conversationSlugId: string
  ): Promise<GetConversationExportHistoryResponse> {
    const { url, options } =
      await DefaultApiAxiosParamCreator().apiV1ConversationExportHistoryConversationSlugIdGet(
        conversationSlugId
      );
    const encodedUcan = await buildEncodedUcan(url, options);

    const response = await DefaultApiFactory(
      undefined,
      undefined,
      api
    ).apiV1ConversationExportHistoryConversationSlugIdGet(
      conversationSlugId,
      createRawAxiosRequestConfig({
        encodedUcan: encodedUcan,
        timeoutProfile: "standard",
      })
    );

    return response.data.map((item) => ({
      exportId: item.exportId,
      status: item.status,
      createdAt: new Date(item.createdAt),
      downloadUrl: item.downloadUrl,
      urlExpiresAt: item.urlExpiresAt ? new Date(item.urlExpiresAt) : undefined,
    }));
  }

  async function requestNewExport(
    conversationSlugId: string
  ): Promise<RequestConversationExportResponse> {
    const params: ApiV1ModerationConversationWithdrawPostRequest = {
      conversationSlugId,
    };

    const { url, options } =
      await DefaultApiAxiosParamCreator().apiV1ConversationExportRequestPost(
        params
      );
    const encodedUcan = await buildEncodedUcan(url, options);

    const response = await DefaultApiFactory(
      undefined,
      undefined,
      api
    ).apiV1ConversationExportRequestPost(
      params,
      createRawAxiosRequestConfig({
        encodedUcan: encodedUcan,
        timeoutProfile: "extended",
      })
    );

    return {
      exportId: response.data.exportId,
      status: response.data.status,
      estimatedCompletionTime: new Date(response.data.estimatedCompletionTime),
    };
  }

  async function fetchExportStatus(
    exportId: number
  ): Promise<GetConversationExportStatusResponse> {
    const { url, options } =
      await DefaultApiAxiosParamCreator().apiV1ConversationExportStatusExportIdGet(
        exportId
      );
    const encodedUcan = await buildEncodedUcan(url, options);

    const response = await DefaultApiFactory(
      undefined,
      undefined,
      api
    ).apiV1ConversationExportStatusExportIdGet(
      exportId,
      createRawAxiosRequestConfig({
        encodedUcan: encodedUcan,
        timeoutProfile: "standard",
      })
    );

    return {
      exportId: response.data.exportId,
      status: response.data.status,
      conversationSlugId: response.data.conversationSlugId,
      downloadUrl: response.data.downloadUrl,
      urlExpiresAt: response.data.urlExpiresAt
        ? new Date(response.data.urlExpiresAt)
        : undefined,
      fileSize: response.data.fileSize,
      opinionCount: response.data.opinionCount,
      errorMessage: response.data.errorMessage,
      createdAt: new Date(response.data.createdAt),
    };
  }

  return {
    fetchExportHistory,
    requestNewExport,
    fetchExportStatus,
  };
}
