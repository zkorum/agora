import type {
  ProjectPageActivity,
  ProjectPageAttribution,
  ProjectPageContact,
  ProjectPageLanguageOption as SharedProjectPageLanguageOption,
  ProjectPageProject,
} from "src/shared/types/dto";

export type ProjectActivityKind = "conversation" | "vote";

export type ProjectActionButtonVariant = "primary" | "outline" | "muted";

export type ProjectAttributionRole = "project_owner" | "sponsor" | "partner";

export type ProjectLanguageOption = SharedProjectPageLanguageOption;

export type ProjectActivityStats = ProjectPageActivity["stats"];

export type ProjectActivity = ProjectPageActivity;

export type ProjectAttribution = ProjectPageAttribution;

export type ProjectContact = ProjectPageContact;

export type ProjectPageData = ProjectPageProject;
