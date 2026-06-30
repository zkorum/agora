export interface AdministratorOrganizationTranslations {
  administrator: string;
  createTab: string;
  manageTab: string;
  createTitle: string;
  createDescription: string;
  existingTitle: string;
  loadingOrganizationsMessage: string;
  noOrganizationsMessage: string;
  selectOrganizationLabel: string;
  editTitle: string;
  editDescription: string;
  saveSlugButton: string;
  slugWarningTitle: string;
  slugWarningDescription: string;
  confirmSlugChangeButton: string;
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
  deleteButton: string;
  confirmDeleteButton: string;
  cancelButton: string;
  deleteConfirmMessage: string;
  addMemberTitle: string;
  membershipDescription: string;
  usernameLabel: string;
  addUserButton: string;
  removeUserButton: string;
  memberListTitle: string;
  memberListDescription: string;
  fetchMembersButton: string;
  noMembersMessage: string;
  localizationMissingHint: string;
  defaultLanguageBadge: string;
  localizationReadyBadge: string;
  localizationMissingBadge: string;
  dangerZoneTitle: string;
  changeSlugDangerTitle: string;
  changeSlugDangerDescription: string;
  deleteDangerTitle: string;
  deleteDangerDescription: string;
}

const en: AdministratorOrganizationTranslations = {
  administrator: "Organizations",
  createTab: "Create",
  manageTab: "Manage",
  createTitle: "Create organization",
  createDescription:
    "Create the default organization profile first. Add translations from the Manage tab after creation.",
  existingTitle: "Manage existing organizations",
  loadingOrganizationsMessage: "Loading organizations...",
  noOrganizationsMessage: "No active organizations are registered.",
  selectOrganizationLabel: "Organization",
  editTitle: "Edit organization",
  editDescription:
    "Choose a display language, edit that localized profile, and optionally make it the default public profile.",
  saveSlugButton: "Save slug",
  slugWarningTitle: "Change public link?",
  slugWarningDescription:
    "Changing this slug can break links that were already visited or shared. Only continue if you are sure.",
  confirmSlugChangeButton: "Change slug",
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
  deleteButton: "Delete organization",
  confirmDeleteButton: "Confirm delete",
  cancelButton: "Cancel",
  deleteConfirmMessage: "This will delete this organization.",
  addMemberTitle: "Memberships",
  membershipDescription: "Add one username to the selected organization.",
  usernameLabel: "Username",
  addUserButton: "Add user",
  removeUserButton: "Remove user",
  memberListTitle: "Organization members",
  memberListDescription:
    "Fetch the current member list, then remove users directly from the list.",
  fetchMembersButton: "Fetch members",
  noMembersMessage: "No members found for this organization.",
  localizationMissingHint:
    "This language has no saved localization yet. The form is prefilled from the default profile so you can translate it quickly.",
  defaultLanguageBadge: "Default",
  localizationReadyBadge: "Saved",
  localizationMissingBadge: "Missing",
  dangerZoneTitle: "Danger zone",
  changeSlugDangerTitle: "Change organization URL slug",
  changeSlugDangerDescription:
    "Changing this slug can break public links that were already visited or shared.",
  deleteDangerTitle: "Delete this organization",
  deleteDangerDescription: "Delete this organization.",
};

export const administratorOrganizationTranslations = {
  en,
};
