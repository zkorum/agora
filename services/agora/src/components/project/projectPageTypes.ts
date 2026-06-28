export type ProjectActivityKind = "conversation" | "vote";

export type ProjectAttributionRole = "project_owner" | "sponsor" | "partner";

export interface ProjectLanguageOption {
  label: string;
  value: string;
  caption?: string;
  searchText?: string;
  shortLabel?: string;
}

export interface ProjectActivityStats {
  opinionCount: number;
  participantCount: number;
  voteCount: number;
}

export interface ProjectActivity {
  slug: string;
  kind: ProjectActivityKind;
  isClosed: boolean;
  title: string;
  bodyPlainText: string;
  stats: ProjectActivityStats;
}

export interface ProjectAttribution {
  role: ProjectAttributionRole;
  displayName: string;
  description: string | undefined;
  websiteUrl: string | undefined;
  initials: string;
  accentColor: string;
}

export interface ProjectContact {
  name: string;
  roleLabel: string | undefined;
  affiliationName: string | undefined;
  email: string | undefined;
  websiteUrl: string | undefined;
}

export interface ProjectPageData {
  slug: string;
  title: string;
  subtitle: string | undefined;
  bodyPlainText: string | undefined;
  heroVariant: "blue" | "purple" | "green";
  participantCount: number;
  voteCount: number;
  activityCount: number;
  activities: readonly ProjectActivity[];
  attributions: readonly ProjectAttribution[];
  contact: ProjectContact | undefined;
}
