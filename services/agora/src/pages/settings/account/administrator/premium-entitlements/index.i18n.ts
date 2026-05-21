import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface AdministratorPremiumEntitlementsTranslations {
  administrator: string;
  pageTitle: string;
  subjectTypeLabel: string;
  userLabel: string;
  organizationLabel: string;
  usernameLabel: string;
  organizationNameLabel: string;
  featureLabel: string;
  startsAtLabel: string;
  expiresAtLabel: string;
  adminNoteLabel: string;
  createButton: string;
  activeEntitlementsTitle: string;
  noEntitlements: string;
  noExpiry: string;
  revokedLabel: string;
  revokeButton: string;
  surveyFeature: string;
  prioritizationFeature: string;
  eventTicketFeature: string;
  analysisVariantsFeature: string;
}

const en: AdministratorPremiumEntitlementsTranslations = {
  administrator: "Administrator",
  pageTitle: "Premium entitlements",
  subjectTypeLabel: "Subject type",
  userLabel: "User",
  organizationLabel: "Organization",
  usernameLabel: "Username",
  organizationNameLabel: "Organization name",
  featureLabel: "Feature",
  startsAtLabel: "Starts at",
  expiresAtLabel: "Expires at",
  adminNoteLabel: "Admin note",
  createButton: "Create entitlement",
  activeEntitlementsTitle: "Current entitlements",
  noEntitlements: "No premium entitlements yet.",
  noExpiry: "No expiry",
  revokedLabel: "Revoked",
  revokeButton: "Revoke",
  surveyFeature: "Survey",
  prioritizationFeature: "Prioritization",
  eventTicketFeature: "Event ticket",
  analysisVariantsFeature: "Analysis variants (2-6 groups)",
};

export const administratorPremiumEntitlementsTranslations: Record<
  SupportedDisplayLanguageCodes,
  AdministratorPremiumEntitlementsTranslations
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
