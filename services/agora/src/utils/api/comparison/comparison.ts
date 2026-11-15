import type {
  ApiV1RankingBwsItemsLifecycleUpdatePostRequest,
  ApiV1RankingBwsResultsPostRequest,
  ApiV1RankingBwsSavePostRequest,
} from "src/api";
import { DefaultApiAxiosParamCreator, DefaultApiFactory } from "src/api";
import {
  type ComparisonLoadResponse,
  type ComparisonResultsResponse,
  type ComparisonSaveResponse,
  type ComparisonSyncResponse,
  Dto,
  type PrioritizationItemsFetchResponse,
  type RankingStatsCheckpointsResponse,
} from "src/shared/types/dto";
import { buildUcanForRequestWithDid } from "src/utils/crypto/ucan/operation";
import type { z } from "zod";

import { useBackendAuthApi } from "../auth";
import { api } from "../client";
import type { AxiosErrorResponse, AxiosSuccessResponse } from "../common";
import { useCommonApi } from "../common";

export function useComparisonApi() {
  const { applyAcceptedParticipationAuth } = useBackendAuthApi();
  const {
    buildEncodedUcan,
    createRawAxiosRequestConfig,
    createAxiosErrorResponse,
  } = useCommonApi();

  interface SaveComparisonParams extends z.input<
    typeof Dto.comparisonSaveRequest
  > {
    isCurrent?: () => boolean;
  }

  type SaveComparisonResponseApi =
    | AxiosSuccessResponse<ComparisonSaveResponse>
    | AxiosErrorResponse;

  async function saveComparisonResponse({
    isCurrent = () => true,
    ...request
  }: SaveComparisonParams): Promise<SaveComparisonResponseApi> {
    try {
      const params: ApiV1RankingBwsSavePostRequest =
        Dto.comparisonSaveRequest.parse(request);

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1RankingBwsSavePost(params);
      const encodedUcan = await buildEncodedUcan(url, options);
      if (!isCurrent())
        throw new DOMException("Voting session changed", "AbortError");
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1RankingBwsSavePost(
        params,
        createRawAxiosRequestConfig({ encodedUcan })
      );

      return {
        status: "success",
        data: Dto.comparisonSaveResponse.parse(response.data),
      };
    } catch (e) {
      return createAxiosErrorResponse(e);
    }
  }

  interface LoadComparisonParams {
    conversationSlugId: string;
    signal?: AbortSignal;
  }

  type LoadComparisonSuccessResponse =
    AxiosSuccessResponse<ComparisonLoadResponse>;
  type LoadComparisonResponse =
    | LoadComparisonSuccessResponse
    | AxiosErrorResponse;

  async function loadComparisonResponse({
    conversationSlugId,
    signal,
  }: LoadComparisonParams): Promise<LoadComparisonResponse> {
    try {
      const params = { conversationSlugId };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1RankingBwsLoadPost(params);
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1RankingBwsLoadPost(
        params,
        createRawAxiosRequestConfig({ encodedUcan, signal })
      );

      return {
        status: "success",
        data: Dto.comparisonLoadResponse.parse(response.data),
      };
    } catch (e) {
      return createAxiosErrorResponse(e);
    }
  }

  interface LiveComparisonResultsParams {
    conversationSlugId: string;
    lifecycleFilter?: ApiV1RankingBwsResultsPostRequest["lifecycleFilter"];
    requestedRankingStatsSnapshotId?: number;
    rankingStatsSnapshotId?: never;
  }

  interface HistoricalComparisonResultsParams {
    conversationSlugId: string;
    lifecycleFilter?: "active";
    requestedRankingStatsSnapshotId?: never;
    rankingStatsSnapshotId: number;
  }

  type GetComparisonResultsParams =
    | LiveComparisonResultsParams
    | HistoricalComparisonResultsParams;

  type GetComparisonResultsSuccessResponse =
    AxiosSuccessResponse<ComparisonResultsResponse>;
  type GetComparisonResultsResponse =
    | GetComparisonResultsSuccessResponse
    | AxiosErrorResponse;

  async function getComparisonResults({
    conversationSlugId,
    lifecycleFilter,
    rankingStatsSnapshotId,
    requestedRankingStatsSnapshotId,
  }: GetComparisonResultsParams): Promise<GetComparisonResultsResponse> {
    try {
      const params = {
        conversationSlugId,
        lifecycleFilter,
        rankingStatsSnapshotId,
        requestedRankingStatsSnapshotId,
      };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1RankingBwsResultsPost(params);
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1RankingBwsResultsPost(
        params,
        createRawAxiosRequestConfig({ encodedUcan })
      );

      return {
        status: "success",
        data: Dto.comparisonResultsResponse.parse(response.data),
      };
    } catch (e) {
      return createAxiosErrorResponse(e);
    }
  }

  type FetchRankingStatsCheckpointsResponse =
    | AxiosSuccessResponse<RankingStatsCheckpointsResponse>
    | AxiosErrorResponse;

  async function fetchRankingStatsCheckpoints({
    conversationSlugId,
    requestedRankingStatsSnapshotId,
  }: {
    conversationSlugId: string;
    requestedRankingStatsSnapshotId: number | undefined;
  }): Promise<FetchRankingStatsCheckpointsResponse> {
    try {
      const params = {
        conversationSlugId,
        requestedRankingStatsSnapshotId,
      };
      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1RankingBwsStatsCheckpointsPost(
          params
        );
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1RankingBwsStatsCheckpointsPost(
        params,
        createRawAxiosRequestConfig({ encodedUcan })
      );
      return {
        status: "success",
        data: Dto.rankingStatsCheckpointsResponse.parse(response.data),
      };
    } catch (e) {
      return createAxiosErrorResponse(e);
    }
  }

  interface FetchComparisonItemsParams {
    conversationSlugId: string;
    lifecycleFilter?: ApiV1RankingBwsResultsPostRequest["lifecycleFilter"];
    signal?: AbortSignal;
  }

  type FetchComparisonItemsResponse =
    | AxiosSuccessResponse<PrioritizationItemsFetchResponse>
    | AxiosErrorResponse;

  async function fetchComparisonItems({
    conversationSlugId,
    lifecycleFilter,
    signal,
  }: FetchComparisonItemsParams): Promise<FetchComparisonItemsResponse> {
    try {
      const params = { conversationSlugId, lifecycleFilter };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1PrioritizationItemsFetchPost(
          params
        );
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1PrioritizationItemsFetchPost(
        params,
        createRawAxiosRequestConfig({ encodedUcan, signal })
      );

      return {
        status: "success",
        data: Dto.prioritizationItemsFetchResponse.parse(response.data),
      };
    } catch (e) {
      return createAxiosErrorResponse(e);
    }
  }

  interface UpdateComparisonItemLifecycleParams {
    conversationSlugId: string;
    itemSlugId: string;
    newStatus: ApiV1RankingBwsItemsLifecycleUpdatePostRequest["newStatus"];
  }

  type UpdateComparisonItemLifecycleResponse =
    | AxiosSuccessResponse<void>
    | AxiosErrorResponse;

  async function updateComparisonItemLifecycle({
    conversationSlugId,
    itemSlugId,
    newStatus,
  }: UpdateComparisonItemLifecycleParams): Promise<UpdateComparisonItemLifecycleResponse> {
    try {
      const params = { conversationSlugId, itemSlugId, newStatus };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1RankingBwsItemsLifecycleUpdatePost(
          params
        );
      const encodedUcan = await buildEncodedUcan(url, options);
      await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1RankingBwsItemsLifecycleUpdatePost(
        params,
        createRawAxiosRequestConfig({ encodedUcan })
      );

      return { status: "success", data: undefined };
    } catch (e) {
      return createAxiosErrorResponse(e);
    }
  }

  interface SyncComparisonParams {
    conversationSlugId: string;
  }

  type SyncComparisonResponse =
    | AxiosSuccessResponse<ComparisonSyncResponse>
    | AxiosErrorResponse;

  async function syncComparisonSource({
    conversationSlugId,
  }: SyncComparisonParams): Promise<SyncComparisonResponse> {
    try {
      const params = { conversationSlugId };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1RankingBwsSyncPost(params);
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1RankingBwsSyncPost(
        params,
        createRawAxiosRequestConfig({ encodedUcan })
      );

      return {
        status: "success",
        data: Dto.comparisonSyncResponse.parse(response.data),
      };
    } catch (e) {
      return createAxiosErrorResponse(e);
    }
  }

  interface PreviewGitHubIssuesParams {
    repository: string;
    label: string;
  }

  type PreviewGitHubIssuesResponse =
    | AxiosSuccessResponse<z.infer<typeof Dto.comparisonGitHubPreviewResponse>>
    | AxiosErrorResponse;

  async function previewGitHubIssues({
    repository,
    label,
  }: PreviewGitHubIssuesParams): Promise<PreviewGitHubIssuesResponse> {
    try {
      const params = { repository, label };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1RankingBwsGithubPreviewPost(
          params
        );
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1RankingBwsGithubPreviewPost(
        params,
        createRawAxiosRequestConfig({ encodedUcan })
      );

      return {
        status: "success",
        data: Dto.comparisonGitHubPreviewResponse.parse(response.data),
      };
    } catch (e) {
      return createAxiosErrorResponse(e);
    }
  }

  async function createStatement({
    isCurrent,
    ...request
  }: z.infer<typeof Dto.createComparisonStatementRequest> & {
    isCurrent: () => boolean;
  }) {
    const params = Dto.createComparisonStatementRequest.parse(request);
    const { url, options } =
      await DefaultApiAxiosParamCreator().apiV1PrioritizationComparisonsStatementsCreatePost(
        params
      );
    const { encodedUcan, didWrite } = await buildUcanForRequestWithDid({
      pathname: url,
      method: options.method,
    });
    if (!isCurrent()) return undefined;
    const response = await DefaultApiFactory(
      undefined,
      undefined,
      api
    ).apiV1PrioritizationComparisonsStatementsCreatePost(
      params,
      createRawAxiosRequestConfig({ encodedUcan })
    );
    if (!isCurrent()) return undefined;
    const data = Dto.createComparisonStatementResponse.parse(response.data);
    if (data.success)
      await applyAcceptedParticipationAuth({
        loginStatus: data.loginStatus,
        didWrite,
        isCurrent,
      });
    return isCurrent() ? data : undefined;
  }
  return {
    createStatement,
    saveComparisonResponse,
    loadComparisonResponse,
    getComparisonResults,
    fetchRankingStatsCheckpoints,
    fetchComparisonItems,
    updateComparisonItemLifecycle,
    syncComparisonSource,
    previewGitHubIssues,
  };
}
