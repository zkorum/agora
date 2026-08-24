import type { RouteLocationRaw } from "vue-router";

/**
 * Core TypeScript interfaces for the content action dialog system
 * This file defines all types used throughout the content action management system
 */

// Base content action interface
export interface BaseContentAction {
  id: string;
  label: string;
  description?: string;
  disabled?: boolean;
  closeOnSelect?: boolean;
  icon: string;
  trailingIcon?: string;
  trailingControl?: {
    type: "switch";
    checked: boolean;
  };
  variant?: "default" | "destructive" | "warning" | "positive";
}

// Context for determining available content actions
export interface ContentActionContext {
  isOwner: boolean;
  isSiteModerator: boolean;
  isConversationOwner: boolean;
  isOrgMember: boolean;
  isLoggedIn: boolean;
  isEmbeddedMode: boolean;
  targetType: "post" | "comment";
  targetId: string;
  targetAuthor: string;
}

// Content action handler function type
export type ContentActionHandler = (
  context: ContentActionContext
) => Promise<void> | void;

// Complete content action with handler
interface ContentActionVisibility {
  isVisible: (context: ContentActionContext) => boolean;
}

interface CommonContentAction
  extends BaseContentAction, ContentActionVisibility {}

export interface HandlerContentAction extends CommonContentAction {
  handler: ContentActionHandler;
  to?: never;
}

export interface NavigationContentAction extends CommonContentAction {
  handler?: never;
  to: RouteLocationRaw;
}

export type ContentAction = HandlerContentAction | NavigationContentAction;

// Content action categories for organization
export type ContentActionCategory =
  | "content"
  | "moderation"
  | "social"
  | "sharing";

export type CategorizedContentAction = ContentAction & {
  category: ContentActionCategory;
};

// Content action dialog state management
export interface ContentActionDialogState {
  isVisible: boolean;
  context: ContentActionContext | null;
  actions: ContentAction[];
}

// Permission checking function types
export type ContentActionPermissionChecker = (
  context: ContentActionContext
) => boolean;

export interface ContentActionPermissionCheckers {
  canDelete: ContentActionPermissionChecker;
  canModerate: ContentActionPermissionChecker;
  canMute: ContentActionPermissionChecker;
  canReport: () => boolean;
  canShare: () => boolean;
  canViewUserReports: ContentActionPermissionChecker;
  canViewModerationHistory: () => boolean;
  canCopyEmbedLink: () => boolean;
}

// Content action execution result
export interface ContentActionResult {
  success: boolean;
  message?: string;
  error?: string;
}
