import type { RawAxiosRequestConfig } from "axios";
import { storeToRefs } from "pinia";
import {
  type ApiV1SurveyAnswerSavePostRequest,
  DefaultApiAxiosParamCreator,
  DefaultApiFactory,
} from "src/api";
import {
  Dto,
  type SurveyAnswerSaveResponse,
  type SurveyCompletionCountsResponse,
  type SurveyConfigDeleteResponse,
  type SurveyConfigUpdateResponse,
  type SurveyFormFetchResponse,
  type SurveyResponseWithdrawResponse,
  type SurveyResultsAggregatedResponse,
  type SurveyStatusCheckResponse,
} from "src/shared/types/dto";
import type { SurveyAnswerSubmission, SurveyConfig } from "src/shared/types/zod";
import { useAuthenticationStore } from "src/stores/authentication";

import { api } from "../client";
import type { AxiosErrorResponse, AxiosSuccessResponse } from "../common";
import { useCommonApi } from "../common";

export function useBackendSurveyApi() {
  const {
    buildEncodedUcan,
    createAxiosErrorResponse,
    createRawAxiosRequestConfig,
  } = useCommonApi();
  const { isAuthInitialized, isGuestOrLoggedIn } = storeToRefs(
    useAuthenticationStore()
  );

  async function createOptionalAuthConfig({
    url,
    options,
  }: {
    url: string;
    options: RawAxiosRequestConfig;
  }): Promise<RawAxiosRequestConfig> {
    if (isAuthInitialized.value && isGuestOrLoggedIn.value) {
      const encodedUcan = await buildEncodedUcan(url, options);
      return createRawAxiosRequestConfig({ encodedUcan });
    }

    return createRawAxiosRequestConfig({});
  }

  async function fetchSurveyForm({
    conversationSlugId,
  }: {
    conversationSlugId: string;
  }): Promise<AxiosSuccessResponse<SurveyFormFetchResponse> | AxiosErrorResponse> {
    try {
      const params = { conversationSlugId };
      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1SurveyFormFetchPost(params);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1SurveyFormFetchPost(
        params,
        await createOptionalAuthConfig({ url, options })
      );

      return {
        status: "success",
        data: Dto.surveyFormFetchResponse.parse(response.data),
      };
    } catch (error) {
      return createAxiosErrorResponse(error);
    }
  }

  async function checkSurveyStatus({
    conversationSlugId,
  }: {
    conversationSlugId: string;
  }): Promise<
    AxiosSuccessResponse<SurveyStatusCheckResponse> | AxiosErrorResponse
  > {
    try {
      const params = { conversationSlugId };
      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1SurveyStatusCheckPost(params);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1SurveyStatusCheckPost(
        params,
        await createOptionalAuthConfig({ url, options })
      );

      return {
        status: "success",
        data: Dto.surveyStatusCheckResponse.parse(response.data),
      };
    } catch (error) {
      return createAxiosErrorResponse(error);
    }
  }

  async function saveSurveyAnswer({
    conversationSlugId,
    questionSlugId,
    answer,
  }: {
    conversationSlugId: string;
    questionSlugId: string;
    answer: SurveyAnswerSubmission | null;
  }): Promise<AxiosSuccessResponse<SurveyAnswerSaveResponse> | AxiosErrorResponse> {
    try {
      const params: ApiV1SurveyAnswerSavePostRequest = {
        conversationSlugId,
        questionSlugId,
        answer,
      };
      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1SurveyAnswerSavePost(params);
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1SurveyAnswerSavePost(
        params,
        createRawAxiosRequestConfig({ encodedUcan })
      );

      return {
        status: "success",
        data: Dto.surveyAnswerSaveResponse.parse(response.data),
      };
    } catch (error) {
      return createAxiosErrorResponse(error);
    }
  }

  async function withdrawSurveyResponse({
    conversationSlugId,
  }: {
    conversationSlugId: string;
  }): Promise<
    AxiosSuccessResponse<SurveyResponseWithdrawResponse> | AxiosErrorResponse
  > {
    try {
      const params = { conversationSlugId };
      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1SurveyResponseWithdrawPost(
          params
        );
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1SurveyResponseWithdrawPost(
        params,
        createRawAxiosRequestConfig({ encodedUcan })
      );

      return {
        status: "success",
        data: Dto.surveyResponseWithdrawResponse.parse(response.data),
      };
    } catch (error) {
      return createAxiosErrorResponse(error);
    }
  }

  async function updateSurveyConfig({
    conversationSlugId,
    surveyConfig,
  }: {
    conversationSlugId: string;
    surveyConfig: SurveyConfig;
  }): Promise<AxiosSuccessResponse<SurveyConfigUpdateResponse> | AxiosErrorResponse> {
    try {
      const params = Dto.surveyConfigUpdateRequest.parse({
        conversationSlugId,
        surveyConfig,
      });
      const url = "/api/v1/survey/config/update";
      const options = { method: "POST" };
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await api.post(
        url,
        params,
        createRawAxiosRequestConfig({ encodedUcan })
      );

      return {
        status: "success",
        data: Dto.surveyConfigUpdateResponse.parse(response.data),
      };
    } catch (error) {
      return createAxiosErrorResponse(error);
    }
  }

  async function deleteSurveyConfig({
    conversationSlugId,
  }: {
    conversationSlugId: string;
  }): Promise<AxiosSuccessResponse<SurveyConfigDeleteResponse> | AxiosErrorResponse> {
    try {
      const params = { conversationSlugId };
      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1SurveyConfigDeletePost(params);
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1SurveyConfigDeletePost(
        params,
        createRawAxiosRequestConfig({ encodedUcan })
      );

      return {
        status: "success",
        data: Dto.surveyConfigDeleteResponse.parse(response.data),
      };
    } catch (error) {
      return createAxiosErrorResponse(error);
    }
  }

  async function fetchSurveyResultsAggregated({
    conversationSlugId,
  }: {
    conversationSlugId: string;
  }): Promise<AxiosSuccessResponse<SurveyResultsAggregatedResponse> | AxiosErrorResponse> {
    try {
      const params = { conversationSlugId };
      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1SurveyResultsAggregatedPost(params);
      const config = await createOptionalAuthConfig({ url, options });
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1SurveyResultsAggregatedPost(params, config);

      return {
        status: "success",
        data: Dto.surveyResultsAggregatedResponse.parse(response.data),
      };
    } catch (error) {
      return createAxiosErrorResponse(error);
    }
  }

  async function fetchSurveyCompletionCounts({
    conversationSlugId,
  }: {
    conversationSlugId: string;
  }): Promise<AxiosSuccessResponse<SurveyCompletionCountsResponse> | AxiosErrorResponse> {
    try {
      const params = { conversationSlugId };
      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1SurveyCompletionCountsPost(params);
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1SurveyCompletionCountsPost(
        params,
        createRawAxiosRequestConfig({ encodedUcan })
      );

      return {
        status: "success",
        data: Dto.surveyCompletionCountsResponse.parse(response.data),
      };
    } catch (error) {
      return createAxiosErrorResponse(error);
    }
  }

  return {
    fetchSurveyForm,
    checkSurveyStatus,
    saveSurveyAnswer,
    withdrawSurveyResponse,
    updateSurveyConfig,
    deleteSurveyConfig,
    fetchSurveyResultsAggregated,
    fetchSurveyCompletionCounts,
  };
}
