import type {
  ApiV1TopicFollowPostRequest,
  ApiV1TopicGetFollowedPost200Response,
} from "src/api";
import { DefaultApiAxiosParamCreator, DefaultApiFactory } from "src/api";
import { api } from "./client";
import type { AxiosErrorResponse, AxiosSuccessResponse } from "./common";
import { useCommonApi } from "./common";
import type { GetAllTopicsResponse } from "src/shared/types/dto";
import { buildAuthorizationHeader } from "../crypto/ucan/operation";

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
      ).apiV1TopicGetFollowedPost({
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      });

      return {
        status: "success",
        data: response.data,
      };
    } catch (e) {
      return createAxiosErrorResponse(e);
    }
  }

  interface UserFollowTopicCodeProps {
    topicCode: string;
  }

  type UserFollowTopicCodeSuccessResponse = AxiosSuccessResponse<void>;
  type UserFollowTopicCodeResponse =
    | UserFollowTopicCodeSuccessResponse
    | AxiosErrorResponse;
  async function userFollowTopicCode({
    topicCode,
  }: UserFollowTopicCodeProps): Promise<UserFollowTopicCodeResponse> {
    try {
      const params: ApiV1TopicFollowPostRequest = {
        topicCode: topicCode,
      };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1TopicFollowPost(params);
      const encodedUcan = await buildEncodedUcan(url, options);
      await DefaultApiFactory(undefined, undefined, api).apiV1TopicFollowPost(
        params,
        {
          headers: {
            ...buildAuthorizationHeader(encodedUcan),
          },
        }
      );

      return {
        status: "success",
        data: undefined,
      };
    } catch (e) {
      return createAxiosErrorResponse(e);
    }
  }

  interface UserUnfollowTopicCodeProps {
    topicCode: string;
  }

  type UserUnfollowTopicCodeSuccessResponse = AxiosSuccessResponse<void>;
  type UserUnfollowTopicCodeApiResponse =
    | UserUnfollowTopicCodeSuccessResponse
    | AxiosErrorResponse;
  async function userUnfollowTopicCode({
    topicCode,
  }: UserUnfollowTopicCodeProps): Promise<UserUnfollowTopicCodeApiResponse> {
    try {
      const params: ApiV1TopicFollowPostRequest = {
        topicCode: topicCode,
      };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1TopicUnfollowPost(params);
      const encodedUcan = await buildEncodedUcan(url, options);
      await DefaultApiFactory(undefined, undefined, api).apiV1TopicUnfollowPost(
        params,
        {
          headers: {
            ...buildAuthorizationHeader(encodedUcan),
          },
        }
      );

      return {
        status: "success",
        data: undefined,
      };
    } catch (e) {
      return createAxiosErrorResponse(e);
    }
  }

  return {
    getAllTopics,
    getUserFollowedTopics,
    userFollowTopicCode,
    userUnfollowTopicCode,
  };
}
