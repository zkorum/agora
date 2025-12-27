/**
 * Post-specific action definitions
 * This file defines all available actions for posts/conversations
 */

import { processEnv } from "src/utils/processEnv";

import type { ContentAction, ContentActionContext } from "../core/types";

/**
 * Translation keys for post actions
 */
interface PostActionTranslations {
  report: string;
  muteUser: string;
  delete: string;
  moderationHistory: string;
  embedLink: string;
  moderate: string;
  userReports: string;
  exportConversation: string;
}

/**
 * Get all available post actions with their handlers and visibility logic
 */
export function getPostActions(
  reportPostCallback: () => void,
  openUserReportsCallback: () => void | Promise<void>,
  muteUserCallback: () => void | Promise<void>,
  moderatePostCallback: () => void | Promise<void>,
  moderationHistoryCallback: () => void | Promise<void>,
  copyEmbedLinkCallback: () => void | Promise<void>,
  deletePostCallback: () => void | Promise<void>,
  exportConversationCallback: () => void | Promise<void>,
  translations: PostActionTranslations
): ContentAction[] {
  return [
    {
      id: "report",
      label: translations.report,
      icon: "mdi-flag",
      variant: "warning",
      handler: reportPostCallback,
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
      handler: deletePostCallback,
      isVisible: (context: ContentActionContext) =>
        context.isOwner && !context.isEmbeddedMode,
    },
    {
      id: "moderationHistory",
      label: translations.moderationHistory,
      icon: "mdi-book-open",
      handler: moderationHistoryCallback,
      isVisible: () => true, // Always visible
    },
    {
      id: "embedLink",
      label: translations.embedLink,
      icon: "mdi-content-copy",
      handler: copyEmbedLinkCallback,
      isVisible: () => true, // Always visible
    },
    {
      id: "moderate",
      label: translations.moderate,
      icon: "mdi-sword",
      variant: "warning",
      handler: moderatePostCallback,
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
      id: "exportConversation",
      label: translations.exportConversation,
      icon: "mdi-download",
      handler: exportConversationCallback,
      isVisible: (context: ContentActionContext) =>
        context.isLoggedIn &&
        !context.isEmbeddedMode &&
        processEnv.VITE_EXPORT_CONVOS_ENABLED === "true",
    },
  ];
}

/**
 * Get filtered actions based on context
 */
export function getAvailablePostActions(
  context: ContentActionContext,
  reportPostCallback: () => void,
  openUserReportsCallback: () => void | Promise<void>,
  muteUserCallback: () => void | Promise<void>,
  moderatePostCallback: () => void | Promise<void>,
  moderationHistoryCallback: () => void | Promise<void>,
  copyEmbedLinkCallback: () => void | Promise<void>,
  deletePostCallback: () => void | Promise<void>,
  exportConversationCallback: () => void | Promise<void>,
  translations: PostActionTranslations
): ContentAction[] {
  const allActions = getPostActions(
    reportPostCallback,
    openUserReportsCallback,
    muteUserCallback,
    moderatePostCallback,
    moderationHistoryCallback,
    copyEmbedLinkCallback,
    deletePostCallback,
    exportConversationCallback,
    translations
  );

  return allActions.filter((action) => action.isVisible(context));
}
