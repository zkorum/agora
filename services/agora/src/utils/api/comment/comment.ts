import { storeToRefs } from "pinia";
import {
  type ApiV1OpinionCreatePostRequest,
  type ApiV1OpinionFetchAnalysisByConversationPost200Response,
  type ApiV1OpinionFetchByConversationPostRequest,
  type ApiV1OpinionFetchBySlugIdListPostRequest,
  type ApiV1OpinionFetchHiddenByConversationPostRequest,
  type ApiV1UserOpinionFetchPost200ResponseInnerOpinionItem,
  DefaultApiAxiosParamCreator,
  DefaultApiFactory,
} from "src/api";
import { Dto } from "src/shared/types/dto";
import type {
  AnalysisOpinionItem,
  OpinionItem,
  PolisClusters,
  PolisKey,
} from "src/shared/types/zod";
import { zodOpinionItem } from "src/shared/types/zod";
import { useAuthenticationStore } from "src/stores/authentication";

import { useBackendAuthApi } from "../auth";
import { api } from "../client";
import { useCommonApi } from "../common";

export type CommentTabFilters = "new" | "moderated" | "discover" | "hidden" | "my_votes";

export function useBackendCommentApi() {
  const { buildEncodedUcan, createRawAxiosRequestConfig } = useCommonApi();
  const { isGuestOrLoggedIn, isAuthInitialized } = storeToRefs(useAuthenticationStore());
  const { updateAuthState } = useBackendAuthApi();

  function createLocalCommentObject(
    webCommentItemList: ApiV1UserOpinionFetchPost200ResponseInnerOpinionItem[]
  ): OpinionItem[] {
    // Use zod to parse and validate - zodDateTimeFlexible handles date conversion automatically
    const result = zodOpinionItem.array().safeParse(webCommentItemList);

    if (!result.success) {
      console.error("Failed to parse opinion data with zod:", result.error);
      return [];
    }

    return result.data;
  }

  async function fetchHiddenCommentsForPost(
    postSlugId: string
  ): Promise<OpinionItem[]> {
    const params: ApiV1OpinionFetchHiddenByConversationPostRequest = {
      conversationSlugId: postSlugId,
    };

    const { url, options } =
      await DefaultApiAxiosParamCreator().apiV1OpinionFetchHiddenByConversationPost(
        params
      );
    const encodedUcan = await buildEncodedUcan(url, options);

    const response = await DefaultApiFactory(
      undefined,
      undefined,
      api
    ).apiV1OpinionFetchHiddenByConversationPost(
      params,
      createRawAxiosRequestConfig({
        encodedUcan: encodedUcan,
        timeoutProfile: "extended",
      })
    );

    return createLocalCommentObject(response.data);
  }

  async function fetchCommentsForPost(
    postSlugId: string,
    filter: CommentTabFilters,
    clusterKey: PolisKey | undefined
  ): Promise<OpinionItem[]> {
    const params: ApiV1OpinionFetchByConversationPostRequest = {
      conversationSlugId: postSlugId,
      filter: filter,
      clusterKey: clusterKey,
    };

    // Use authenticated endpoint only if auth is initialized AND user is logged in/guest
    if (isAuthInitialized.value && isGuestOrLoggedIn.value) {
      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1OpinionFetchByConversationPost(
          params
        );
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1OpinionFetchByConversationPost(
        params,
        createRawAxiosRequestConfig({
          encodedUcan: encodedUcan,
          timeoutProfile: "extended",
        })
      );

      return createLocalCommentObject(response.data);
    } else {
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1OpinionFetchByConversationPost(
        params,
        createRawAxiosRequestConfig({ timeoutProfile: "extended" })
      );

      return createLocalCommentObject(response.data);
    }
  }

  async function createNewComment(
    commentBody: string,
    postSlugId: string
  ): Promise<{
    success: boolean;
    opinionSlugId?: string;
    reason?: string;
    authStateChanged?: boolean;
    needsCacheRefresh?: boolean;
  }> {
    const params: ApiV1OpinionCreatePostRequest = {
      opinionBody: commentBody,
      conversationSlugId: postSlugId,
    };

    const { url, options } =
      await DefaultApiAxiosParamCreator().apiV1OpinionCreatePost(params);
    const encodedUcan = await buildEncodedUcan(url, options);
    const response = await DefaultApiFactory(
      undefined,
      undefined,
      api
    ).apiV1OpinionCreatePost(
      params,
      createRawAxiosRequestConfig({ encodedUcan: encodedUcan })
    );

    const data = Dto.createOpinionResponse.parse(response.data);

    if (data.success) {
      // TODO: properly manage errors in backend and return login status to update to
      const { authStateChanged, needsCacheRefresh } = await updateAuthState({
        partialLoginStatus: { isKnown: true },
      });
      return {
        success: true,
        opinionSlugId: data.opinionSlugId,
        authStateChanged,
        needsCacheRefresh,
      };
    } else {
      return {
        success: false,
        reason: data.reason,
      };
    }
  }

  async function deleteCommentBySlugId(commentSlugId: string): Promise<void> {
    const params = {
      opinionSlugId: commentSlugId,
    };

    const { url, options } =
      await DefaultApiAxiosParamCreator().apiV1OpinionDeletePost(params);
    const encodedUcan = await buildEncodedUcan(url, options);
    await DefaultApiFactory(undefined, undefined, api).apiV1OpinionDeletePost(
      params,
      createRawAxiosRequestConfig({
        encodedUcan: encodedUcan,
        timeoutProfile: "standard",
      })
    );
  }

  async function fetchOpinionsBySlugIdList(
    opinionSlugIdList: string[]
  ): Promise<OpinionItem[]> {
    const params: ApiV1OpinionFetchBySlugIdListPostRequest = {
      opinionSlugIdList: opinionSlugIdList,
    };

    const response = await DefaultApiFactory(
      undefined,
      undefined,
      api
    ).apiV1OpinionFetchBySlugIdListPost(
      params,
      createRawAxiosRequestConfig({})
    );

    const opinionItemList: OpinionItem[] = [];
    for (const item of response.data) {
      opinionItemList.push(createLocalCommentObject([item])[0]);
    }

    return opinionItemList;
  }

  async function fetchAnalysisData(params: {
    conversationSlugId: string;
  }): Promise<{
    consensusAgree: AnalysisOpinionItem[];
    consensusDisagree: AnalysisOpinionItem[];
    controversial: AnalysisOpinionItem[];
    polisClusters: Partial<PolisClusters>;
  }> {
    let data: ApiV1OpinionFetchAnalysisByConversationPost200Response;
    // Use authenticated endpoint only if auth is initialized AND user is logged in/guest
    if (isAuthInitialized.value && isGuestOrLoggedIn.value) {
      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1OpinionFetchAnalysisByConversationPost(
          params
        );
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1OpinionFetchAnalysisByConversationPost(
        params,
        createRawAxiosRequestConfig({
          encodedUcan: encodedUcan,
          timeoutProfile: "extended",
        })
      );
      data = response.data;
    } else {
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1OpinionFetchAnalysisByConversationPost(
        params,
        createRawAxiosRequestConfig({ timeoutProfile: "extended" })
      );
      data = response.data;
    }

    // Use zod to parse and validate - zodDateTimeFlexible handles date conversion automatically
    const parsedData = Dto.fetchAnalysisResponse.parse(data);

    return {
      consensusAgree: parsedData.consensusAgree,
      consensusDisagree: parsedData.consensusDisagree,
      controversial: parsedData.controversial,
      polisClusters: parsedData.clusters ?? {},
    };
  }

  return {
    createNewComment,
    fetchCommentsForPost,
    fetchHiddenCommentsForPost,
    deleteCommentBySlugId,
    fetchOpinionsBySlugIdList,
    fetchAnalysisData,
  };
}
