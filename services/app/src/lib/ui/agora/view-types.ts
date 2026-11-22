import type { Snippet } from "svelte";

import type { IconName } from "$ui/shared/view-types.js";

export interface ConversationMethodPanelProps<Value extends string> {
  title: string;
  description?: string;
  actions?: Snippet;
  items: readonly {
    value: Value;
    label: string;
    description: string;
    icon: IconName;
    disabled?: boolean;
  }[];
  selected: NoInfer<Value> | undefined;
  onselect: (value: NoInfer<Value>) => void;
}

export type ConversationViewKind = "gathering" | "polis" | "prioritizing";
export type ConversationViewStatus = "draft" | "open" | "closed";
export type OpinionVoteChoice = "disagree" | "pass" | "agree";

export interface ProjectView {
  id: string;
  title: string;
  description: string;
  organization: string;
  cover: "coral" | "gradient" | "mint";
  conversationCount: string;
  participantCount?: string;
}

export interface ConversationView {
  id: string;
  title: string;
  description: string;
  kind: ConversationViewKind;
  status: ConversationViewStatus;
  contentCount: string;
  voteCount: string;
  participantCount: string;
}

export interface AuthorView {
  name: string;
  initials: string;
  detail: string;
}

export interface OpinionVoteBreakdown {
  choice: OpinionVoteChoice;
  label: string;
  count: string;
  percentage: number;
}

export interface QvAllocationView {
  id: string;
  title: string;
  description: string;
  votes: string;
  credits: string;
  squarePercent: number;
  tone: "support" | "opposition" | "neutral";
  fewerDisabled?: boolean;
  moreDisabled?: boolean;
}

export type WorkspaceNavigationIcon = "folder" | "history" | "explore" | "bell";
export type WorkspaceNavigationId =
  | "projects"
  | "history"
  | "explore"
  | "notifications";
export type WorkspaceActive =
  | "home"
  | WorkspaceNavigationId
  | { projectSlug: string };
export type WorkspaceDestination =
  | { kind: "link"; href: string }
  | { kind: "action"; onselect: () => void }
  | { kind: "unavailable" };
export type AccountAction = "organizations" | "logout";
export type AccountActions = Record<AccountAction, (() => void) | undefined>;
export type WorkspaceUser = Pick<AuthorView, "name" | "initials">;

export interface WorkspaceNavigationItem {
  id: WorkspaceNavigationId;
  label: string;
  icon: WorkspaceNavigationIcon;
  group: "facilitate" | "participate" | "updates";
  destination: WorkspaceDestination;
}

export interface WorkspaceProjectLink {
  projectSlug: string;
  label: string;
  href: string | undefined;
}

export interface WorkspaceNavigationProps {
  onsettings: (opener: HTMLElement) => void;
  navigation: readonly WorkspaceNavigationItem[];
  active: WorkspaceActive;
  dir: "ltr" | "rtl";
  account?: WorkspaceUser;
  projects?: readonly WorkspaceProjectLink[];
  oncreateproject?: () => void;
  accountActions?: AccountActions;
  onlogin?: () => void;
}

export interface AppShellProps extends WorkspaceNavigationProps {
  headerStart?: Snippet;
  headerCenter?: Snippet;
  header?: Snippet;
  contentRef?: HTMLElement | null;
  children: Snippet;
  participant?: boolean;
  onbacktoproject?: () => void;
}

export interface WorkspaceSidebarProps extends WorkspaceNavigationProps {
  collapsed: boolean;
  projectsExpanded?: boolean;
  mobile?: boolean;
  ontoggle: () => void;
  onfollow: () => void;
}

export interface ChoiceCardProps {
  text: string;
  label: string;
  selected: boolean;
  onselect: () => void;
  disabled?: boolean;
  radioValue?: string;
}

export interface NotificationItemProps {
  author: AuthorView;
  title: string;
  conversationTitle: string;
  excerpt: string;
  time: string;
  unread: boolean;
  onopen: () => void;
}

export interface ContentCardProps {
  author: AuthorView;
  title: string;
  description: string;
  onread: () => void;
}

export interface OpinionVoteControlsProps {
  label: string;
  selected: OpinionVoteChoice | undefined;
  onvote: ((choice: OpinionVoteChoice) => void) | undefined;
  disabled?: boolean;
}

export interface OpinionCardProps extends Omit<
  OpinionVoteControlsProps,
  "label"
> {
  text: string;
  author?: AuthorView;
  voteBreakdown?: readonly OpinionVoteBreakdown[];
  visibilityNotice?: "pending" | "hidden";
  actions?: Snippet;
}
