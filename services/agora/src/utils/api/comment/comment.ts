import { storeToRefs } from "pinia";
import type {
  ApiV1OpinionFetchAnalysisFrameGroupsByFramePostRequest,
  ApiV1OpinionFetchAnalysisFrameManifestByConversationPostRequest,
  ApiV1OpinionFetchBySlugIdListPostRequest,
  ApiV1OpinionNextUnansweredPostRequest,
} from "src/api";
import { DefaultApiAxiosParamCreator, DefaultApiFactory } from "src/api";
import type {
  AnalysisFrameContent,
  AnalysisFrameGroupLabels,
  AnalysisFrameKey,
  AnalysisFrameManifest,
  CreateCommentResponse,
  CreateOpinionRequest,
  FetchAnalysisCheckpointsResponse,
  FetchCommentStatsResponse,
  FetchNextUnansweredOpinionResponse,
  GetOpinionBySlugIdListResponse,
  SetClosedAnalysisInputModeRequest,
  SetClosedAnalysisInputModeResponse,
} from "src/shared/types/dto";
import { Dto } from "src/shared/types/dto";
import type { AnalysisView } from "src/shared/types/zod";
import { useAuthenticationStore } from "src/stores/authentication";
import { useOpinionRedactionStore } from "src/stores/opinionRedaction";
import type { ParticipationRequestResult } from "src/utils/api/participation/requestResult";
import { waitForAuthInitialization } from "src/utils/auth/waitForAuthInitialization";
import { buildUcanForRequestWithDid } from "src/utils/crypto/ucan/operation";
import type { z } from "zod";

import { useBackendAuthApi } from "../auth";
import { api } from "../client";
import { useCommonApi } from "../common";
import {
  type OpinionPageRequest,
  type OpinionPageResult,
  parseOpinionPageResponse,
} from "./opinionPageBoundary";

export {
  type AnalysisData,
  buildAnalysisDataFromFrame,
  buildEmptyAnalysisDataFromManifest,
  hasManifestFrame,
  mergeLiveAnalysisSnapshotMetadata,
} from "./analysisData";

type CreateNewCommentResult =
  | (Extract<CreateCommentResponse, { success: true }> & {
      authStateChanged: boolean;
      needsCacheRefresh: boolean;
    })
  | Extract<CreateCommentResponse, { success: false }>;

interface AnalysisReadScope {
  displayLanguage: string;
  viewerUserId: string | undefined;
  signal: AbortSignal;
}

