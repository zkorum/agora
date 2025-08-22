/**
 * Main content actions composable
 * This composable integrates permissions, handlers, and dialog management
 */

import { ref } from "vue";
import { storeToRefs } from "pinia";
import { useUserStore } from "src/stores/user";
import { useAuthenticationStore } from "src/stores/authentication";
import { useEmbedMode } from "src/utils/ui/embedMode";
import { useActionPermissions, createActionContext } from "../core/permissions";
import { useActionHandlers } from "../core/handlers";
import { getAvailableCommentActions } from "./comments";
import { getAvailablePostActions } from "./posts";
import type { ContentActionDialogState, ContentAction } from "../core/types";
import { useComponentI18n } from "src/composables/useComponentI18n";
import {
  actionsTranslations,
  type ActionsTranslations,
} from "./content-actions.i18n";

/**
 * Main composable for content actions management
 */
export function useContentActions() {
  const { profileData } = storeToRefs(useUserStore());
  const { isLoggedIn } = storeToRefs(useAuthenticationStore());
  const { isEmbeddedMode } = useEmbedMode();
  const permissions = useActionPermissions();
  const handlers = useActionHandlers();
  const { t } = useComponentI18n<ActionsTranslations>(actionsTranslations);

  // Dialog state management
  const dialogState = ref<ContentActionDialogState>({
    isVisible: false,
    context: null,
    actions: [],
  });

  /**
   * Show comment action dialog
   */
  const showCommentActions = (
    targetId: string,
    targetAuthor: string,
    callbacks: {
      deleteCommentCallback: () => void | Promise<void>;
      reportCommentCallback: () => void;
      openUserReportsCallback: () => void | Promise<void>;
      muteUserCallback: () => void | Promise<void>;
      moderateCommentCallback: () => void | Promise<void>;
      shareOpinionCallback: () => void | Promise<void>;
    }
  ): void => {
    const context = createActionContext(
      "comment",
      targetId,
      targetAuthor,
      profileData.value.userName,
      profileData.value.isModerator,
      isLoggedIn.value,
      isEmbeddedMode()
    );

    const commentTranslations = {
      report: t("report"),
      muteUser: t("muteUser"),
      delete: t("delete"),
      moderate: t("moderate"),
      userReports: t("userReports"),
      share: t("share"),
    };

    const availableActions = getAvailableCommentActions(
      context,
      callbacks.deleteCommentCallback,
      callbacks.reportCommentCallback,
      callbacks.openUserReportsCallback,
      callbacks.muteUserCallback,
      callbacks.moderateCommentCallback,
      callbacks.shareOpinionCallback,
      commentTranslations
    );

    dialogState.value = {
      isVisible: true,
      context,
      actions: availableActions,
    };
  };

  /**
   * Show post action dialog
   */
  const showPostActions = (
    targetId: string,
    targetAuthor: string,
    callbacks: {
      reportPostCallback: () => void;
      openUserReportsCallback: () => void | Promise<void>;
      muteUserCallback: () => void | Promise<void>;
      moderatePostCallback: () => void | Promise<void>;
      moderationHistoryCallback: () => void | Promise<void>;
      copyEmbedLinkCallback: () => void | Promise<void>;
    }
  ): void => {
    const context = createActionContext(
      "post",
      targetId,
      targetAuthor,
      profileData.value.userName,
      profileData.value.isModerator,
      isLoggedIn.value,
      isEmbeddedMode()
    );

    // Create delete callback for posts
    const deletePostCallback = async () => {
      const result = await handlers.handlePostDelete(context);
      if (result.success) {
        closeDialog();
      }
    };

    const postTranslations = {
      report: t("report"),
      muteUser: t("muteUser"),
      delete: t("delete"),
      moderationHistory: t("moderationHistory"),
      embedLink: t("embedLink"),
      moderate: t("moderate"),
      userReports: t("userReports"),
    };

    const availableActions = getAvailablePostActions(
      context,
      callbacks.reportPostCallback,
      callbacks.openUserReportsCallback,
      callbacks.muteUserCallback,
      callbacks.moderatePostCallback,
      callbacks.moderationHistoryCallback,
      callbacks.copyEmbedLinkCallback,
      deletePostCallback,
      postTranslations
    );

    dialogState.value = {
      isVisible: true,
      context,
      actions: availableActions,
    };
  };

  /**
   * Execute an action from the dialog
   */
  const executeAction = async (action: ContentAction): Promise<void> => {
    if (!dialogState.value.context) return;

    try {
      let handler = action.handler;

      // Add confirmation wrapper for destructive actions
      if (action.requiresConfirmation) {
        const confirmMessage =
          action.id === "delete"
            ? `Are you sure you want to delete this ${dialogState.value.context.targetType}?`
            : "Are you sure you want to perform this action?";

        const wrappedHandler = () => action.handler(dialogState.value.context!);
        handler = handlers.withConfirmation(wrappedHandler, confirmMessage);
      }

      await handler(dialogState.value.context);

      // Close dialog after successful action (except for certain actions that should keep it open)
      const keepOpenActions = ["moderationHistory", "embedLink"];
      if (!keepOpenActions.includes(action.id)) {
        closeDialog();
      }
    } catch (error) {
      console.error("Error executing action:", error);
    }
  };

  /**
   * Close the action dialog
   */
  const closeDialog = (): void => {
    dialogState.value = {
      isVisible: false,
      context: null,
      actions: [],
    };
  };

  /**
   * Get current dialog state
   */
  const getDialogState = () => dialogState.value;

  return {
    // Dialog state
    dialogState: dialogState.value,
    getDialogState,

    // Action functions
    showCommentActions,
    showPostActions,
    executeAction,
    closeDialog,

    // Utilities
    permissions,
    handlers,
  };
}
