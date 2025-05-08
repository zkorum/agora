import { DefaultApiFactory } from "src/api";
import { api } from "src/boot/axios";
import {
  AxiosErrorResponse,
  AxiosSuccessResponse,
  useCommonApi,
} from "./common";
import { GetAllTopicsResponse } from "src/shared/types/dto";

export function useBackendTopicApi() {
  const { createRawAxiosRequestConfig, createAxiosErrorResponse } =
    useCommonApi();

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

  return { getAllTopics };
}
