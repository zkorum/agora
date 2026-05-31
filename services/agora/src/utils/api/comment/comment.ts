import { storeToRefs } from "pinia";
import type {
  ApiV1OpinionCreatePostRequest,
  ApiV1OpinionFetchAnalysisFrameGroupsByFramePostRequest,
  ApiV1OpinionFetchAnalysisFrameManifestByConversationPostRequest,
  ApiV1OpinionFetchAnalysisFrameOpinionListByFramePostRequest,
  ApiV1OpinionFetchByConversationPostRequest,
  ApiV1OpinionFetchBySlugIdListPostRequest,
  ApiV1OpinionFetchHiddenByConversationPostRequest,
  ApiV1UserOpinionFetchPost200ResponseInnerOpinionItem,
} from "src/api";
import { DefaultApiAxiosParamCreator, DefaultApiFactory } from "src/api";
import type {
  AnalysisFrameGroupLabels,
  AnalysisFrameGroups,
  AnalysisFrameKey,
  AnalysisFrameManifest,
  AnalysisFrameOpinionList,
  AnalysisFrameOpinionListKind,
  AnalysisFreshnessRequest,
  FetchAnalysisCheckpointsResponse,
  FetchCommentStatsResponse,
} from "src/shared/types/dto";
import { Dto } from "src/shared/types/dto";
import type { AnalysisView, OpinionItem, PolisKey } from "src/shared/types/zod";
import { zodOpinionItem } from "src/shared/types/zod";
import { useAuthenticationStore } from "src/stores/authentication";

import { useBackendAuthApi } from "../auth";
import { api } from "../client";
import { useCommonApi } from "../common";

export {
  type AnalysisData,
  buildAnalysisDataFromFrame,
  buildEmptyAnalysisDataFromManifest,
  hasManifestFrame,
} from "./analysisData";

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

  async function fetchAnalysisFrameManifest(params: {
    conversationSlugId: string;
    analysisView?: AnalysisView;
    checkpointViewSnapshotId?: number;
    freshness: AnalysisFreshnessRequest | null;
  }): Promise<AnalysisFrameManifest> {
    const requestParams: ApiV1OpinionFetchAnalysisFrameManifestByConversationPostRequest =
      {
        conversationSlugId: params.conversationSlugId,
        analysisView: params.analysisView,
        checkpointViewSnapshotId: params.checkpointViewSnapshotId,
        freshness: params.freshness,
      };

    if (isAuthInitialized.value && isGuestOrLoggedIn.value) {
      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1OpinionFetchAnalysisFrameManifestByConversationPost(
          requestParams
        );
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1OpinionFetchAnalysisFrameManifestByConversationPost(
        requestParams,
        createRawAxiosRequestConfig({
          encodedUcan,
          timeoutProfile: "extended",
        })
      );
      return Dto.analysisFrameManifest.parse(response.data);
    }

    const response = await DefaultApiFactory(
      undefined,
      undefined,
      api
    ).apiV1OpinionFetchAnalysisFrameManifestByConversationPost(
      requestParams,
      createRawAxiosRequestConfig({ timeoutProfile: "extended" })
    );
    return Dto.analysisFrameManifest.parse(response.data);
  }

  async function fetchAnalysisFrameGroups(params: {
    conversationSlugId: string;
    frameKey: AnalysisFrameKey;
    freshness: AnalysisFreshnessRequest | null;
  }): Promise<AnalysisFrameGroups> {
    const requestParams: ApiV1OpinionFetchAnalysisFrameGroupsByFramePostRequest =
      {
        conversationSlugId: params.conversationSlugId,
        frameKey: params.frameKey,
        freshness: params.freshness,
      };

    if (isAuthInitialized.value && isGuestOrLoggedIn.value) {
      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1OpinionFetchAnalysisFrameGroupsByFramePost(
          requestParams
        );
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1OpinionFetchAnalysisFrameGroupsByFramePost(
        requestParams,
        createRawAxiosRequestConfig({
          encodedUcan,
          timeoutProfile: "extended",
        })
      );
      return Dto.analysisFrameGroups.parse(response.data);
    }

    const response = await DefaultApiFactory(
      undefined,
      undefined,
      api
    ).apiV1OpinionFetchAnalysisFrameGroupsByFramePost(
      requestParams,
      createRawAxiosRequestConfig({ timeoutProfile: "extended" })
    );
    return Dto.analysisFrameGroups.parse(response.data);
  }

  async function fetchAnalysisFrameGroupLabels(params: {
    conversationSlugId: string;
    frameKey: AnalysisFrameKey;
    freshness: AnalysisFreshnessRequest | null;
  }): Promise<AnalysisFrameGroupLabels> {
    const requestParams: ApiV1OpinionFetchAnalysisFrameGroupsByFramePostRequest =
      {
        conversationSlugId: params.conversationSlugId,
        frameKey: params.frameKey,
        freshness: params.freshness,
      };

    if (isAuthInitialized.value && isGuestOrLoggedIn.value) {
      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1OpinionFetchAnalysisFrameGroupLabelsByFramePost(
          requestParams
        );
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1OpinionFetchAnalysisFrameGroupLabelsByFramePost(
        requestParams,
        createRawAxiosRequestConfig({
          encodedUcan,
          timeoutProfile: "extended",
        })
      );
      return Dto.analysisFrameGroupLabels.parse(response.data);
    }

    const response = await DefaultApiFactory(
      undefined,
      undefined,
      api
    ).apiV1OpinionFetchAnalysisFrameGroupLabelsByFramePost(
      requestParams,
      createRawAxiosRequestConfig({ timeoutProfile: "extended" })
    );
    return Dto.analysisFrameGroupLabels.parse(response.data);
  }

  async function fetchAnalysisFrameOpinionList(params: {
    conversationSlugId: string;
    frameKey: AnalysisFrameKey;
    kind: AnalysisFrameOpinionListKind;
    freshness: AnalysisFreshnessRequest | null;
  }): Promise<AnalysisFrameOpinionList> {
    const requestParams: ApiV1OpinionFetchAnalysisFrameOpinionListByFramePostRequest =
      {
        conversationSlugId: params.conversationSlugId,
        frameKey: params.frameKey,
        kind: params.kind,
        freshness: params.freshness,
      };

    if (isAuthInitialized.value && isGuestOrLoggedIn.value) {
      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1OpinionFetchAnalysisFrameOpinionListByFramePost(
          requestParams
        );
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1OpinionFetchAnalysisFrameOpinionListByFramePost(
        requestParams,
        createRawAxiosRequestConfig({
          encodedUcan,
          timeoutProfile: "extended",
        })
      );
      return Dto.analysisFrameOpinionList.parse(response.data);
    }

    const response = await DefaultApiFactory(
      undefined,
      undefined,
      api
    ).apiV1OpinionFetchAnalysisFrameOpinionListByFramePost(
      requestParams,
      createRawAxiosRequestConfig({ timeoutProfile: "extended" })
    );
    return Dto.analysisFrameOpinionList.parse(response.data);
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
    fetchAnalysisFrameManifest,
    fetchAnalysisFrameGroups,
    fetchAnalysisFrameGroupLabels,
    fetchAnalysisFrameOpinionList,
    fetchAnalysisCheckpoints,
  };
}
