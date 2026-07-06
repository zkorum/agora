import type {
  ApiV1RankingBwsGithubPreviewPost200Response,
  ApiV1RankingBwsItemsLifecycleUpdatePostRequest,
  ApiV1RankingBwsLoadPost200Response,
  ApiV1RankingBwsResultsPostRequest,
  ApiV1RankingBwsSavePostRequest,
  ApiV1RankingBwsSyncPost200Response,
} from "src/api";
import {
  DefaultApiAxiosParamCreator,
  DefaultApiFactory,
} from "src/api";
import {
  Dto,
  type MaxDiffItemsFetchResponse,
  type MaxDiffResultsResponse,
  type MaxDiffSaveResponse,
} from "src/shared/types/dto";
import type { MaxDiffComparison } from "src/shared/types/zod";

import { api } from "../client";
import type { AxiosErrorResponse, AxiosSuccessResponse } from "../common";
import { useCommonApi } from "../common";

export function useMaxDiffApi() {
  const {
    buildEncodedUcan,
    createRawAxiosRequestConfig,
    createAxiosErrorResponse,
  } = useCommonApi();

  interface SaveMaxDiffParams {
    conversationSlugId: string;
    ranking: string[] | null;
    comparisons: MaxDiffComparison[];
    isComplete: boolean;
  }

  type SaveMaxDiffResponseApi =
    | AxiosSuccessResponse<MaxDiffSaveResponse>
    | AxiosErrorResponse;

  async function saveMaxDiffResult({
    conversationSlugId,
    ranking,
    comparisons,
    isComplete,
  }: SaveMaxDiffParams): Promise<SaveMaxDiffResponseApi> {
    try {
      const params: ApiV1RankingBwsSavePostRequest = {
        conversationSlugId,
        ranking,
        comparisons,
        isComplete,
      };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1RankingBwsSavePost(params);
      const encodedUcan = await buildEncodedUcan(url, options);
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
        data: Dto.maxdiffSaveResponse.parse(response.data),
      };
    } catch (e) {
      return createAxiosErrorResponse(e);
    }
  }

  interface LoadMaxDiffParams {
    conversationSlugId: string;
  }

  type LoadMaxDiffSuccessResponse =
    AxiosSuccessResponse<ApiV1RankingBwsLoadPost200Response>;
  type LoadMaxDiffResponse =
    | LoadMaxDiffSuccessResponse
    | AxiosErrorResponse;

  async function loadMaxDiffResult({
    conversationSlugId,
  }: LoadMaxDiffParams): Promise<LoadMaxDiffResponse> {
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
        createRawAxiosRequestConfig({ encodedUcan })
      );

      return { status: "success", data: response.data };
    } catch (e) {
      return createAxiosErrorResponse(e);
    }
  }

  interface GetMaxDiffResultsParams {
    conversationSlugId: string;
    lifecycleFilter?: ApiV1RankingBwsResultsPostRequest["lifecycleFilter"];
  }

  type GetMaxDiffResultsSuccessResponse =
    AxiosSuccessResponse<MaxDiffResultsResponse>;
  type GetMaxDiffResultsResponse =
    | GetMaxDiffResultsSuccessResponse
    | AxiosErrorResponse;

  async function getMaxDiffResults({
    conversationSlugId,
    lifecycleFilter,
  }: GetMaxDiffResultsParams): Promise<GetMaxDiffResultsResponse> {
    try {
      const params = { conversationSlugId, lifecycleFilter };

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
        data: Dto.maxdiffResultsResponse.parse(response.data),
      };
    } catch (e) {
      return createAxiosErrorResponse(e);
    }
  }

  interface FetchMaxDiffItemsParams {
    conversationSlugId: string;
    lifecycleFilter?: ApiV1RankingBwsResultsPostRequest["lifecycleFilter"];
  }

  type FetchMaxDiffItemsResponse =
    | AxiosSuccessResponse<MaxDiffItemsFetchResponse>
    | AxiosErrorResponse;

  async function fetchMaxDiffItems({
    conversationSlugId,
    lifecycleFilter,
  }: FetchMaxDiffItemsParams): Promise<FetchMaxDiffItemsResponse> {
    try {
      const params = { conversationSlugId, lifecycleFilter };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1RankingBwsItemsFetchPost(params);
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1RankingBwsItemsFetchPost(
        params,
        createRawAxiosRequestConfig({ encodedUcan })
      );

      return {
        status: "success",
        data: Dto.maxdiffItemsFetchResponse.parse(response.data),
      };
    } catch (e) {
      return createAxiosErrorResponse(e);
    }
  }

  interface UpdateMaxDiffItemLifecycleParams {
    conversationSlugId: string;
    itemSlugId: string;
    newStatus: ApiV1RankingBwsItemsLifecycleUpdatePostRequest["newStatus"];
  }

  type UpdateMaxDiffItemLifecycleResponse =
    | AxiosSuccessResponse<void>
    | AxiosErrorResponse;

  async function updateMaxDiffItemLifecycle({
    conversationSlugId,
    itemSlugId,
    newStatus,
  }: UpdateMaxDiffItemLifecycleParams): Promise<UpdateMaxDiffItemLifecycleResponse> {
    try {
      const params = { conversationSlugId, itemSlugId, newStatus };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1RankingBwsItemsLifecycleUpdatePost(params);
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

  interface SyncMaxDiffParams {
    conversationSlugId: string;
  }

  type SyncMaxDiffResponse =
    | AxiosSuccessResponse<ApiV1RankingBwsSyncPost200Response>
    | AxiosErrorResponse;

  async function syncMaxDiff({
    conversationSlugId,
  }: SyncMaxDiffParams): Promise<SyncMaxDiffResponse> {
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

      return { status: "success", data: response.data };
    } catch (e) {
      return createAxiosErrorResponse(e);
    }
  }

  interface PreviewGitHubIssuesParams {
    repository: string;
    label: string;
  }

  type PreviewGitHubIssuesResponse =
    | AxiosSuccessResponse<ApiV1RankingBwsGithubPreviewPost200Response>
    | AxiosErrorResponse;

  async function previewGitHubIssues({
    repository,
    label,
  }: PreviewGitHubIssuesParams): Promise<PreviewGitHubIssuesResponse> {
    try {
      const params = { repository, label };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1RankingBwsGithubPreviewPost(params);
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1RankingBwsGithubPreviewPost(
        params,
        createRawAxiosRequestConfig({ encodedUcan })
      );

      return { status: "success", data: response.data };
    } catch (e) {
      return createAxiosErrorResponse(e);
    }
  }

  return {
    saveMaxDiffResult,
    loadMaxDiffResult,
    getMaxDiffResults,
    fetchMaxDiffItems,
    updateMaxDiffItemLifecycle,
    syncMaxDiff,
    previewGitHubIssues,
  };
}
