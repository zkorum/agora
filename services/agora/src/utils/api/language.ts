import { api } from "boot/axios";
import { DefaultApiAxiosParamCreator, DefaultApiFactory } from "src/api";
import type { AxiosErrorResponse, AxiosSuccessResponse } from "./common";
import { useCommonApi } from "./common";
import { useNotify } from "../ui/notify";
import type {
  ApiV1UserLanguagePreferencesGetPost200Response,
  ApiV1UserLanguagePreferencesGetPostRequest,
  ApiV1UserLanguagePreferencesUpdatePostRequest,
} from "src/api";
import type {
  SupportedSpokenLanguageCodes,
  SupportedDisplayLanguageCodes,
} from "src/shared/languages";

export interface LanguagePreferencesData {
  spokenLanguages: SupportedSpokenLanguageCodes[];
  displayLanguage: SupportedDisplayLanguageCodes;
}

export function useBackendLanguageApi() {
  const {
    buildEncodedUcan,
    createRawAxiosRequestConfig,
    createAxiosErrorResponse,
  } = useCommonApi();

  const { showNotifyMessage } = useNotify();

  type FetchLanguagePreferencesSuccessResponse =
    AxiosSuccessResponse<ApiV1UserLanguagePreferencesGetPost200Response>;
  type FetchLanguagePreferencesResponse =
    | FetchLanguagePreferencesSuccessResponse
    | AxiosErrorResponse;

  async function fetchLanguagePreferences(
    currentDisplayLanguage: SupportedDisplayLanguageCodes
  ): Promise<FetchLanguagePreferencesResponse> {
    try {
      const params: ApiV1UserLanguagePreferencesGetPostRequest = {
        currentDisplayLanguage: currentDisplayLanguage,
      };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1UserLanguagePreferencesGetPost(
          params
        );
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1UserLanguagePreferencesGetPost(
        params,
        createRawAxiosRequestConfig({ encodedUcan })
      );

      return {
        status: "success",
        data: response.data,
      };
    } catch (e) {
      console.error("Failed to fetch language preferences:", e);
      // Don't show notification for language preference fetch failures
      // as this might be called on app initialization
      return createAxiosErrorResponse(e);
    }
  }

  type UpdateLanguagePreferencesSuccessResponse = AxiosSuccessResponse<void>;
  type UpdateLanguagePreferencesResponse =
    | UpdateLanguagePreferencesSuccessResponse
    | AxiosErrorResponse;

  interface UpdateLanguagePreferencesProps {
    spokenLanguages?: SupportedSpokenLanguageCodes[];
    displayLanguage?: SupportedDisplayLanguageCodes;
  }

  async function updateLanguagePreferences({
    spokenLanguages,
    displayLanguage,
  }: UpdateLanguagePreferencesProps): Promise<UpdateLanguagePreferencesResponse> {
    try {
      const params: ApiV1UserLanguagePreferencesUpdatePostRequest = {
        spokenLanguages: spokenLanguages,
        displayLanguage: displayLanguage,
      };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1UserLanguagePreferencesUpdatePost(
          params
        );
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1UserLanguagePreferencesUpdatePost(
        params,
        createRawAxiosRequestConfig({ encodedUcan })
      );

      return {
        status: "success",
        data: response.data,
      };
    } catch (e) {
      console.error("Failed to update language preferences:", e);
      showNotifyMessage("Failed to save language preferences");
      return createAxiosErrorResponse(e);
    }
  }

  return {
    fetchLanguagePreferences,
    updateLanguagePreferences,
  };
}
