import { DefaultApiAxiosParamCreator, DefaultApiFactory } from "src/api";
import { Dto } from "src/shared/types/dto";
import { buildUcanForRequestWithDid } from "src/utils/crypto/ucan/operation";
import type { z } from "zod";

import { api } from "../client";
import { useCommonApi } from "../common";

export function useQvApi() {
  const { buildEncodedUcan, createRawAxiosRequestConfig } = useCommonApi();
  async function results({
    conversationSlugId,
    signal,
  }: {
    conversationSlugId: string;
    signal: AbortSignal;
  }) {
    const params = Dto.qvResultsRequest.parse({ conversationSlugId });
    const { url, options } =
      await DefaultApiAxiosParamCreator().apiV1PrioritizationQvResultsPost(
        params
      );
    const encodedUcan = await buildEncodedUcan(url, options);
    const response = await DefaultApiFactory(
      undefined,
      undefined,
      api
    ).apiV1PrioritizationQvResultsPost(
      params,
      createRawAxiosRequestConfig({ encodedUcan, signal })
    );
    return Dto.qvResultsResponse.parse(response.data);
  }
  async function load({
    conversationSlugId,
    signal,
  }: {
    conversationSlugId: string;
    signal: AbortSignal;
  }) {
    const params = Dto.qvLoadRequest.parse({ conversationSlugId });
    const { url, options } =
      await DefaultApiAxiosParamCreator().apiV1PrioritizationQvLoadPost(params);
    const encodedUcan = await buildEncodedUcan(url, options);
    const response = await DefaultApiFactory(
      undefined,
      undefined,
      api
    ).apiV1PrioritizationQvLoadPost(
      params,
      createRawAxiosRequestConfig({ encodedUcan, signal })
    );
    return Dto.qvLoadResponse.parse(response.data);
  }
  async function save({
    request,
    isCurrent,
  }: {
    request: z.infer<typeof Dto.qvSaveRequest>;
    isCurrent: () => boolean;
  }) {
    const params = Dto.qvSaveRequest.parse(request);
    const { url, options } =
      await DefaultApiAxiosParamCreator().apiV1PrioritizationQvSavePost(params);
    const { encodedUcan, didWrite } = await buildUcanForRequestWithDid({
      pathname: url,
      method: options.method,
    });
    if (!isCurrent())
      throw new DOMException("Voting session changed", "AbortError");
    const response = await DefaultApiFactory(
      undefined,
      undefined,
      api
    ).apiV1PrioritizationQvSavePost(
      params,
      createRawAxiosRequestConfig({ encodedUcan })
    );
    return { ...Dto.qvMutationResponse.parse(response.data), didWrite };
  }
  async function withdraw({
    request,
    isCurrent,
  }: {
    request: z.infer<typeof Dto.qvWithdrawRequest>;
    isCurrent: () => boolean;
  }) {
    const params = Dto.qvWithdrawRequest.parse(request);
    const { url, options } =
      await DefaultApiAxiosParamCreator().apiV1PrioritizationQvWithdrawPost(
        params
      );
    const { encodedUcan, didWrite } = await buildUcanForRequestWithDid({
      pathname: url,
      method: options.method,
    });
    if (!isCurrent())
      throw new DOMException("Voting session changed", "AbortError");
    const response = await DefaultApiFactory(
      undefined,
      undefined,
      api
    ).apiV1PrioritizationQvWithdrawPost(
      params,
      createRawAxiosRequestConfig({ encodedUcan })
    );
    return { ...Dto.qvMutationResponse.parse(response.data), didWrite };
  }
  return { load, save, withdraw, results };
}
