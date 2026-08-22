import {
  type ConversationEmailUpdateAudienceEstimateRequest,
  type ConversationEmailUpdateAudienceEstimateResponse,
  type ConversationEmailUpdateConfigurationRequest,
  type ConversationEmailUpdateConfigurationResponse,
  type ConversationEmailUpdateConfigurationUpdateRequest,
  type ConversationEmailUpdateConfigurationUpdateResponse,
  type ConversationEmailUpdateConversationSummaryRequest,
  type ConversationEmailUpdateConversationSummaryResponse,
  type ConversationEmailUpdateHistoryDetailRequest,
  type ConversationEmailUpdateHistoryDetailResponse,
  type ConversationEmailUpdateHistoryListRequestInput,
  type ConversationEmailUpdateHistoryListResponse,
  type ConversationEmailUpdatePreferencesRequestInput,
  type ConversationEmailUpdatePreferencesResponse,
  type ConversationEmailUpdatePreferenceUpdateRequest,
  type ConversationEmailUpdatePreferenceUpdateResponse,
  type ConversationEmailUpdateSendRequest,
  type ConversationEmailUpdateSendResponse,
  type ConversationEmailUpdateSendTestRequest,
  type ConversationEmailUpdateSendTestResponse,
  type ConversationEmailUpdateTestStatusRequest,
  type ConversationEmailUpdateTestStatusResponse,
  type ConversationEmailUpdateWorkspaceRequest,
  type ConversationEmailUpdateWorkspaceResponse,
  Dto,
} from "src/shared/types/dto";

import { api } from "../client";
import { useCommonApi } from "../common";

interface ResponseSchema<Response> {
  parse: (value: unknown) => Response;
}

export function useBackendConversationEmailUpdatesApi() {
  const { buildEncodedUcan, createRawAxiosRequestConfig } = useCommonApi();

  async function post<Response>({
    url,
    body,
    responseSchema,
  }: {
    url: string;
    body: object;
    responseSchema: ResponseSchema<Response>;
  }): Promise<Response> {
    const options = { method: "POST" };
    const encodedUcan = await buildEncodedUcan(url, options);
    const response = await api.post<unknown>(
      url,
      body,
      createRawAxiosRequestConfig({ encodedUcan })
    );
    return responseSchema.parse(response.data);
  }

  function getWorkspace(
    request: ConversationEmailUpdateWorkspaceRequest
  ): Promise<ConversationEmailUpdateWorkspaceResponse> {
    return post({
      url: "/api/v1/conversation/email-update/workspace/get",
      body: Dto.conversationEmailUpdateWorkspaceRequest.parse(request),
      responseSchema: Dto.conversationEmailUpdateWorkspaceResponse,
    });
  }

  function listHistory(
    request: ConversationEmailUpdateHistoryListRequestInput
  ): Promise<ConversationEmailUpdateHistoryListResponse> {
    return post({
      url: "/api/v1/conversation/email-update/history/list",
      body: Dto.conversationEmailUpdateHistoryListRequest.parse(request),
      responseSchema: Dto.conversationEmailUpdateHistoryListResponse,
    });
  }

  function getHistoryDetail(
    request: ConversationEmailUpdateHistoryDetailRequest
  ): Promise<ConversationEmailUpdateHistoryDetailResponse> {
    return post({
      url: "/api/v1/conversation/email-update/history/detail",
      body: Dto.conversationEmailUpdateHistoryDetailRequest.parse(request),
      responseSchema: Dto.conversationEmailUpdateHistoryDetailResponse,
    });
  }

  function estimateAudience(
    request: ConversationEmailUpdateAudienceEstimateRequest
  ): Promise<ConversationEmailUpdateAudienceEstimateResponse> {
    return post({
      url: "/api/v1/conversation/email-update/audience/estimate",
      body: Dto.conversationEmailUpdateAudienceEstimateRequest.parse(request),
      responseSchema: Dto.conversationEmailUpdateAudienceEstimateResponse,
    });
  }

  function sendTest(
    request: ConversationEmailUpdateSendTestRequest
  ): Promise<ConversationEmailUpdateSendTestResponse> {
    return post({
      url: "/api/v1/conversation/email-update/test/send",
      body: Dto.conversationEmailUpdateSendTestRequest.parse(request),
      responseSchema: Dto.conversationEmailUpdateSendTestResponse,
    });
  }

  function getTestStatus(
    request: ConversationEmailUpdateTestStatusRequest
  ): Promise<ConversationEmailUpdateTestStatusResponse> {
    return post({
      url: "/api/v1/conversation/email-update/test/status",
      body: Dto.conversationEmailUpdateTestStatusRequest.parse(request),
      responseSchema: Dto.conversationEmailUpdateTestStatusResponse,
    });
  }

  function send(
    request: ConversationEmailUpdateSendRequest
  ): Promise<ConversationEmailUpdateSendResponse> {
    return post({
      url: "/api/v1/conversation/email-update/send",
      body: Dto.conversationEmailUpdateSendRequest.parse(request),
      responseSchema: Dto.conversationEmailUpdateSendResponse,
    });
  }

  function getPreferences(
    request: ConversationEmailUpdatePreferencesRequestInput
  ): Promise<ConversationEmailUpdatePreferencesResponse> {
    return post({
      url: "/api/v1/conversation/email-update/preferences/get",
      body: Dto.conversationEmailUpdatePreferencesRequest.parse(request),
      responseSchema: Dto.conversationEmailUpdatePreferencesResponse,
    });
  }

  function updatePreference(
    request: ConversationEmailUpdatePreferenceUpdateRequest
  ): Promise<ConversationEmailUpdatePreferenceUpdateResponse> {
    return post({
      url: "/api/v1/conversation/email-update/preferences/update",
      body: Dto.conversationEmailUpdatePreferenceUpdateRequest.parse(request),
      responseSchema: Dto.conversationEmailUpdatePreferenceUpdateResponse,
    });
  }

  function getConfiguration(
    request: ConversationEmailUpdateConfigurationRequest
  ): Promise<ConversationEmailUpdateConfigurationResponse> {
    return post({
      url: "/api/v1/conversation/email-update/configuration/get",
      body: Dto.conversationEmailUpdateConfigurationRequest.parse(request),
      responseSchema: Dto.conversationEmailUpdateConfigurationResponse,
    });
  }

  function updateConfiguration(
    request: ConversationEmailUpdateConfigurationUpdateRequest
  ): Promise<ConversationEmailUpdateConfigurationUpdateResponse> {
    return post({
      url: "/api/v1/conversation/email-update/configuration/update",
      body: Dto.conversationEmailUpdateConfigurationUpdateRequest.parse(
        request
      ),
      responseSchema: Dto.conversationEmailUpdateConfigurationUpdateResponse,
    });
  }

  function getConversationSummary(
    request: ConversationEmailUpdateConversationSummaryRequest
  ): Promise<ConversationEmailUpdateConversationSummaryResponse> {
    return post({
      url: "/api/v1/conversation/email-update/summary/get",
      body: Dto.conversationEmailUpdateConversationSummaryRequest.parse(
        request
      ),
      responseSchema: Dto.conversationEmailUpdateConversationSummaryResponse,
    });
  }

  return {
    getWorkspace,
    listHistory,
    getHistoryDetail,
    estimateAudience,
    sendTest,
    getTestStatus,
    send,
    getPreferences,
    updatePreference,
    getConfiguration,
    updateConfiguration,
    getConversationSummary,
  };
}
