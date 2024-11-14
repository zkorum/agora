import { ApiV1VotingCastVotePostRequest, ApiV1VotingFetchUserVotesForPostSlugIdPostRequest, DefaultApiAxiosParamCreator, DefaultApiFactory } from "src/api";
import { api } from "src/boot/axios";
import { buildAuthorizationHeader } from "../crypto/ucan/operation";
import { useDialog } from "../ui/dialog";
import { useCommonApi } from "./common";
import { VotingAction } from "src/shared/types/zod";

export function useBackendVoteApi() {
  const { buildEncodedUcan } = useCommonApi();

  const { showMessage } = useDialog();

  async function castVoteForComment(commentSlugId: string, votingAction: VotingAction) {
    try {
      const params: ApiV1VotingCastVotePostRequest = {
        commentSlugId: commentSlugId,
        chosenOption: votingAction
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
      showMessage("An error had occured", "Failed to fetch user's personal votes.");
      return false;
    }
  }

  async function fetchUserVotesForPostSlugId(postSlugId: string) {
    try {
      const params: ApiV1VotingFetchUserVotesForPostSlugIdPostRequest = {
        postSlugId: postSlugId
      };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1VotingFetchUserVotesForPostSlugIdPost(params);
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1VotingFetchUserVotesForPostSlugIdPost(params, {
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      });

      return response.data;
    } catch (e) {
      console.error(e);
      showMessage("An error had occured", "Failed to fetch user's personal votes.");
      return undefined;
    }
  }

  return { fetchUserVotesForPostSlugId, castVoteForComment };
}
