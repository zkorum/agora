import {
  type ApiV1VoteCastPostRequest,
  type ApiV1UserVoteGetByConversationsPostRequest,
  DefaultApiAxiosParamCreator,
  DefaultApiFactory,
} from "src/api";
import { api } from "./client";
import { buildAuthorizationHeader } from "../crypto/ucan/operation";
import { useCommonApi } from "./common";
import { type VotingAction } from "src/shared/types/zod";
import type { FetchUserVotesForPostSlugIdsResponse } from "src/shared/types/dto";

export function useBackendVoteApi() {
  const { buildEncodedUcan } = useCommonApi();

  async function castVoteForComment(
    commentSlugId: string,
    votingAction: VotingAction
  ): Promise<boolean> {
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

    return !!response; // Return true if response exists
  }

  async function fetchUserVotesForPostSlugIds(
    postSlugIdList: string[]
  ): Promise<FetchUserVotesForPostSlugIdsResponse> {
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

    return response.data || []; // Return data or empty array
  }

  return { fetchUserVotesForPostSlugIds, castVoteForComment };
}
