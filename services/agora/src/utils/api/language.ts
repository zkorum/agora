import { api } from "boot/axios";
import { DefaultApiAxiosParamCreator, DefaultApiFactory } from "src/api";
import type { AxiosErrorResponse, AxiosSuccessResponse } from "./common";
import { useCommonApi } from "./common";
import { useNotify } from "../ui/notify";
import type {
  ApiV1UserLanguagePreferencesGetPost200Response,
  ApiV1UserLanguagePreferencesUpdatePostRequest,
} from "src/api";
import type {
  SupportedSpokenLanguageCodes,
  SupportedDisplayLanguageCodes,
} from "src/shared/languages";

export interface LanguagePreferencesData {
  displayLanguage: SupportedDisplayLanguageCodes;
  spokenLanguages: SupportedSpokenLanguageCodes[];
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

  async function fetchLanguagePreferences(): Promise<FetchLanguagePreferencesResponse> {
    try {
      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1UserLanguagePreferencesGetPost();
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1UserLanguagePreferencesGetPost(
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
    displayLanguage: SupportedDisplayLanguageCodes;
    spokenLanguages: SupportedSpokenLanguageCodes[];
  }

  async function updateLanguagePreferences({
    displayLanguage,
    spokenLanguages,
  }: UpdateLanguagePreferencesProps): Promise<UpdateLanguagePreferencesResponse> {
    try {
      const params: ApiV1UserLanguagePreferencesUpdatePostRequest = {
        displayLanguage: displayLanguage,
        spokenLanguages: spokenLanguages,
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
