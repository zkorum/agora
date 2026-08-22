import {
  type ConversationEmailUpdateActionManageOptOutRequest,
  type ConversationEmailUpdateActionManageOptOutResponse,
  type ConversationEmailUpdateActionReportRequest,
  type ConversationEmailUpdateActionReportResponse,
  type ConversationEmailUpdateActionResolveRequest,
  type ConversationEmailUpdateActionResolveResponse,
  type ConversationEmailUpdateActionUnsubscribeRequest,
  type ConversationEmailUpdateActionUnsubscribeResponse,
  Dto,
} from "src/shared/types/dto";

import { api } from "../client";

interface PublicActionRequestConfig {
  method: "POST";
  url: string;
  data: object;
}

export interface PublicActionHttpClient {
  request: (config: PublicActionRequestConfig) => Promise<{ data: unknown }>;
}

interface ResponseSchema<Response> {
  parse: (value: unknown) => Response;
}

export function createPublicConversationEmailUpdateActionsApi({
  client = api,
}: {
  client?: PublicActionHttpClient;
} = {}) {
  async function post<Response>({
    url,
    body,
    responseSchema,
  }: {
    url: string;
    body: object;
    responseSchema: ResponseSchema<Response>;
  }): Promise<Response> {
    const response = await client.request({ method: "POST", url, data: body });
    return responseSchema.parse(response.data);
  }

  async function resolve(
    request: ConversationEmailUpdateActionResolveRequest
  ): Promise<ConversationEmailUpdateActionResolveResponse> {
    return await post({
      url: "/api/v1/conversation/email-update/action/resolve",
      body: Dto.conversationEmailUpdateActionResolveRequest.parse(request),
      responseSchema: Dto.conversationEmailUpdateActionResolveResponse,
    });
  }

  async function unsubscribe(
    request: ConversationEmailUpdateActionUnsubscribeRequest
  ): Promise<ConversationEmailUpdateActionUnsubscribeResponse> {
    return await post({
      url: "/api/v1/conversation/email-update/action/unsubscribe",
      body: Dto.conversationEmailUpdateActionUnsubscribeRequest.parse(request),
      responseSchema: Dto.conversationEmailUpdateActionUnsubscribeResponse,
    });
  }

  async function optOut(
    request: ConversationEmailUpdateActionManageOptOutRequest
  ): Promise<ConversationEmailUpdateActionManageOptOutResponse> {
    return await post({
      url: "/api/v1/conversation/email-update/action/manage/opt-out",
      body: Dto.conversationEmailUpdateActionManageOptOutRequest.parse(request),
      responseSchema: Dto.conversationEmailUpdateActionManageOptOutResponse,
    });
  }

  async function report(
    request: ConversationEmailUpdateActionReportRequest
  ): Promise<ConversationEmailUpdateActionReportResponse> {
    return await post({
      url: "/api/v1/conversation/email-update/action/report",
      body: Dto.conversationEmailUpdateActionReportRequest.parse(request),
      responseSchema: Dto.conversationEmailUpdateActionReportResponse,
    });
  }

  return { resolve, unsubscribe, optOut, report };
}

export function usePublicConversationEmailUpdateActionsApi() {
  return createPublicConversationEmailUpdateActionsApi();
}
