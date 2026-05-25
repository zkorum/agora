import type {
  CheckPremiumFeatureAccessRequest,
  CheckPremiumFeatureAccessResponse,
} from "src/shared/types/dto";
import { Dto } from "src/shared/types/dto";

import { api } from "./client";
import { useCommonApi } from "./common";

export function usePremiumFeatureApi() {
  const { buildEncodedUcan, createRawAxiosRequestConfig } = useCommonApi();

  async function checkPremiumFeatureAccess(
    data: CheckPremiumFeatureAccessRequest
  ): Promise<CheckPremiumFeatureAccessResponse> {
    const payload = Dto.checkPremiumFeatureAccessRequest.parse(data);
    const url = "/api/v1/premium-feature/access/check";
    const options = { method: "POST" };
    const encodedUcan = await buildEncodedUcan(url, options);

    const response = await api.post(
      url,
      payload,
      createRawAxiosRequestConfig({ encodedUcan })
    );

    return Dto.checkPremiumFeatureAccessResponse.parse(response.data);
  }

  return { checkPremiumFeatureAccess };
}
