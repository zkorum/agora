import {
  type ApiV1VoteCastPostRequest,
  type ApiV1UserVoteGetByConversationsPostRequest,
  DefaultApiAxiosParamCreator,
  DefaultApiFactory,
} from "src/api";
import { api } from "boot/axios";
import { buildAuthorizationHeader } from "../crypto/ucan/operation";
import { useCommonApi } from "./common";
import { type VotingAction } from "src/shared/types/zod";
import { useNotify } from "../ui/notify";
import { FetchUserVotesForPostSlugIdsResponse } from "src/shared/types/dto";

export function useBackendVoteApi() {
  const { buildEncodedUcan } = useCommonApi();

  const { showNotifyMessage } = useNotify();

  async function castVoteForComment(
    commentSlugId: string,
    votingAction: VotingAction
  ) {
    try {
      const params: ApiV1VoteCastPostRequest = {
        opinionSlugId: commentSlugId,
        chosenOption: votingAction,
      };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1VoteCastPost(params);
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1VoteCastPost(params, {
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      });

      return response;
    } catch (e) {
      console.error(e);
      showNotifyMessage("Failed to cast vote for the comment.");
      return false;
    }
  }

  async function fetchUserVotesForPostSlugIds(
    postSlugIdList: string[]
  ): Promise<undefined | FetchUserVotesForPostSlugIdsResponse> {
    try {
      const params: ApiV1UserVoteGetByConversationsPostRequest = {
        conversationSlugIdList: postSlugIdList,
      };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1UserVoteGetByConversationsPost(
          params
        );
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1UserVoteGetByConversationsPost(params, {
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      });

      return response.data;
    } catch (e) {
      console.error(e);
      showNotifyMessage("Failed to fetch user's personal votes for the post.");
      return undefined;
    }
  }

  return { fetchUserVotesForPostSlugIds, castVoteForComment };
}
