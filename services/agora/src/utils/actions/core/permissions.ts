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
    return (
      (context.isSiteModerator ||
        context.isConversationOwner ||
        context.isOrgMember) &&
      !context.isEmbeddedMode
    );
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
    return (
      (context.isSiteModerator ||
        context.isConversationOwner ||
        context.isOrgMember) &&
      !context.isEmbeddedMode
    );
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

interface CreateActionContextParams {
  targetType: "post" | "comment";
  targetId: string;
  targetAuthor: string;
  currentUser: string | null;
  isSiteModerator: boolean;
  isConversationOwner: boolean;
  isOrgMember: boolean;
  isLoggedIn: boolean;
  isEmbeddedMode: boolean;
}

export function createActionContext({
  targetType,
  targetId,
  targetAuthor,
  currentUser,
  isSiteModerator,
  isConversationOwner,
  isOrgMember,
  isLoggedIn,
  isEmbeddedMode,
}: CreateActionContextParams): ContentActionContext {
  const isOwner = currentUser === targetAuthor;

  return {
    isOwner,
    isSiteModerator,
    isConversationOwner,
    isOrgMember,
    isLoggedIn,
    isEmbeddedMode,
    targetType,
    targetId,
    targetAuthor,
  };
}
