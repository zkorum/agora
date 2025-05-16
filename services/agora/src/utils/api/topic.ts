import {
  ApiV1TopicGetFollowedPost200Response,
  DefaultApiAxiosParamCreator,
  DefaultApiFactory,
} from "src/api";
import { api } from "src/boot/axios";
import {
  AxiosErrorResponse,
  AxiosSuccessResponse,
  useCommonApi,
} from "./common";
import { GetAllTopicsResponse } from "src/shared/types/dto";

export function useBackendTopicApi() {
  const {
    buildEncodedUcan,
    createRawAxiosRequestConfig,
    createAxiosErrorResponse,
  } = useCommonApi();

  type GetAllTopicsSuccessResponse = AxiosSuccessResponse<GetAllTopicsResponse>;
  type GetAllTopicsApiResponse =
    | GetAllTopicsSuccessResponse
    | AxiosErrorResponse;
  async function getAllTopics(): Promise<GetAllTopicsApiResponse> {
    try {
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1TopicGetAllTopicsPost(createRawAxiosRequestConfig({}));

      return {
        status: "success",
        data: response.data,
      };
    } catch (e) {
      return createAxiosErrorResponse(e);
    }
  }

  type GetUserFollowedTopicsSuccessResponse =
    AxiosSuccessResponse<ApiV1TopicGetFollowedPost200Response>;
  type GetUserFollowedTopicsResponse =
    | GetUserFollowedTopicsSuccessResponse
    | AxiosErrorResponse;
  async function getUserFollowedTopics(): Promise<GetUserFollowedTopicsResponse> {
    try {
      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1TopicGetFollowedPost();
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1TopicGetFollowedPost(
        createRawAxiosRequestConfig({ encodedUcan: encodedUcan })
      );

      return {
        status: "success",
        data: response.data,
      };
    } catch (e) {
      return createAxiosErrorResponse(e);
    }
  }

  return { getAllTopics, getUserFollowedTopics };
}
