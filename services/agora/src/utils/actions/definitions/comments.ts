/**
 * Comment-specific action definitions
 * This file defines all available actions for comments/opinions
 */

import type { ContentAction, ContentActionContext } from "../core/types";

/**
 * Translation keys for comment actions
 */
interface CommentActionTranslations {
  report: string;
  muteUser: string;
  delete: string;
  moderate: string;
  userReports: string;
  share: string;
}

/**
 * Get all available comment actions with their handlers and visibility logic
 */
export function getCommentActions(
  deleteCommentCallback: () => void | Promise<void>,
  reportCommentCallback: () => void,
  openUserReportsCallback: () => void | Promise<void>,
  muteUserCallback: () => void | Promise<void>,
  moderateCommentCallback: () => void | Promise<void>,
  shareOpinionCallback: () => void | Promise<void>,
  translations: CommentActionTranslations
): ContentAction[] {
  return [
    {
      id: "report",
      label: translations.report,
      icon: "mdi-flag",
      variant: "warning",
      handler: reportCommentCallback,
      isVisible: () => true, // Always visible
    },
    {
      id: "muteUser",
      label: translations.muteUser,
      icon: "mdi-account-off",
      variant: "warning",
      handler: muteUserCallback,
      isVisible: (context: ContentActionContext) =>
        !context.isOwner && context.isLoggedIn && !context.isEmbeddedMode,
    },
    {
      id: "delete",
      label: translations.delete,
      icon: "mdi-delete",
      variant: "destructive",
      handler: deleteCommentCallback,
      isVisible: (context: ContentActionContext) => context.isOwner,
    },
    {
      id: "moderate",
      label: translations.moderate,
      icon: "mdi-sword",
      variant: "warning",
      handler: moderateCommentCallback,
      isVisible: (context: ContentActionContext) =>
        context.isModerator && !context.isEmbeddedMode,
    },
    {
      id: "userReports",
      label: translations.userReports,
      icon: "mdi-account-alert",
      handler: openUserReportsCallback,
      isVisible: (context: ContentActionContext) =>
        context.isModerator && !context.isEmbeddedMode,
    },
    {
      id: "share",
      label: translations.share,
      icon: "mdi-export-variant",
      handler: shareOpinionCallback,
      isVisible: () => true, // Always visible
    },
  ];
}

/**
 * Get filtered actions based on context
 */
export function getAvailableCommentActions(
  context: ContentActionContext,
  deleteCommentCallback: () => void | Promise<void>,
  reportCommentCallback: () => void,
  openUserReportsCallback: () => void | Promise<void>,
  muteUserCallback: () => void | Promise<void>,
  moderateCommentCallback: () => void | Promise<void>,
  shareOpinionCallback: () => void | Promise<void>,
  translations: CommentActionTranslations
): ContentAction[] {
  const allActions = getCommentActions(
    deleteCommentCallback,
    reportCommentCallback,
    openUserReportsCallback,
    muteUserCallback,
    moderateCommentCallback,
    shareOpinionCallback,
    translations
  );

  return allActions.filter((action) => action.isVisible(context));
}
