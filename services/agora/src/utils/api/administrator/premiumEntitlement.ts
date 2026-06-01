import type { RawAxiosRequestConfig } from "axios";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  type CreatePremiumFeatureEntitlementRequest,
  Dto,
  type PremiumFeatureEntitlementItem,
  type RevokePremiumFeatureEntitlementRequest,
} from "src/shared/types/dto";
import { buildAuthorizationHeader } from "src/utils/crypto/ucan/operation";
import { useNotify } from "src/utils/ui/notify";

import { api } from "../client";
import { useCommonApi } from "../common";
import {
  type AdministratorPremiumEntitlementApiTranslations,
  administratorPremiumEntitlementApiTranslations,
} from "./premiumEntitlement.i18n";

const apiVersion = "v1";

export function useBackendAdministratorPremiumEntitlementApi() {
  const { buildEncodedUcan } = useCommonApi();
  const { showNotifyMessage } = useNotify();
  const { t } =
    useComponentI18n<AdministratorPremiumEntitlementApiTranslations>(
      administratorPremiumEntitlementApiTranslations
    );

  async function postAdminPremiumEntitlement<T>({
    path,
    body,
  }: {
    path: string;
    body: unknown;
  }): Promise<T> {
    const options: RawAxiosRequestConfig = { method: "POST" };
    const encodedUcan = await buildEncodedUcan(path, options);
    const response = await api.post<T>(path, body, {
      headers: {
        ...buildAuthorizationHeader(encodedUcan),
      },
    });

    return response.data;
  }

  async function listPremiumFeatureEntitlements(): Promise<
    PremiumFeatureEntitlementItem[]
  > {
    try {
      const data = await postAdminPremiumEntitlement({
        path: `/api/${apiVersion}/administrator/premium-entitlement/list`,
        body: {},
      });
      return Dto.listPremiumFeatureEntitlementsResponse.parse(data).entitlements;
    } catch (error) {
      console.error(error);
      showNotifyMessage(t("failedToFetchEntitlements"));
      return [];
    }
  }

  async function createPremiumFeatureEntitlement({
    data,
  }: {
    data: CreatePremiumFeatureEntitlementRequest;
  }): Promise<boolean> {
    try {
      await postAdminPremiumEntitlement({
        path: `/api/${apiVersion}/administrator/premium-entitlement/create`,
        body: data,
      });
      showNotifyMessage(t("createdEntitlement"));
      return true;
    } catch (error) {
      console.error(error);
      showNotifyMessage(t("failedToCreateEntitlement"));
      return false;
    }
  }

  async function revokePremiumFeatureEntitlement({
    data,
  }: {
    data: RevokePremiumFeatureEntitlementRequest;
  }): Promise<boolean> {
    try {
      await postAdminPremiumEntitlement({
        path: `/api/${apiVersion}/administrator/premium-entitlement/revoke`,
        body: data,
      });
      showNotifyMessage(t("revokedEntitlement"));
      return true;
    } catch (error) {
      console.error(error);
      showNotifyMessage(t("failedToRevokeEntitlement"));
      return false;
    }
  }

  return {
    listPremiumFeatureEntitlements,
    createPremiumFeatureEntitlement,
    revokePremiumFeatureEntitlement,
  };
}
