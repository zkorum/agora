import type { ApiV1ContentTranslationRequestPostRequest } from "src/api";
import { DefaultApiAxiosParamCreator, DefaultApiFactory } from "src/api";
import type {
  ConversationContentFetchRequest,
  ProjectContentFetchRequest,
} from "src/shared/types/dto";
import { Dto } from "src/shared/types/dto";
import type { z } from "zod";

import { api } from "../client";
import { useCommonApi } from "../common";

export type RequestContentTranslationParams = ApiV1ContentTranslationRequestPostRequest;
export type ContentTranslationResponse = z.infer<
  typeof Dto.contentTranslationResponse
>;
export type ConversationContentFetchResponse = z.infer<
  typeof Dto.conversationContentFetchResponse
>;
export type ProjectContentFetchResponse = z.infer<
  typeof Dto.projectContentFetchResponse
>;

export function useBackendContentTranslationApi() {
  const { buildEncodedUcan, createRawAxiosRequestConfig } = useCommonApi();

  async function requestContentTranslation(
    params: RequestContentTranslationParams
  ): Promise<ContentTranslationResponse> {
    const parsedParams = Dto.contentTranslationRequest.parse(params);
    const { url, options } =
      await DefaultApiAxiosParamCreator().apiV1ContentTranslationRequestPost(
        parsedParams
      );
    const encodedUcan = await buildEncodedUcan(url, options);
    const response = await DefaultApiFactory(
      undefined,
      undefined,
      api
    ).apiV1ContentTranslationRequestPost(
      parsedParams,
      createRawAxiosRequestConfig({ encodedUcan })
    );

    return Dto.contentTranslationResponse.parse(response.data);
  }

  async function fetchConversationContent(
    params: ConversationContentFetchRequest
  ): Promise<ConversationContentFetchResponse> {
    const parsedParams = Dto.conversationContentFetchRequest.parse(params);
    const url = "/api/v1/conversation/content/fetch";
    const options = { method: "POST" };
    const encodedUcan = await buildEncodedUcan(url, options);
    const response = await api.post(
      url,
      parsedParams,
      createRawAxiosRequestConfig({ encodedUcan })
    );

    return Dto.conversationContentFetchResponse.parse(response.data);
  }

  async function fetchProjectContent(
    params: ProjectContentFetchRequest
  ): Promise<ProjectContentFetchResponse> {
    const parsedParams = Dto.projectContentFetchRequest.parse(params);
    const url = "/api/v1/project/content/fetch";
    const options = { method: "POST" };
    const encodedUcan = await buildEncodedUcan(url, options);
    const response = await api.post(
      url,
      parsedParams,
      createRawAxiosRequestConfig({ encodedUcan })
    );

    return Dto.projectContentFetchResponse.parse(response.data);
  }

  return { requestContentTranslation, fetchConversationContent, fetchProjectContent };
}
