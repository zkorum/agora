import {
  ApiV1ConversationGetPolisClustersInfoPost200Response,
  ApiV1ModerationConversationWithdrawPostRequest,
  DefaultApiAxiosParamCreator,
  DefaultApiFactory,
} from "src/api";
import { api } from "src/boot/axios";
import { buildAuthorizationHeader } from "../crypto/ucan/operation";
import { useCommonApi } from "./common";
import { ClusterMetadata } from "src/shared/types/zod";

export function useBackendPolisApi() {
  const { buildEncodedUcan } = useCommonApi();

  async function getPolisClustersInfo(
    conversationSlugId: string
  ): Promise<ClusterMetadata[]> {
    const params: ApiV1ModerationConversationWithdrawPostRequest = {
      conversationSlugId: conversationSlugId,
    };
    const { url, options } =
      await DefaultApiAxiosParamCreator().apiV1ConversationGetPolisClustersInfoPost(
        params
      );
    const encodedUcan = await buildEncodedUcan(url, options);

    const response = await DefaultApiFactory(
      undefined,
      undefined,
      api
    ).apiV1ConversationGetPolisClustersInfoPost(params, {
      headers: {
        ...buildAuthorizationHeader(encodedUcan),
      },
    });

    return response.data.clusters;
  }

  return {
    getPolisClustersInfo,
  };
}
