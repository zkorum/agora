/**
 * Core TypeScript interfaces for the content action dialog system
 * This file defines all types used throughout the content action management system
 */

// Base content action interface
export interface BaseContentAction {
  id: string;
  label: string;
  description?: string;
  icon: string;
  variant?: "default" | "destructive" | "warning";
}

// Context for determining available content actions
export interface ContentActionContext {
  isOwner: boolean;
  isModerator: boolean;
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
export interface ContentAction extends BaseContentAction {
  handler: ContentActionHandler;
  isVisible: (context: ContentActionContext) => boolean;
}

// Content action categories for organization
export type ContentActionCategory =
  | "content"
  | "moderation"
  | "social"
  | "sharing";

export interface CategorizedContentAction extends ContentAction {
  category: ContentActionCategory;
}

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
