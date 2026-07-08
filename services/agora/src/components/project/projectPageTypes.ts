import type {
  ProjectPageActivity,
  ProjectPageAttribution,
  ProjectPageContact,
  ProjectPageLanguageOption as SharedProjectPageLanguageOption,
  ProjectPageProject,
} from "src/shared/types/dto";

export type ProjectActionButtonVariant = "primary" | "outline" | "muted";

export type ProjectAttributionRole = "project_owner" | "sponsor" | "partner";

export type ProjectLanguageOption = SharedProjectPageLanguageOption;

export type ProjectActivityStats = ProjectPageActivity["stats"];

export type ProjectActivity = ProjectPageActivity;

export type ProjectAttribution = ProjectPageAttribution;

export type ProjectContact = ProjectPageContact;

export type ProjectPageData = ProjectPageProject;

function getProjectActivityTitle(activity: ProjectActivity): string {
  return activity.displayContent.status === "available"
    ? activity.displayContent.content.title
    : activity.displayContent.sourceVersion;
}

export function getProjectActivityIdentity(activity: ProjectActivity): string {
  if (activity.isIndexed) {
    return activity.slugId;
  }

  return [
    "invitation",
    activity.createdAt.toISOString(),
    activity.conversationType,
    getProjectActivityTitle(activity),
  ].join(":");
}
