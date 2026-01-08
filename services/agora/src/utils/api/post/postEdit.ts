import { DefaultApiAxiosParamCreator, DefaultApiFactory } from "src/api";
import {
  Dto,
  type GetConversationForEditResponse,
  type UpdateConversationRequest,
  type UpdateConversationResponse,
} from "src/shared/types/dto";

import { api } from "../client";
import { useCommonApi } from "../common";

export function useBackendPostEditApi() {
  const { buildEncodedUcan, createRawAxiosRequestConfig } = useCommonApi();

  /**
   * Get conversation data for editing
   */
  async function getConversationForEdit(
    conversationSlugId: string
  ): Promise<GetConversationForEditResponse> {
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

    return Dto.getConversationForEditResponse.parse(response.data);
  }

  /**
   * Update an existing conversation
   */
  async function updateConversation(
    data: UpdateConversationRequest
  ): Promise<UpdateConversationResponse> {
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

    return Dto.updateConversationResponse.parse(response.data);
  }

  return {
    getConversationForEdit,
    updateConversation,
  };
}
