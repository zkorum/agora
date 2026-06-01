import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface AdministratorPremiumEntitlementApiTranslations {
  failedToFetchEntitlements: string;
  createdEntitlement: string;
  failedToCreateEntitlement: string;
  revokedEntitlement: string;
  failedToRevokeEntitlement: string;
}

const en: AdministratorPremiumEntitlementApiTranslations = {
  failedToFetchEntitlements: "Failed to fetch premium entitlements",
  createdEntitlement: "Premium entitlement created",
  failedToCreateEntitlement: "Failed to create premium entitlement",
  revokedEntitlement: "Premium entitlement revoked",
  failedToRevokeEntitlement: "Failed to revoke premium entitlement",
};

export const administratorPremiumEntitlementApiTranslations: Record<
  SupportedDisplayLanguageCodes,
  AdministratorPremiumEntitlementApiTranslations
> = {
  en,
  ar: en,
  es: en,
  fa: en,
  fr: en,
  he: en,
  ja: en,
  ky: en,
  ru: en,
  "zh-Hans": en,
  "zh-Hant": en,
};
