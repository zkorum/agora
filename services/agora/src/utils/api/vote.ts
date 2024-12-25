import {
  type ApiV1VotingCastVotePostRequest,
  type ApiV1VotingFetchUserVotesForPostSlugIdsPostRequest,
  DefaultApiAxiosParamCreator,
  DefaultApiFactory,
} from "src/api";
import { api } from "boot/axios";
import { buildAuthorizationHeader } from "../crypto/ucan/operation";
import { useCommonApi } from "./common";
import { type VotingAction } from "src/shared/types/zod";
import { useNotify } from "../ui/notify";

export function useBackendVoteApi() {
  const { buildEncodedUcan } = useCommonApi();

  const { showNotifyMessage } = useNotify();

  async function castVoteForComment(
    commentSlugId: string,
    votingAction: VotingAction
  ) {
    try {
      const params: ApiV1VotingCastVotePostRequest = {
        commentSlugId: commentSlugId,
        chosenOption: votingAction,
      };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1VotingCastVotePost(params);
      const encodedUcan = await buildEncodedUcan(url, options);
      await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1VotingCastVotePost(params, {
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      });

      return true;
    } catch (e) {
      console.error(e);
      showNotifyMessage("Failed to cast vote for the comment.");
      return false;
    }
  }

  async function fetchUserVotesForPostSlugIds(postSlugIdList: string[]) {
    try {
      const params: ApiV1VotingFetchUserVotesForPostSlugIdsPostRequest = {
        postSlugIdList: postSlugIdList,
      };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1VotingFetchUserVotesForPostSlugIdsPost(
          params
        );
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1VotingFetchUserVotesForPostSlugIdsPost(params, {
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
