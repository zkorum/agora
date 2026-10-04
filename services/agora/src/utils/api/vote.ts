import {
  type ApiV1UserVoteGetByConversationsPostRequest,
  type ApiV1VoteCastPostRequest,
  DefaultApiAxiosParamCreator,
  DefaultApiFactory,
} from "src/api";
import { type CastVoteResponse, Dto, type FetchUserVotesForPostSlugIdsResponse } from "src/shared/types/dto";
import { type VotingAction } from "src/shared/types/zod";
import { useAuthenticationStore } from "src/stores/authentication";

import { buildAuthorizationHeader } from "../crypto/ucan/operation";
import { api } from "./client";
import { useCommonApi } from "./common";

export function useBackendVoteApi() {
  const { buildEncodedUcan, createRawAxiosRequestConfig } = useCommonApi();
  const authStore = useAuthenticationStore();

  async function castVoteForComment({
    opinionSlugId,
    votingAction,
    returnIsUserClustered,
    isCurrent,
  }: {
    opinionSlugId: string;
    votingAction: VotingAction;
    returnIsUserClustered: boolean;
    isCurrent: () => boolean;
  }): Promise<CastVoteResponse> {
    const params: ApiV1VoteCastPostRequest = {
      opinionSlugId,
      chosenOption: votingAction,
      returnIsUserClustered,
    };

    const { url, options: requestOptions } =
      await DefaultApiAxiosParamCreator().apiV1VoteCastPost(params);
    const encodedUcan = await buildEncodedUcan(url, requestOptions);
    // Signing can outlive the session during logout or an account switch.
    if (!isCurrent()) throw new DOMException("Voting session changed", "AbortError");
    const response = await DefaultApiFactory(
      undefined,
      undefined,
      api
    ).apiV1VoteCastPost(params, {
      headers: {
        ...buildAuthorizationHeader(encodedUcan),
      },
    });

    const data = Dto.castVoteResponse.parse(response.data);
    return data;
  }

  async function fetchUserVotesForPostSlugIds({
    conversationSlugIdList,
    signal,
  }: {
    conversationSlugIdList: string[];
    signal?: AbortSignal;
  }): Promise<FetchUserVotesForPostSlugIdsResponse> {
    // Guard: Never fetch votes for unauthenticated users
    if (!authStore.isGuestOrLoggedIn) {
      return []; // Return empty array for unauthenticated users
    }

    const params: ApiV1UserVoteGetByConversationsPostRequest = {
      conversationSlugIdList,
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
    ).apiV1UserVoteGetByConversationsPost(params, createRawAxiosRequestConfig({ encodedUcan, signal }));

    return Dto.getUserVotesByConversationsResponse.parse(response.data);
  }

  return { fetchUserVotesForPostSlugIds, castVoteForComment };
}
