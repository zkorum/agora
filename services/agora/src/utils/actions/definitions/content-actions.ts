/**
 * Main content actions composable
 * This composable integrates permissions, handlers, and dialog management
 */

import { storeToRefs } from "pinia";
import { useAuthenticationStore } from "src/stores/authentication";
import { useUserStore } from "src/stores/user";
import { useEmbedMode } from "src/utils/ui/embedMode";
import { ref } from "vue";

import { useActionHandlers } from "../core/handlers";
import { createActionContext,useActionPermissions } from "../core/permissions";
import type {
  ContentAction,
  ContentActionContext,
  ContentActionDialogState,
} from "../core/types";
import { getAvailableCommentActions } from "./comments";
import { getAvailablePostActions } from "./posts";

// Confirmation dialog state interface
interface ConfirmationDialogState {
  isVisible: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant: "default" | "destructive";
  pendingAction: ContentAction | null;
  pendingActionContext: ContentActionContext | null;
}
import { useComponentI18n } from "src/composables/ui/useComponentI18n";

import {
  type ActionsTranslations,
  actionsTranslations,
} from "./content-actions.i18n";

// Actions that require confirmation before execution
const DESTRUCTIVE_ACTIONS = ["delete", "muteUser"];

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

  // Confirmation dialog state management
  const confirmationState = ref<ConfirmationDialogState>({
    isVisible: false,
    message: "",
    confirmText: "Confirm",
    cancelText: "Cancel",
    variant: "default",
    pendingAction: null,
    pendingActionContext: null,
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
      exportConversationCallback: () => void | Promise<void>;
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
      exportConversation: t("exportConversation"),
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
      callbacks.exportConversationCallback,
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

    // Check if this action requires confirmation
    if (DESTRUCTIVE_ACTIONS.includes(action.id)) {
      showConfirmationDialog(action);
      return;
    }

    // Execute action directly if no confirmation needed
    await executeActionDirectly(action);
  };

  /**
   * Show confirmation dialog for destructive actions
   */
  const showConfirmationDialog = (action: ContentAction): void => {
    const targetType = dialogState.value.context?.targetType;

    let confirmMessage = t("confirmGenericAction");
    let confirmText = t("confirm");

    if (action.id === "delete") {
      confirmMessage =
        targetType === "post"
          ? t("confirmDeletePost")
          : t("confirmDeleteComment");
      confirmText = t("delete");
    } else if (action.id === "muteUser") {
      confirmMessage = t("confirmMuteUser");
      confirmText = t("muteUser");
    }

    confirmationState.value = {
      isVisible: true,
      message: confirmMessage,
      confirmText: confirmText,
      cancelText: t("cancel"),
      variant: action.variant === "destructive" ? "destructive" : "default",
      pendingAction: action,
      pendingActionContext: dialogState.value.context,
    };

    // Hide action dialog while showing confirmation
    dialogState.value.isVisible = false;
  };

  /**
   * Execute action directly without confirmation
   */
  const executeActionDirectly = async (
    action: ContentAction,
    context?: ContentActionContext
  ): Promise<void> => {
    const actionContext = context || dialogState.value.context;
    if (!actionContext) return;

    try {
      await action.handler(actionContext);

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
   * Handle confirmation dialog confirmation
   */
  const handleConfirmation = async (): Promise<void> => {
    const action = confirmationState.value.pendingAction;
    const context = confirmationState.value.pendingActionContext;
    if (!action || !context) return;

    // Close confirmation dialog
    closeConfirmationDialog();

    // Execute the pending action with the stored context
    await executeActionDirectly(action, context);
  };

  /**
   * Handle confirmation dialog cancellation
   */
  const handleConfirmationCancel = (): void => {
    closeConfirmationDialog();
  };

  /**
   * Close confirmation dialog
   */
  const closeConfirmationDialog = (): void => {
    confirmationState.value = {
      isVisible: false,
      message: "",
      confirmText: "Confirm",
      cancelText: "Cancel",
      variant: "default",
      pendingAction: null,
      pendingActionContext: null,
    };
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

  return {
    // Dialog state
    dialogState,
    confirmationState,

    // Action functions
    showCommentActions,
    showPostActions,
    executeAction,
    closeDialog,

    // Confirmation dialog functions
    handleConfirmation,
    handleConfirmationCancel,
    closeConfirmationDialog,

    // Utilities
    permissions,
    handlers,
  };
}
