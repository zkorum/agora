import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface AdministratorProjectApiTranslations {
  createdProject: string;
  failedToCreateProject: string;
  failedToFetchProjects: string;
  updatedProject: string;
  failedToUpdateProject: string;
  updatedProjectLanguageSettings: string;
  failedToUpdateProjectLanguageSettings: string;
  updatedProjectSlug: string;
  failedToUpdateProjectSlug: string;
  deletedProject: string;
  failedToDeleteProject: string;
  projectNotFound: string;
  unknownOrganizationSlug: string;
  organizationNotListed: string;
  projectSlugAlreadyExists: string;
  projectConflict: string;
  dynamicTranslationEntitlementRequired: string;
  missingManualProjectContentLocalization: string;
}

const en: AdministratorProjectApiTranslations = {
  createdProject: "Created project",
  failedToCreateProject: "Failed to create project",
  failedToFetchProjects: "Failed to fetch projects",
  updatedProject: "Updated project",
  failedToUpdateProject: "Failed to update project",
  updatedProjectLanguageSettings: "Updated project language settings",
  failedToUpdateProjectLanguageSettings:
    "Failed to update project language settings",
  updatedProjectSlug: "Updated project slug",
  failedToUpdateProjectSlug: "Failed to update project slug",
  deletedProject: "Deleted project",
  failedToDeleteProject: "Failed to delete project",
  projectNotFound: "Project not found",
  unknownOrganizationSlug: "Unknown organization slug: {organizationSlugs}",
  organizationNotListed: "Organization must be listed: {organizationSlugs}",
  projectSlugAlreadyExists: "A project with this slug already exists",
  projectConflict: "Project data conflicts with an existing record",
  dynamicTranslationEntitlementRequired:
    "At least one project owner organization must have the dynamic translation entitlement",
  missingManualProjectContentLocalization:
    "Manual project content is required for every active target language when dynamic translation is off",
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
