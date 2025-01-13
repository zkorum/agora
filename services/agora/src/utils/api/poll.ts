import { api } from "boot/axios";
import { buildAuthorizationHeader } from "../crypto/ucan/operation";
import {
  DefaultApiAxiosParamCreator,
  DefaultApiFactory,
  type ApiV1PollRespondPostRequest,
} from "src/api";
import { useCommonApi } from "./common";
import { useNotify } from "../ui/notify";

export function useBackendPollApi() {
  const { buildEncodedUcan } = useCommonApi();

  const { showNotifyMessage } = useNotify();

  async function fetchUserPollResponse(postSlugIdList: string[]) {
    try {
      const params = postSlugIdList;

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1UserPollGetResponseByConversationsPost(
          params
        );
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1UserPollGetResponseByConversationsPost(params, {
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      });

      const userResponseList = response.data;
      const responseMap = new Map<string, number>();
      userResponseList.forEach((response) => {
        responseMap.set(response.conversationSlugId, response.optionChosen);
      });

      return responseMap;
    } catch (e) {
      console.error(e);
      showNotifyMessage("Failed to submit poll response.");
      return new Map<string, number>();
    }
  }

  async function submitPollResponse(voteIndex: number, postSlugId: string) {
    try {
      const params: ApiV1PollRespondPostRequest = {
        conversationSlugId: postSlugId,
        voteOptionChoice: voteIndex + 1,
      };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1PollRespondPost(params);
      const encodedUcan = await buildEncodedUcan(url, options);
      await DefaultApiFactory(undefined, undefined, api).apiV1PollRespondPost(
        params,
        {
          headers: {
            ...buildAuthorizationHeader(encodedUcan),
          },
        }
      );

      return true;
    } catch (e) {
      console.error(e);
      showNotifyMessage("Failed to submit poll response.");
      return false;
    }
  }

  return { submitPollResponse, fetchUserPollResponse };
}
