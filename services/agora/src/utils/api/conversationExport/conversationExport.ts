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
      exportSlugId: item.exportSlugId,
      status: item.status,
      createdAt: new Date(item.createdAt),
      totalFileCount: item.totalFileCount,
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
      exportSlugId: response.data.exportSlugId,
    };
  }

  async function fetchExportStatus(
    exportSlugId: string
  ): Promise<GetConversationExportStatusResponse> {
    const { url, options } =
      await DefaultApiAxiosParamCreator().apiV1ConversationExportStatusExportSlugIdGet(
        exportSlugId
      );
    const encodedUcan = await buildEncodedUcan(url, options);

    const response = await DefaultApiFactory(
      undefined,
      undefined,
      api
    ).apiV1ConversationExportStatusExportSlugIdGet(
      exportSlugId,
      createRawAxiosRequestConfig({
        encodedUcan: encodedUcan,
        timeoutProfile: "standard",
      })
    );

    return {
      exportSlugId: response.data.exportSlugId,
      status: response.data.status,
      conversationSlugId: response.data.conversationSlugId,
      totalFileSize: response.data.totalFileSize,
      totalFileCount: response.data.totalFileCount,
      files: response.data.files?.map((file) => ({
        fileType: file.fileType,
        fileName: file.fileName,
        fileSize: file.fileSize,
        recordCount: file.recordCount,
        downloadUrl: file.downloadUrl,
        urlExpiresAt: new Date(file.urlExpiresAt),
      })),
      errorMessage: response.data.errorMessage,
      createdAt: new Date(response.data.createdAt),
    };
  }

  async function deleteExport(exportSlugId: string): Promise<void> {
    const { url, options } =
      await DefaultApiAxiosParamCreator().apiV1ConversationExportExportSlugIdDelete(
        exportSlugId
      );
    const encodedUcan = await buildEncodedUcan(url, options);

    await DefaultApiFactory(
      undefined,
      undefined,
      api
    ).apiV1ConversationExportExportSlugIdDelete(
      exportSlugId,
      createRawAxiosRequestConfig({
        encodedUcan: encodedUcan,
        timeoutProfile: "standard",
      })
    );
  }

  return {
    fetchExportHistory,
    requestNewExport,
    fetchExportStatus,
    deleteExport,
  };
}
