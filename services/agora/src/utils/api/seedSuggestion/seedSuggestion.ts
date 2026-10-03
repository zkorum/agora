import { isAxiosError } from "axios";
import {
  Dto,
  type GenerateSeedSuggestionsRequest,
  type GenerateSeedSuggestionsResponse,
  type RecordSeedSuggestionUseRequest,
} from "src/shared/types/dto";

import { api } from "../client";
import { useCommonApi } from "../common";

export type GenerateSeedSuggestionsFailure =
  | "not_available"
  | "rate_limited"
  | "failed";

export type GenerateSeedSuggestionsResult =
  | { status: "success"; data: GenerateSeedSuggestionsResponse }
  | { status: "error"; reason: GenerateSeedSuggestionsFailure };

function getFailureReason(error: unknown): GenerateSeedSuggestionsFailure {
  if (isAxiosError(error)) {
    if (error.response?.status === 403) {
      return "not_available";
    }
    if (error.response?.status === 429) {
      return "rate_limited";
    }
  }
  return "failed";
}

export function useBackendSeedSuggestionApi() {
  const { buildEncodedUcan, createRawAxiosRequestConfig } = useCommonApi();

  async function generateSeedSuggestions(
    request: GenerateSeedSuggestionsRequest
  ): Promise<GenerateSeedSuggestionsResult> {
    try {
      const params = Dto.generateSeedSuggestionsRequest.parse(request);
      const url = "/api/v1/conversation/seed/generate";
      const encodedUcan = await buildEncodedUcan(url, { method: "POST" });
      const response = await api.post(
        url,
        params,
        // The model can take up to 30 seconds; the standard timeout is too short.
        createRawAxiosRequestConfig({
          encodedUcan,
          timeoutProfile: "file-upload",
        })
      );
      return {
        status: "success",
        data: Dto.generateSeedSuggestionsResponse.parse(response.data),
      };
    } catch (error) {
      return { status: "error", reason: getFailureReason(error) };
    }
  }

  /**
   * Tells the API that a suggestion was taken as a statement, for usage counts only.
   * Never blocks or interrupts the author: a failure here is ignored.
   */
  async function recordSeedSuggestionUse(
    request: RecordSeedSuggestionUseRequest
  ): Promise<void> {
    try {
      const params = Dto.recordSeedSuggestionUseRequest.parse(request);
      const url = "/api/v1/conversation/seed/suggestion/use";
      const encodedUcan = await buildEncodedUcan(url, { method: "POST" });
      await api.post(url, params, createRawAxiosRequestConfig({ encodedUcan }));
    } catch (error) {
      console.warn("Failed to record the use of an AI suggestion", error);
    }
  }

  return { generateSeedSuggestions, recordSeedSuggestionUse };
}
