import {
  type ApiV1ModerationConversationWithdrawPostRequest,
  DefaultApiAxiosParamCreator,
  DefaultApiFactory,
} from "src/api";
import type {
  GetConversationExportHistoryResponse,
  GetConversationExportStatusResponse,
  GetExportReadinessResponse,
  RequestConversationExportResponse,
} from "src/shared/types/dto";
import { Dto } from "src/shared/types/dto";

import { api } from "../client";
import { useCommonApi } from "../common";

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

    // Parse and validate response with Zod
    const parsed = Dto.getConversationExportHistoryResponse.parse(
      response.data
    );
    return parsed;
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

    // Parse and validate response with Zod (handles discriminated union)
    const parsed = Dto.requestConversationExportResponse.parse(response.data);
    return parsed;
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

    // Parse and validate response with Zod (handles discriminated union)
    // Return as-is with ISO string dates - components will convert when needed
    const parsed = Dto.getConversationExportStatusResponse.parse(response.data);
    return parsed;
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

  async function fetchExportReadiness(
    conversationSlugId: string
  ): Promise<GetExportReadinessResponse> {
    const { url, options } =
      await DefaultApiAxiosParamCreator().apiV1ConversationExportReadinessConversationSlugIdGet(
        conversationSlugId
      );
    const encodedUcan = await buildEncodedUcan(url, options);

    const response = await DefaultApiFactory(
      undefined,
      undefined,
      api
    ).apiV1ConversationExportReadinessConversationSlugIdGet(
      conversationSlugId,
      createRawAxiosRequestConfig({
        encodedUcan: encodedUcan,
        timeoutProfile: "standard",
      })
    );

    const parsed = Dto.getExportReadinessResponse.parse(response.data);
    return parsed;
  }

  return {
    fetchExportHistory,
    requestNewExport,
    fetchExportStatus,
    deleteExport,
    fetchExportReadiness,
  };
}
