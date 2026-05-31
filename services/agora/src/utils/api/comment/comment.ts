import { storeToRefs } from "pinia";
import type {
  ApiV1OpinionCreatePostRequest,
  ApiV1OpinionFetchAnalysisContentByCandidatePost200Response,
  ApiV1OpinionFetchAnalysisContentByCandidatePostRequest,
  ApiV1OpinionFetchAnalysisMetadataByConversationPost200Response,
  ApiV1OpinionFetchAnalysisMetadataByConversationPostRequest,
  ApiV1OpinionFetchByConversationPostRequest,
  ApiV1OpinionFetchBySlugIdListPostRequest,
  ApiV1OpinionFetchHiddenByConversationPostRequest,
  ApiV1UserOpinionFetchPost200ResponseInnerOpinionItem,
} from "src/api";
import { DefaultApiAxiosParamCreator, DefaultApiFactory } from "src/api";
import type {
  AnalysisFreshnessRequest,
  ConversationAnalysisContent,
  ConversationAnalysisMetadata,
  FetchAnalysisCheckpointsResponse,
  FetchAnalysisContentResponse,
  FetchCommentStatsResponse,
} from "src/shared/types/dto";
import { Dto } from "src/shared/types/dto";
import type { AnalysisView, OpinionItem, PolisKey } from "src/shared/types/zod";
import { zodOpinionItem } from "src/shared/types/zod";
import { useAuthenticationStore } from "src/stores/authentication";

import { useBackendAuthApi } from "../auth";
import { api } from "../client";
import { useCommonApi } from "../common";
import { type AnalysisData, buildAnalysisData } from "./analysisData";

export { type AnalysisData, buildAnalysisData } from "./analysisData";

export type CommentTabFilters =
  | "new"
  | "moderated"
  | "discover"
  | "hidden"
  | "my_votes";

type CreateNewCommentResult =
  | {
      success: true;
      opinionSlugId: string;
      opinionItem: OpinionItem;
      authStateChanged: boolean;
      needsCacheRefresh: boolean;
    }
  | {
      success: false;
      reason?: string;
    };

export function useBackendCommentApi() {
  const { buildEncodedUcan, createRawAxiosRequestConfig } = useCommonApi();
  const { isGuestOrLoggedIn, isAuthInitialized } = storeToRefs(
    useAuthenticationStore()
  );
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

  async function fetchCommentStatsForPost(
    postSlugId: string
  ): Promise<FetchCommentStatsResponse> {
    const params = {
      conversationSlugId: postSlugId,
    };

    const response = await DefaultApiFactory(
      undefined,
      undefined,
      api
    ).apiV1OpinionFetchCommentStatsByConversationPost(
      params,
      createRawAxiosRequestConfig({ timeoutProfile: "extended" })
    );

    return Dto.fetchCommentStatsResponse.parse(response.data);
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
  ): Promise<CreateNewCommentResult> {
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
        opinionItem: data.opinionItem,
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

  async function fetchAnalysisMetadataData(params: {
    conversationSlugId: string;
    analysisView?: AnalysisView;
    checkpointViewSnapshotId?: number;
    freshness: AnalysisFreshnessRequest | null;
  }): Promise<ConversationAnalysisMetadata> {
    const requestParams: ApiV1OpinionFetchAnalysisMetadataByConversationPostRequest =
      {
        conversationSlugId: params.conversationSlugId,
        analysisView: params.analysisView,
        checkpointViewSnapshotId: params.checkpointViewSnapshotId,
        freshness: params.freshness,
      };
    let data: ApiV1OpinionFetchAnalysisMetadataByConversationPost200Response;
    // Use authenticated endpoint only if auth is initialized AND user is logged in/guest
    if (isAuthInitialized.value && isGuestOrLoggedIn.value) {
      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1OpinionFetchAnalysisMetadataByConversationPost(
          requestParams
        );
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1OpinionFetchAnalysisMetadataByConversationPost(
        requestParams,
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
      ).apiV1OpinionFetchAnalysisMetadataByConversationPost(
        requestParams,
        createRawAxiosRequestConfig({ timeoutProfile: "extended" })
      );
      data = response.data;
    }

    return Dto.fetchAnalysisMetadataResponse.parse(data);
  }

  async function fetchAnalysisContentData(params: {
    conversationSlugId: string;
    conversationViewSnapshotId: number;
    candidateId: number;
    freshness: AnalysisFreshnessRequest | null;
  }): Promise<ConversationAnalysisContent | null> {
    const requestParams: ApiV1OpinionFetchAnalysisContentByCandidatePostRequest =
      {
        conversationSlugId: params.conversationSlugId,
        conversationViewSnapshotId: params.conversationViewSnapshotId,
        candidateId: params.candidateId,
        freshness: params.freshness,
      };
    let data: ApiV1OpinionFetchAnalysisContentByCandidatePost200Response;
    // Use authenticated endpoint only if auth is initialized AND user is logged in/guest
    if (isAuthInitialized.value && isGuestOrLoggedIn.value) {
      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1OpinionFetchAnalysisContentByCandidatePost(
          requestParams
        );
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1OpinionFetchAnalysisContentByCandidatePost(
        requestParams,
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
      ).apiV1OpinionFetchAnalysisContentByCandidatePost(
        requestParams,
        createRawAxiosRequestConfig({ timeoutProfile: "extended" })
      );
      data = response.data;
    }

    const parsed: FetchAnalysisContentResponse =
      Dto.fetchAnalysisContentResponse.parse(data);
    if (!parsed.success) {
      return null;
    }

    return parsed;
  }

  async function fetchAnalysisData(params: {
    conversationSlugId: string;
    analysisView?: AnalysisView;
    checkpointViewSnapshotId?: number;
  }): Promise<AnalysisData> {
    const metadata = await fetchAnalysisMetadataData({
      ...params,
      freshness: null,
    });
    const candidateId = metadata.analysisViewState.resolvedCandidateId;
    if (
      metadata.conversationViewSnapshotId === undefined ||
      candidateId === null
    ) {
      return buildAnalysisData({ metadata });
    }

    const content = await fetchAnalysisContentData({
      conversationSlugId: params.conversationSlugId,
      conversationViewSnapshotId: metadata.conversationViewSnapshotId,
      candidateId,
      freshness: null,
    });
    return buildAnalysisData({ metadata, content });
  }

  async function fetchAnalysisCheckpoints(params: {
    conversationSlugId: string;
  }): Promise<FetchAnalysisCheckpointsResponse> {
    const response = await DefaultApiFactory(
      undefined,
      undefined,
      api
    ).apiV1OpinionFetchAnalysisCheckpointsByConversationPost(
      { conversationSlugId: params.conversationSlugId },
      createRawAxiosRequestConfig({ timeoutProfile: "extended" })
    );

    return Dto.fetchAnalysisCheckpointsResponse.parse(response.data);
  }

  return {
    createNewComment,
    fetchCommentsForPost,
    fetchHiddenCommentsForPost,
    fetchCommentStatsForPost,
    deleteCommentBySlugId,
    fetchOpinionsBySlugIdList,
    fetchAnalysisMetadataData,
    fetchAnalysisContentData,
    fetchAnalysisData,
    fetchAnalysisCheckpoints,
  };
}
