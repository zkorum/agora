import type {
  ApiV1MaxdiffGithubPreviewPost200Response,
  ApiV1MaxdiffItemsFetchPost200Response,
  ApiV1MaxdiffItemsLifecycleUpdatePostRequest,
  ApiV1MaxdiffLoadPost200Response,
  ApiV1MaxdiffResultsPost200Response,
  ApiV1MaxdiffResultsPostRequest,
  ApiV1MaxdiffSavePostRequest,
  ApiV1MaxdiffSyncPost200Response,
} from "src/api";
import {
  DefaultApiAxiosParamCreator,
  DefaultApiFactory,
} from "src/api";
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

  type SaveMaxDiffResponse =
    | AxiosSuccessResponse<void>
    | AxiosErrorResponse;

  async function saveMaxDiffResult({
    conversationSlugId,
    ranking,
    comparisons,
    isComplete,
  }: SaveMaxDiffParams): Promise<SaveMaxDiffResponse> {
    try {
      const params: ApiV1MaxdiffSavePostRequest = {
        conversationSlugId,
        ranking,
        comparisons,
        isComplete,
      };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1MaxdiffSavePost(params);
      const encodedUcan = await buildEncodedUcan(url, options);
      await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1MaxdiffSavePost(
        params,
        createRawAxiosRequestConfig({ encodedUcan })
      );

      return { status: "success", data: undefined };
    } catch (e) {
      return createAxiosErrorResponse(e);
    }
  }

  interface LoadMaxDiffParams {
    conversationSlugId: string;
  }

  type LoadMaxDiffSuccessResponse =
    AxiosSuccessResponse<ApiV1MaxdiffLoadPost200Response>;
  type LoadMaxDiffResponse =
    | LoadMaxDiffSuccessResponse
    | AxiosErrorResponse;

  async function loadMaxDiffResult({
    conversationSlugId,
  }: LoadMaxDiffParams): Promise<LoadMaxDiffResponse> {
    try {
      const params = { conversationSlugId };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1MaxdiffLoadPost(params);
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1MaxdiffLoadPost(
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
    lifecycleFilter?: ApiV1MaxdiffResultsPostRequest["lifecycleFilter"];
  }

  type GetMaxDiffResultsSuccessResponse =
    AxiosSuccessResponse<ApiV1MaxdiffResultsPost200Response>;
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
        await DefaultApiAxiosParamCreator().apiV1MaxdiffResultsPost(params);
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1MaxdiffResultsPost(
        params,
        createRawAxiosRequestConfig({ encodedUcan })
      );

      return { status: "success", data: response.data };
    } catch (e) {
      return createAxiosErrorResponse(e);
    }
  }

  interface FetchMaxDiffItemsParams {
    conversationSlugId: string;
    lifecycleFilter?: ApiV1MaxdiffResultsPostRequest["lifecycleFilter"];
  }

  type FetchMaxDiffItemsResponse =
    | AxiosSuccessResponse<ApiV1MaxdiffItemsFetchPost200Response>
    | AxiosErrorResponse;

  async function fetchMaxDiffItems({
    conversationSlugId,
    lifecycleFilter,
  }: FetchMaxDiffItemsParams): Promise<FetchMaxDiffItemsResponse> {
    try {
      const params = { conversationSlugId, lifecycleFilter };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1MaxdiffItemsFetchPost(params);
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1MaxdiffItemsFetchPost(
        params,
        createRawAxiosRequestConfig({ encodedUcan })
      );

      return { status: "success", data: response.data };
    } catch (e) {
      return createAxiosErrorResponse(e);
    }
  }

  interface UpdateMaxDiffItemLifecycleParams {
    conversationSlugId: string;
    itemSlugId: string;
    newStatus: ApiV1MaxdiffItemsLifecycleUpdatePostRequest["newStatus"];
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
        await DefaultApiAxiosParamCreator().apiV1MaxdiffItemsLifecycleUpdatePost(params);
      const encodedUcan = await buildEncodedUcan(url, options);
      await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1MaxdiffItemsLifecycleUpdatePost(
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
    | AxiosSuccessResponse<ApiV1MaxdiffSyncPost200Response>
    | AxiosErrorResponse;

  async function syncMaxDiff({
    conversationSlugId,
  }: SyncMaxDiffParams): Promise<SyncMaxDiffResponse> {
    try {
      const params = { conversationSlugId };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1MaxdiffSyncPost(params);
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1MaxdiffSyncPost(
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
    | AxiosSuccessResponse<ApiV1MaxdiffGithubPreviewPost200Response>
    | AxiosErrorResponse;

  async function previewGitHubIssues({
    repository,
    label,
  }: PreviewGitHubIssuesParams): Promise<PreviewGitHubIssuesResponse> {
    try {
      const params = { repository, label };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1MaxdiffGithubPreviewPost(params);
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1MaxdiffGithubPreviewPost(
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
