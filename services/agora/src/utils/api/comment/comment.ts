import { storeToRefs } from "pinia";
import type {
  ApiV1OpinionFetchAnalysisFrameGroupsByFramePostRequest,
  ApiV1OpinionFetchAnalysisFrameManifestByConversationPostRequest,
  ApiV1OpinionFetchAnalysisFrameOpinionListByFramePostRequest,
  ApiV1OpinionFetchBySlugIdListPostRequest,
  ApiV1OpinionNextUnansweredPostRequest,
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
  CreateCommentResponse,
  CreateOpinionRequest,
  FetchAnalysisCheckpointsResponse,
  FetchCommentStatsResponse,
  FetchNextUnansweredOpinionResponse,
} from "src/shared/types/dto";
import { Dto } from "src/shared/types/dto";
import type {
  AnalysisView,
  DisplayedOpinionItem,
  OpinionItem,
} from "src/shared/types/zod";
import { useAuthenticationStore } from "src/stores/authentication";
import { waitForAuthInitialization } from "src/utils/auth/waitForAuthInitialization";
import type { z } from "zod";

import { useBackendAuthApi } from "../auth";
import { api } from "../client";
import { useCommonApi } from "../common";
import { type OpinionPageRequest, type OpinionPageResult,parseOpinionPageResponse } from "./opinionPageBoundary";

export {
  type AnalysisData,
  buildAnalysisDataFromFrame,
  buildEmptyAnalysisDataFromManifest,
  hasManifestFrame,
  mergeLiveAnalysisSnapshotMetadata,
} from "./analysisData";

export type CommentTabFilters = OpinionPageRequest["filter"];

type CreateNewCommentResult =
  | {
      success: true;
      opinionSlugId: string;
      opinionItem: OpinionItem;
      displayedOpinionItem: DisplayedOpinionItem;
      authStateChanged: boolean;
      needsCacheRefresh: boolean;
    }
  | {
      success: false;
      reason?: Extract<CreateCommentResponse, { success: false }>["reason"];
    };

export function useBackendCommentApi() {
  const { buildEncodedUcan, createRawAxiosRequestConfig } = useCommonApi();
  const { isGuestOrLoggedIn } = storeToRefs(useAuthenticationStore());
  const { updateAuthState } = useBackendAuthApi();

  async function fetchOpinionPage(request: OpinionPageRequest): Promise<OpinionPageResult> {
    const { conversationSlugId, filter, cursor } = request;
    await waitForAuthInitialization();
    if (filter === "hidden") {
      const input: z.input<typeof Dto.fetchHiddenOpinionPageRequest> = {
        conversationSlugId,
        cursor,
      };
      const params = Dto.fetchHiddenOpinionPageRequest.parse(input);
      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1OpinionFetchHiddenPagePost(
          params
        );
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1OpinionFetchHiddenPagePost(
        params,
        createRawAxiosRequestConfig({ encodedUcan, timeoutProfile: "extended" })
      );
      return parseOpinionPageResponse({ request, rawResponse: response.data });
    }

    const input: z.input<typeof Dto.fetchOpinionPageRequest> = request.filter === "discover"
      ? { conversationSlugId, filter: request.filter, cursor: request.cursor }
      : request.filter === "my_votes"
        ? { conversationSlugId, filter: request.filter, cursor: request.cursor }
        : { conversationSlugId, filter: request.filter, cursor: request.cursor };
    const params = Dto.fetchOpinionPageRequest.parse(input);
    const { url, options } =
      await DefaultApiAxiosParamCreator().apiV1OpinionFetchPagePost(params);
    const encodedUcan = isGuestOrLoggedIn.value
      ? await buildEncodedUcan(url, options)
      : undefined;
    const response = await DefaultApiFactory(
      undefined,
      undefined,
      api
    ).apiV1OpinionFetchPagePost(
      params,
      createRawAxiosRequestConfig({ encodedUcan, timeoutProfile: "extended" })
    );
    return parseOpinionPageResponse({ request, rawResponse: response.data });
  }

  async function fetchNextUnansweredOpinion({
    conversationSlugId,
    order,
    excludedOpinionSlugIds,
  }: {
    conversationSlugId: string;
    order: "discover" | "new";
    excludedOpinionSlugIds: string[];
  }): Promise<FetchNextUnansweredOpinionResponse> {
    const params: ApiV1OpinionNextUnansweredPostRequest = {
      conversationSlugId,
      order,
      excludedOpinionSlugIds,
    };
    await waitForAuthInitialization();
    const { url, options } =
      await DefaultApiAxiosParamCreator().apiV1OpinionNextUnansweredPost(
        params
      );
    const encodedUcan = isGuestOrLoggedIn.value
      ? await buildEncodedUcan(url, options)
      : undefined;
    const response = await DefaultApiFactory(
      undefined,
      undefined,
      api
    ).apiV1OpinionNextUnansweredPost(
      params,
      createRawAxiosRequestConfig({ encodedUcan, timeoutProfile: "extended" })
    );
    return Dto.fetchNextUnansweredOpinionResponse.parse(response.data);
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

  async function createNewComment({
    commentBody,
    postSlugId,
  }: {
    commentBody: string;
    postSlugId: string;
  }): Promise<CreateNewCommentResult> {
    const params: CreateOpinionRequest = {
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
        displayedOpinionItem: data.displayedOpinionItem,
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
  ): Promise<DisplayedOpinionItem[]> {
    const params: ApiV1OpinionFetchBySlugIdListPostRequest = {
      opinionSlugIdList: opinionSlugIdList,
    };

    await waitForAuthInitialization();

    if (isGuestOrLoggedIn.value) {
      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1OpinionFetchBySlugIdListPost(
          params
        );
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1OpinionFetchBySlugIdListPost(
        params,
        createRawAxiosRequestConfig({ encodedUcan: encodedUcan })
      );

      return Dto.getOpinionBySlugIdListResponse.parse(response.data);
    }

    const response = await DefaultApiFactory(
      undefined,
      undefined,
      api
    ).apiV1OpinionFetchBySlugIdListPost(
      params,
      createRawAxiosRequestConfig({})
    );

    return Dto.getOpinionBySlugIdListResponse.parse(response.data);
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

    await waitForAuthInitialization();

    if (isGuestOrLoggedIn.value) {
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

    await waitForAuthInitialization();

    if (isGuestOrLoggedIn.value) {
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

    await waitForAuthInitialization();

    if (isGuestOrLoggedIn.value) {
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

    await waitForAuthInitialization();

    if (isGuestOrLoggedIn.value) {
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
    fetchOpinionPage,
    fetchNextUnansweredOpinion,
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
