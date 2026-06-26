import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface AdministratorProjectApiTranslations {
  createdProject: string;
  failedToCreateProject: string;
  unknownOrganizationSlug: string;
  organizationNotListed: string;
  projectSlugAlreadyExists: string;
  projectConflict: string;
}

const en: AdministratorProjectApiTranslations = {
  createdProject: "Created project",
  failedToCreateProject: "Failed to create project",
  unknownOrganizationSlug: "Unknown organization slug: {organizationSlugs}",
  organizationNotListed: "Organization must be listed: {organizationSlugs}",
  projectSlugAlreadyExists: "A project with this slug already exists",
  projectConflict: "Project data conflicts with an existing record",
};

export const administratorProjectApiTranslations: Record<
  SupportedDisplayLanguageCodes,
  AdministratorProjectApiTranslations
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
