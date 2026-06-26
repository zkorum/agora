import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface AdministratorProjectTranslations {
  administrator: string;
  pageTitle: string;
  basicsTitle: string;
  projectTitleLabel: string;
  projectSlugLabel: string;
  ownerOrganizationsLabel: string;
  subtitleLabel: string;
  bodyLabel: string;
  heroImagePathLabel: string;
  heroImageIsFullPathLabel: string;
  attributionsTitle: string;
  attributionRoleLabel: string;
  attributionSourceLabel: string;
  realOrganizationLabel: string;
  externalNameLabel: string;
  externalDescriptionLabel: string;
  externalWebsiteLabel: string;
  externalImagePathLabel: string;
  externalImageIsFullPathLabel: string;
  addAttributionButton: string;
  noAttributions: string;
  removeButton: string;
  projectOwnerRole: string;
  sponsorRole: string;
  partnerRole: string;
  realOrganizationSource: string;
  externalOrganizationSource: string;
  contactTitle: string;
  contactNameLabel: string;
  contactRoleLabel: string;
  contactEmailLabel: string;
  contactOrganizationLabel: string;
  createButton: string;
}

const en: AdministratorProjectTranslations = {
  administrator: "Administrator",
  pageTitle: "Create project",
  basicsTitle: "Project basics",
  projectTitleLabel: "Project title",
  projectSlugLabel: "Project slug",
  ownerOrganizationsLabel: "Owner organizations",
  subtitleLabel: "Subtitle",
  bodyLabel: "Body",
  heroImagePathLabel: "Hero image path",
  heroImageIsFullPathLabel: "Hero image path is a full URL",
  attributionsTitle: "Public organization attributions",
  attributionRoleLabel: "Role",
  attributionSourceLabel: "Source",
  realOrganizationLabel: "Agora organization",
  externalNameLabel: "External organization name",
  externalDescriptionLabel: "External organization description",
  externalWebsiteLabel: "External organization website",
  externalImagePathLabel: "External organization image path",
  externalImageIsFullPathLabel: "External image path is a full URL",
  addAttributionButton: "Add attribution",
  noAttributions: "Owner organizations are added as project owners automatically.",
  removeButton: "Remove",
  projectOwnerRole: "Project owner",
  sponsorRole: "Sponsor",
  partnerRole: "Partner",
  realOrganizationSource: "Existing Agora organization",
  externalOrganizationSource: "External organization",
  contactTitle: "Participant contact",
  contactNameLabel: "Contact name",
  contactRoleLabel: "Contact role label",
  contactEmailLabel: "Contact email",
  contactOrganizationLabel: "Contact organization",
  createButton: "Create project",
};

export const administratorProjectTranslations: Record<
  SupportedDisplayLanguageCodes,
  AdministratorProjectTranslations
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
