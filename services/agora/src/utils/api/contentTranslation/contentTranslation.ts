import type { ApiV1ContentTranslationRequestPostRequest } from "src/api";
import { DefaultApiAxiosParamCreator, DefaultApiFactory } from "src/api";
import { Dto } from "src/shared/types/dto";
import type { z } from "zod";

import { api } from "../client";
import { useCommonApi } from "../common";

export type RequestContentTranslationParams = ApiV1ContentTranslationRequestPostRequest;
export type ContentTranslationResponse = z.infer<
  typeof Dto.contentTranslationResponse
>;

export function useBackendContentTranslationApi() {
  const { buildEncodedUcan, createRawAxiosRequestConfig } = useCommonApi();

  async function requestContentTranslation(
    params: RequestContentTranslationParams
  ): Promise<ContentTranslationResponse> {
    const parsedParams = Dto.contentTranslationRequest.parse(params);
    const { url, options } =
      await DefaultApiAxiosParamCreator().apiV1ContentTranslationRequestPost(
        parsedParams
      );
    const encodedUcan = await buildEncodedUcan(url, options);
    const response = await DefaultApiFactory(
      undefined,
      undefined,
      api
    ).apiV1ContentTranslationRequestPost(
      parsedParams,
      createRawAxiosRequestConfig({ encodedUcan })
    );

    return Dto.contentTranslationResponse.parse(response.data);
  }

  return { requestContentTranslation };
}
