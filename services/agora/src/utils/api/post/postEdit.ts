import {
  type ApiV1ConversationGetForEditPost200Response,
  type ApiV1ConversationUpdatePost200Response,
  type ApiV1ConversationUpdatePostRequest,
  DefaultApiAxiosParamCreator,
  DefaultApiFactory,
} from "src/api";

import { api } from "../client";
import { useCommonApi } from "../common";

export function useBackendPostEditApi() {
  const { buildEncodedUcan, createRawAxiosRequestConfig } = useCommonApi();

  /**
   * Get conversation data for editing
   */
  async function getConversationForEdit(
    conversationSlugId: string
  ): Promise<ApiV1ConversationGetForEditPost200Response> {
    const params = { conversationSlugId };
    const { url, options } =
      await DefaultApiAxiosParamCreator().apiV1ConversationGetForEditPost(
        params
      );
    const encodedUcan = await buildEncodedUcan(url, options);

    const response = await DefaultApiFactory(
      undefined,
      undefined,
      api
    ).apiV1ConversationGetForEditPost(
      params,
      createRawAxiosRequestConfig({ encodedUcan })
    );

    return response.data;
  }

  /**
   * Update an existing conversation
   */
  async function updateConversation(
    data: ApiV1ConversationUpdatePostRequest
  ): Promise<ApiV1ConversationUpdatePost200Response> {
    const { url, options } =
      await DefaultApiAxiosParamCreator().apiV1ConversationUpdatePost(data);
    const encodedUcan = await buildEncodedUcan(url, options);

    const response = await DefaultApiFactory(
      undefined,
      undefined,
      api
    ).apiV1ConversationUpdatePost(
      data,
      createRawAxiosRequestConfig({ encodedUcan })
    );

    return response.data;
  }

  return {
    getConversationForEdit,
    updateConversation,
  };
}
