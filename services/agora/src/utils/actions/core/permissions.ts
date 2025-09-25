/**
 * Action permission system composable
 * This composable provides permission checking functions for various user actions
 */

import type {
  ContentActionContext,
  ContentActionPermissionCheckers,
} from "./types";

/**
 * Composable for checking user permissions for various actions
 */
export function useActionPermissions(): ContentActionPermissionCheckers {
  const canDelete = (context: ContentActionContext): boolean => {
    if (context.targetType === "post") {
      // For posts, can only delete if owner and not in embedded mode
      return context.isOwner && !context.isEmbeddedMode;
    } else {
      // For comments, can delete if owner (regardless of embed mode)
      return context.isOwner;
    }
  };

  const canModerate = (context: ContentActionContext): boolean => {
    // Can moderate if user is a moderator and not in embedded mode
    return context.isModerator && !context.isEmbeddedMode;
  };

  const canMute = (context: ContentActionContext): boolean => {
    // Can mute if not the owner, user is logged in, and not in embedded mode
    return !context.isOwner && context.isLoggedIn && !context.isEmbeddedMode;
  };

  const canReport = (): boolean => {
    // Anyone can report content
    return true;
  };

  const canShare = (): boolean => {
    // Anyone can share content
    return true;
  };

  const canViewUserReports = (context: ContentActionContext): boolean => {
    // Only moderators can view user reports, and not in embedded mode
    return context.isModerator && !context.isEmbeddedMode;
  };

  const canViewModerationHistory = (): boolean => {
    // Anyone can view moderation history
    return true;
  };

  const canCopyEmbedLink = (): boolean => {
    // Anyone can copy embed link
    return true;
  };

  return {
    canDelete,
    canModerate,
    canMute,
    canReport,
    canShare,
    canViewUserReports,
    canViewModerationHistory,
    canCopyEmbedLink,
  };
}

/**
 * Helper function to create action context
 */
export function createActionContext(
  targetType: "post" | "comment",
  targetId: string,
  targetAuthor: string,
  currentUser: string | null,
  isModerator: boolean,
  isLoggedIn: boolean,
  isEmbeddedMode: boolean
): ContentActionContext {
  const isOwner = currentUser === targetAuthor;

  return {
    isOwner,
    isModerator,
    isLoggedIn,
    isEmbeddedMode,
    targetType,
    targetId,
    targetAuthor,
  };
}
