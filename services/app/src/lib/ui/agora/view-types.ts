import type { Snippet } from "svelte";

import type { IconName } from "$ui/shared/view-types.js";

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
  participantCount: string;
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

export interface AppShellProps {
  navigation: readonly {
    id: string;
    label: string;
    icon: IconName;
    group: string;
    href?: string;
    disabled?: boolean;
  }[];
  active: string;
  onnavigate?: (id: string) => void;
  header?: Snippet;
  children: Snippet;
  dir: "ltr" | "rtl";
  participant?: boolean;
  account?: AuthorView;
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
  author: AuthorView;
  voteBreakdown?: readonly OpinionVoteBreakdown[];
  visibilityNotice?: "pending" | "hidden";
  actions?: Snippet;
}
