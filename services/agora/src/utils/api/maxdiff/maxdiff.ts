import type {
  ApiV1MaxdiffLoadPost200Response,
  ApiV1MaxdiffResultsPost200Response,
  ApiV1MaxdiffSavePostRequest,
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
  }

  type GetMaxDiffResultsSuccessResponse =
    AxiosSuccessResponse<ApiV1MaxdiffResultsPost200Response>;
  type GetMaxDiffResultsResponse =
    | GetMaxDiffResultsSuccessResponse
    | AxiosErrorResponse;

  async function getMaxDiffResults({
    conversationSlugId,
  }: GetMaxDiffResultsParams): Promise<GetMaxDiffResultsResponse> {
    try {
      const params = { conversationSlugId };

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

  return {
    saveMaxDiffResult,
    loadMaxDiffResult,
    getMaxDiffResults,
  };
}
