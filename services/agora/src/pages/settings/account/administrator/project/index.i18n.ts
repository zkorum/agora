import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface AdministratorProjectTranslations {
  administrator: string;
  pageTitle: string;
  createTab: string;
  manageTab: string;
  basicsTitle: string;
  basicsDescription: string;
  projectTitleLabel: string;
  projectSlugLabel: string;
  projectDefaultLanguageLabel: string;
  ownerOrganizationsLabel: string;
  subtitleLabel: string;
  bodyLabel: string;
  heroImagePathLabel: string;
  heroImageIsFullPathLabel: string;
  attributionsTitle: string;
  attributionRoleLabel: string;
  attributionSourceLabel: string;
  attributionsDescription: string;
  realOrganizationLabel: string;
  externalLanguageLabel: string;
  externalLanguageHint: string;
  externalNameLabel: string;
  externalDescriptionLabel: string;
  externalWebsiteLabel: string;
  externalImagePathLabel: string;
  externalImageIsFullPathLabel: string;
  additionalLanguagesTitle: string;
  addLanguageButton: string;
  addAttributionButton: string;
  noAttributions: string;
  removeButton: string;
  projectOwnerRole: string;
  sponsorRole: string;
  partnerRole: string;
  realOrganizationSource: string;
  externalOrganizationSource: string;
  contactTitle: string;
  contactDescription: string;
  contactNameLabel: string;
  contactRoleLabel: string;
  contactEmailLabel: string;
  contactOrganizationLabel: string;
  createButton: string;
  manageTitle: string;
  manageDescription: string;
  selectProjectLabel: string;
  noProjectsMessage: string;
  projectLanguageSettingsLabel: string;
  projectLanguageSettingsDescription: string;
  dynamicTranslationEnabledLabel: string;
  dynamicTranslationDisabledLabel: string;
  saveLanguageSettingsButton: string;
  saveButton: string;
  saveProjectButton: string;
  saveSlugButton: string;
  slugWarningTitle: string;
  slugWarningDescription: string;
  confirmSlugChangeButton: string;
  archiveProjectButton: string;
  archiveProjectTitle: string;
  archiveProjectDescription: string;
  confirmArchiveProjectButton: string;
  cancelButton: string;
  requiredSuffix: string;
  optionalSuffix: string;
}

const en: AdministratorProjectTranslations = {
  administrator: "Administrator",
  pageTitle: "Create project",
  createTab: "Create",
  manageTab: "Manage",
  basicsTitle: "Project basics",
  basicsDescription:
    "Required fields define the public project identity. Optional fields can be edited or localized later.",
  projectTitleLabel: "Project title",
  projectSlugLabel: "Project slug",
  projectDefaultLanguageLabel: "Default language",
  ownerOrganizationsLabel: "Owner organizations",
  subtitleLabel: "Subtitle",
  bodyLabel: "Body",
  heroImagePathLabel: "Hero image path",
  heroImageIsFullPathLabel: "Hero image path is a full URL",
  attributionsTitle: "Public organization attributions",
  attributionRoleLabel: "Role",
  attributionSourceLabel: "Source",
  attributionsDescription:
    "These public attributions are added to the project draft and saved only when you create the project. Selecting an owner organization adds a removable project-owner attribution draft, but removing that attribution keeps the organization as an owner.",
  realOrganizationLabel: "Existing organization",
  externalLanguageLabel: "External organization language",
  externalLanguageHint:
    "This creates the first/default external organization profile in the selected language.",
  externalNameLabel: "External organization name",
  externalDescriptionLabel: "External organization description",
  externalWebsiteLabel: "External organization website",
  externalImagePathLabel: "External organization image path",
  externalImageIsFullPathLabel: "External image path is a full URL",
  additionalLanguagesTitle: "Additional languages",
  addLanguageButton: "Add language",
  addAttributionButton: "Add attribution to draft",
  noAttributions:
    "No draft public attributions yet. Selecting an owner organization will add a removable project-owner attribution draft.",
  removeButton: "Remove",
  projectOwnerRole: "Project owner",
  sponsorRole: "Sponsor",
  partnerRole: "Partner",
  realOrganizationSource: "Existing Agora organization",
  externalOrganizationSource: "External organization",
  contactTitle: "Participant contact",
  contactDescription:
    "Optional. If you add contact details, contact name and email are required.",
  contactNameLabel: "Contact name",
  contactRoleLabel: "Contact role label",
  contactEmailLabel: "Contact email",
  contactOrganizationLabel: "Contact organization",
  createButton: "Create project",
  manageTitle: "Manage projects",
  manageDescription:
    "Edit project slug and project-level language settings. Each section saves separately.",
  selectProjectLabel: "Project",
  noProjectsMessage: "No projects to manage yet. Create a project first.",
  projectLanguageSettingsLabel: "Project languages",
  projectLanguageSettingsDescription:
    "Configure dynamic translation and additional target languages.",
  dynamicTranslationEnabledLabel: "Dynamic translation on",
  dynamicTranslationDisabledLabel: "Dynamic translation off",
  saveLanguageSettingsButton: "Save language settings",
  saveButton: "Save changes",
  saveProjectButton: "Save project",
  saveSlugButton: "Save slug",
  slugWarningTitle: "Change public link?",
  slugWarningDescription:
    "Changing this slug can break links that were already visited or shared. Only continue if you are sure.",
  confirmSlugChangeButton: "Change slug",
  archiveProjectButton: "Archive project",
  archiveProjectTitle: "Archive project?",
  archiveProjectDescription:
    "Archiving hides this project from admin pickers and public project lists. Existing historical content is kept.",
  confirmArchiveProjectButton: "Confirm archive",
  cancelButton: "Cancel",
  requiredSuffix: "required",
  optionalSuffix: "optional",
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
