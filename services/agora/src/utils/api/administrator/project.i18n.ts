import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface AdministratorProjectApiTranslations {
  createdProject: string;
  failedToCreateProject: string;
  failedToFetchProjects: string;
  updatedProject: string;
  failedToUpdateProject: string;
  updatedProjectLanguageSetting: string;
  failedToUpdateProjectLanguageSetting: string;
  updatedProjectSlug: string;
  failedToUpdateProjectSlug: string;
  archivedProject: string;
  failedToArchiveProject: string;
  projectNotFound: string;
  unknownOrganizationSlug: string;
  organizationNotListed: string;
  projectSlugAlreadyExists: string;
  projectConflict: string;
}

const en: AdministratorProjectApiTranslations = {
  createdProject: "Created project",
  failedToCreateProject: "Failed to create project",
  failedToFetchProjects: "Failed to fetch projects",
  updatedProject: "Updated project",
  failedToUpdateProject: "Failed to update project",
  updatedProjectLanguageSetting: "Updated project language settings",
  failedToUpdateProjectLanguageSetting: "Failed to update project language settings",
  updatedProjectSlug: "Updated project slug",
  failedToUpdateProjectSlug: "Failed to update project slug",
  archivedProject: "Archived project",
  failedToArchiveProject: "Failed to archive project",
  projectNotFound: "Project not found",
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
