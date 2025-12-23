import {
  type ApiV1UserVoteGetByConversationsPostRequest,
  type ApiV1VoteCastPostRequest,
  DefaultApiAxiosParamCreator,
  DefaultApiFactory,
} from "src/api";
import type { CastVoteResponse,FetchUserVotesForPostSlugIdsResponse } from "src/shared/types/dto";
import { type VotingAction } from "src/shared/types/zod";

import { buildAuthorizationHeader } from "../crypto/ucan/operation";
import { api } from "./client";
import { useCommonApi } from "./common";

export function useBackendVoteApi() {
  const { buildEncodedUcan } = useCommonApi();

  async function castVoteForComment(
    commentSlugId: string,
    votingAction: VotingAction
  ): Promise<CastVoteResponse> {
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

    return response.data;
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
