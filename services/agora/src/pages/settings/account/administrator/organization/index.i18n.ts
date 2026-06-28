export interface AdministratorOrganizationTranslations {
  administrator: string;
  createTitle: string;
  createDescription: string;
  existingTitle: string;
  noOrganizationsMessage: string;
  selectOrganizationLabel: string;
  editTitle: string;
  editDescription: string;
  languageLabel: string;
  defaultLanguageLabel: string;
  nameLabel: string;
  slugLabel: string;
  descriptionLabel: string;
  imagePathLabel: string;
  imagePathHint: string;
  websiteUrlLabel: string;
  createButton: string;
  saveButton: string;
  archiveButton: string;
  confirmArchiveButton: string;
  cancelButton: string;
  archiveConfirmMessage: string;
  addMemberTitle: string;
  usernameLabel: string;
  addUserButton: string;
  localizationMissingHint: string;
  defaultLanguageBadge: string;
  localizationReadyBadge: string;
  localizationMissingBadge: string;
}

const en: AdministratorOrganizationTranslations = {
  administrator: "Organizations",
  createTitle: "Create organization",
  createDescription:
    "Create the default organization profile first. Add translations from the editor below after creation.",
  existingTitle: "Manage existing organizations",
  noOrganizationsMessage: "No active organizations are registered.",
  selectOrganizationLabel: "Organization",
  editTitle: "Edit organization",
  editDescription:
    "Choose a display language, edit that localized profile, and optionally make it the default public profile.",
  languageLabel: "Display language",
  defaultLanguageLabel: "Use this language as the default public profile",
  nameLabel: "Name",
  slugLabel: "URL slug",
  descriptionLabel: "Description",
  imagePathLabel: "Image path",
  imagePathHint:
    "Use an image filename such as avatar_default_0.png or a full https URL.",
  websiteUrlLabel: "Website URL",
  createButton: "Create organization",
  saveButton: "Save changes",
  archiveButton: "Archive organization",
  confirmArchiveButton: "Confirm archive",
  cancelButton: "Cancel",
  archiveConfirmMessage:
    "Archiving hides this organization and removes it from admin/member pickers. Existing historical content is kept.",
  addMemberTitle: "Add member",
  usernameLabel: "Username",
  addUserButton: "Add user",
  localizationMissingHint:
    "This language has no saved localization yet. The form is prefilled from the default profile so you can translate it quickly.",
  defaultLanguageBadge: "Default",
  localizationReadyBadge: "Saved",
  localizationMissingBadge: "Missing",
};

export const administratorOrganizationTranslations = {
  en,
};