export function useBackendCommentApi() {
  const redactions = useOpinionRedactionStore();
  const { buildEncodedUcan, createRawAxiosRequestConfig } = useCommonApi();
  const { isGuestOrLoggedIn, userId } = storeToRefs(useAuthenticationStore());
  const { applyAcceptedParticipationAuth } = useBackendAuthApi();

  async function fetchOpinionPage(
    request: OpinionPageRequest & { signal?: AbortSignal }
  ): Promise<OpinionPageResult> {
    const { signal, ...pageRequest } = request;
    await waitForAuthInitialization();
    if (pageRequest.filter === "hidden") {
      const input: z.input<typeof Dto.fetchHiddenOpinionPageRequest> = {
        conversationSlugId: pageRequest.conversationSlugId,
        cursor: pageRequest.cursor,
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
        createRawAxiosRequestConfig({
          encodedUcan,
          timeoutProfile: "extended",
          signal,
        })
      );
      return parseOpinionPageResponse({ request, rawResponse: response.data });
    }

    const params = Dto.fetchOpinionPageRequest.parse(pageRequest);
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
      createRawAxiosRequestConfig({
        encodedUcan,
        timeoutProfile: "extended",
        signal,
      })
    );
    return parseOpinionPageResponse({ request, rawResponse: response.data });
  }

  async function fetchNextUnansweredOpinion({
    conversationSlugId,
    order,
    excludedOpinionSlugIds,
    signal,
  }: {
    conversationSlugId: string;
    order: "discover" | "new";
    excludedOpinionSlugIds: readonly string[];
    signal?: AbortSignal;
  }): Promise<FetchNextUnansweredOpinionResponse> {
    const params: ApiV1OpinionNextUnansweredPostRequest = {
      conversationSlugId,
      order,
      excludedOpinionSlugIds: [...excludedOpinionSlugIds],
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
      createRawAxiosRequestConfig({
        encodedUcan,
        timeoutProfile: "extended",
        signal,
      })
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
    isCurrent,
  }: {
    commentBody: string;
    postSlugId: string;
    isCurrent: () => boolean;
  }): Promise<ParticipationRequestResult<CreateNewCommentResult>> {
    try {
      const params: CreateOpinionRequest = {
        opinionBody: commentBody,
        conversationSlugId: postSlugId,
      };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1OpinionCreatePost(params);
      const { encodedUcan, didWrite } = await buildUcanForRequestWithDid({
        pathname: url,
        method: options.method,
      });
      if (!isCurrent()) return { status: "cancelled" };
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1OpinionCreatePost(
        params,
        createRawAxiosRequestConfig({ encodedUcan: encodedUcan })
      );
      if (!isCurrent()) return { status: "cancelled" };

      const data = Dto.createOpinionResponse.parse(response.data);

      if (data.success) {
        const { authStateChanged, needsCacheRefresh } =
          await applyAcceptedParticipationAuth({
            loginStatus: data.loginStatus,
            didWrite,
            isCurrent,
          });
        if (!isCurrent()) return { status: "cancelled" };
        return {
          status: "completed",
          data: {
            ...data,
            authStateChanged,
            needsCacheRefresh,
          },
        };
      } else {
        return { status: "completed", data };
      }
    } catch (error) {
      if (!isCurrent()) return { status: "cancelled" };
      throw error;
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

  async function editOpinion(
    request: z.infer<typeof Dto.editOpinionRequest>
  ): Promise<z.infer<typeof Dto.editOpinionResponse>> {
    const params = Dto.editOpinionRequest.parse(request);
    const { url, options } =
      await DefaultApiAxiosParamCreator().apiV1OpinionEditPost(params);
    const encodedUcan = await buildEncodedUcan(url, options);
    const response = await DefaultApiFactory(
      undefined,
      undefined,
      api
    ).apiV1OpinionEditPost(
      params,
      createRawAxiosRequestConfig({ encodedUcan })
    );
    return Dto.editOpinionResponse.parse(response.data);
  }

  async function fetchOpinionsBySlugIdList({
    opinionSlugIdList,
    signal,
  }: {
    opinionSlugIdList: string[];
    signal?: AbortSignal;
  }): Promise<GetOpinionBySlugIdListResponse> {
    const params: ApiV1OpinionFetchBySlugIdListPostRequest = {
      opinionSlugIdList: opinionSlugIdList,
    };

    await waitForAuthInitialization();

    const { url, options } =
      await DefaultApiAxiosParamCreator().apiV1OpinionFetchBySlugIdListPost(
        params
      );
    const encodedUcan = isGuestOrLoggedIn.value
      ? await buildEncodedUcan(url, options)
      : undefined;
    const response = await DefaultApiFactory(
      undefined,
      undefined,
      api
    ).apiV1OpinionFetchBySlugIdListPost(
      params,
      createRawAxiosRequestConfig({ encodedUcan, signal })
    );

    return Dto.getOpinionBySlugIdListResponse.parse(response.data);
  }

  async function setClosedAnalysisInputMode({
    request,
    isCurrent,
  }: {
    request: SetClosedAnalysisInputModeRequest;
    isCurrent: () => boolean;
  }): Promise<SetClosedAnalysisInputModeResponse> {
    await waitForAuthInitialization();
    const { url, options } =
      await DefaultApiAxiosParamCreator().apiV1ConversationAnalysisInputModeSetPost(
        request
      );
    const encodedUcan = await buildEncodedUcan(url, options);
    if (!isCurrent())
      throw new DOMException("Analysis selection changed", "AbortError");
    const response = await DefaultApiFactory(
      undefined,
      undefined,
      api
    ).apiV1ConversationAnalysisInputModeSetPost(
      request,
      createRawAxiosRequestConfig({ encodedUcan })
    );
    return Dto.setClosedAnalysisInputModeResponse.parse(response.data);
  }

  async function analysisReadConfig({
    scope,
    requestArgs,
  }: {
    scope: AnalysisReadScope;
    requestArgs: () => Promise<{
      url: string;
      options: Parameters<typeof buildEncodedUcan>[1];
    }>;
  }) {
    const checkScope = () => {
      scope.signal.throwIfAborted();
      if (
        scope.viewerUserId !== undefined &&
        (!isGuestOrLoggedIn.value || userId.value !== scope.viewerUserId)
      )
        throw new DOMException("Analysis viewer changed", "AbortError");
    };
    let encodedUcan: string | undefined;
    if (scope.viewerUserId !== undefined) {
      await waitForAuthInitialization();
      checkScope();
      const { url, options } = await requestArgs();
      encodedUcan = await buildEncodedUcan(url, options, "get");
    }
    checkScope();
    const config = createRawAxiosRequestConfig({
      encodedUcan,
      timeoutProfile: "extended",
      signal: scope.signal,
    });
    return {
      ...config,
      headers: { ...config.headers, "Accept-Language": scope.displayLanguage },
    };
  }
  async function fetchAnalysisFrameManifest(
    params: AnalysisReadScope & {
      conversationSlugId: string;
      analysisView?: AnalysisView;
      checkpointViewSnapshotId?: number;
    }
  ): Promise<AnalysisFrameManifest> {
    const requestParams: ApiV1OpinionFetchAnalysisFrameManifestByConversationPostRequest =
      {
        conversationSlugId: params.conversationSlugId,
        analysisView: params.analysisView,
        checkpointViewSnapshotId: params.checkpointViewSnapshotId,
      };
    const config = await analysisReadConfig({
      scope: params,
      requestArgs: () =>
        DefaultApiAxiosParamCreator().apiV1OpinionFetchAnalysisFrameManifestByConversationPost(
          requestParams
        ),
    });
    const response = await DefaultApiFactory(
      undefined,
      undefined,
      api
    ).apiV1OpinionFetchAnalysisFrameManifestByConversationPost(
      requestParams,
      config
    );
    return Dto.analysisFrameManifest.parse(response.data);
  }

  async function fetchAnalysisFrameContent(
    params: AnalysisReadScope & {
      conversationSlugId: string;
      frameKey: AnalysisFrameKey;
    }
  ): Promise<AnalysisFrameContent> {
    const requestParams: ApiV1OpinionFetchAnalysisFrameGroupsByFramePostRequest =
      {
        conversationSlugId: params.conversationSlugId,
        frameKey: params.frameKey,
      };

    const config = await analysisReadConfig({
      scope: params,
      requestArgs: () =>
        DefaultApiAxiosParamCreator().apiV1OpinionFetchAnalysisFrameContentByFramePost(
          requestParams
        ),
    });
    const response = await DefaultApiFactory(
      undefined,
      undefined,
      api
    ).apiV1OpinionFetchAnalysisFrameContentByFramePost(requestParams, config);
    return redactions.projectFrameContent(
      Dto.analysisFrameContent.parse(response.data)
    );
  }

  async function fetchAnalysisFrameGroupLabels(params: {
    conversationSlugId: string;
    frameKey: AnalysisFrameKey;
    displayLanguage: string;
    signal: AbortSignal;
  }): Promise<AnalysisFrameGroupLabels> {
    const requestParams: ApiV1OpinionFetchAnalysisFrameGroupsByFramePostRequest =
      {
        conversationSlugId: params.conversationSlugId,
        frameKey: params.frameKey,
      };

    const response = await DefaultApiFactory(
      undefined,
      undefined,
      api
    ).apiV1OpinionFetchAnalysisFrameGroupLabelsByFramePost(requestParams, {
      ...createRawAxiosRequestConfig({
        timeoutProfile: "extended",
        signal: params.signal,
      }),
      headers: { "Accept-Language": params.displayLanguage },
    });
    return Dto.analysisFrameGroupLabels.parse(response.data);
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
    editOpinion,
    createNewComment,
    fetchOpinionPage,
    fetchNextUnansweredOpinion,
    fetchCommentStatsForPost,
    deleteCommentBySlugId,
    fetchOpinionsBySlugIdList,
    fetchAnalysisFrameManifest,
    setClosedAnalysisInputMode,
    fetchAnalysisFrameContent,
    fetchAnalysisFrameGroupLabels,
    fetchAnalysisCheckpoints,
  };
}
