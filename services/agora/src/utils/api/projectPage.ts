import type {
  FetchProjectPageActivitiesRequest,
  FetchProjectPageActivitiesResponse,
  FetchProjectPageRequest,
  FetchProjectPageResponse,
  UpdateProjectPageDisplayLanguageRequest,
  UpdateProjectPageDisplayLanguageResponse,
} from "src/shared/types/dto";
import { Dto } from "src/shared/types/dto";
import { buildAuthorizationHeader } from "src/utils/crypto/ucan/operation";

import { api } from "./client";
import { useCommonApi } from "./common";

export function useBackendProjectPageApi() {
  const { buildEncodedUcan } = useCommonApi();

  async function postWithOptionalAuth({
    url,
    params,
    authenticated,
  }: {
    url: string;
    params: object;
    authenticated: boolean;
  }) {
    if (!authenticated) {
      return await api.post(url, params);
    }

    const encodedUcan = await buildEncodedUcan(url, { method: "POST" });
    return await api.post(url, params, {
      headers: {
        ...buildAuthorizationHeader(encodedUcan),
      },
    });
  }

  async function fetchProjectPage({
    request,
    authenticated,
  }: {
    request: FetchProjectPageRequest;
    authenticated: boolean;
  }): Promise<FetchProjectPageResponse> {
    const params = Dto.fetchProjectPageRequest.parse(request);
    const response = await postWithOptionalAuth({
      url: "/api/v1/project/page/fetch",
      params,
      authenticated,
    });
    return Dto.fetchProjectPageResponse.parse(response.data);
  }

  async function fetchProjectPageActivities({
    request,
    authenticated,
  }: {
    request: FetchProjectPageActivitiesRequest;
    authenticated: boolean;
  }): Promise<FetchProjectPageActivitiesResponse> {
    const params = Dto.fetchProjectPageActivitiesRequest.parse(request);
    const response = await postWithOptionalAuth({
      url: "/api/v1/project/page/activities/fetch",
      params,
      authenticated,
    });
    return Dto.fetchProjectPageActivitiesResponse.parse(response.data);
  }

  async function updateProjectPageDisplayLanguage(
    request: UpdateProjectPageDisplayLanguageRequest
  ): Promise<UpdateProjectPageDisplayLanguageResponse> {
    const params = Dto.updateProjectPageDisplayLanguageRequest.parse(request);
    const url = "/api/v1/project/page/display-language/update";
    const encodedUcan = await buildEncodedUcan(url, { method: "POST" });
    const response = await api.post(url, params, {
      headers: {
        ...buildAuthorizationHeader(encodedUcan),
      },
    });
    return Dto.updateProjectPageDisplayLanguageResponse.parse(response.data);
  }

  return {
    fetchProjectPage,
    fetchProjectPageActivities,
    updateProjectPageDisplayLanguage,
  };
}
