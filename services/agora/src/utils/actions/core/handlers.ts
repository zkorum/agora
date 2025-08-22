/**
 * Action handlers composable
 * This composable provides action execution functions with proper error handling
 */

import { useRoute, useRouter } from "vue-router";
import { useUserStore } from "src/stores/user";
import { useHomeFeedStore } from "src/stores/homeFeed";
import { useNotify } from "src/utils/ui/notify";
import { useBackendPostApi } from "src/utils/api/post";
import type { ContentActionContext, ContentActionResult } from "./types";

/**
 * Composable for handling action execution
 */
export function useActionHandlers() {
  const router = useRouter();
  const route = useRoute();
  const { showNotifyMessage } = useNotify();
  const { deletePostBySlugId } = useBackendPostApi();
  const { loadUserProfile } = useUserStore();
  const { loadPostData } = useHomeFeedStore();

  /**
   * Handle post deletion with proper cleanup and navigation
   */
  const handlePostDelete = async (
    context: ContentActionContext
  ): Promise<ContentActionResult> => {
    try {
      if (context.targetType !== "post") {
        return {
          success: false,
          error: "Invalid target type for post deletion",
        };
      }

      const response = await deletePostBySlugId(context.targetId);
      if (response) {
        showNotifyMessage("Conversation deleted");
        await loadPostData();
        await loadUserProfile();

        // Navigate to home if we're currently viewing this post
        if (route.name === "/conversation/[postSlugId]") {
          await router.push({ name: "/" });
        }

        return { success: true, message: "Conversation deleted successfully" };
      } else {
        return { success: false, error: "Failed to delete conversation" };
      }
    } catch (error) {
      console.error("Error deleting post:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  };

  /**
   * Handle action execution with error handling
   */
  const executeAction = async (
    actionId: string,
    context: ContentActionContext,
    customHandler?: () => void | Promise<void>
  ): Promise<ContentActionResult> => {
    try {
      // Special handling for built-in actions
      if (actionId === "delete" && context.targetType === "post") {
        return await handlePostDelete(context);
      }

      // Execute custom handler if provided
      if (customHandler) {
        await customHandler();
        return { success: true };
      }

      return { success: false, error: "No handler provided for action" };
    } catch (error) {
      console.error(`Error executing action ${actionId}:`, error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  };

  /**
   * Create a wrapper for handling confirmation dialogs
   */
  const withConfirmation = (
    handler: () => void | Promise<void>,
    message: string = "Are you sure you want to perform this action?"
  ) => {
    return async () => {
      if (confirm(message)) {
        await handler();
      }
    };
  };

  /**
   * Handle action with proper error handling and notifications
   */
  const handleActionSafely = async (
    actionId: string,
    context: ContentActionContext,
    handler: () => void | Promise<void>,
    confirmationMessage?: string
  ): Promise<ContentActionResult> => {
    try {
      let wrappedHandler = handler;

      // Add confirmation wrapper if needed
      if (confirmationMessage) {
        wrappedHandler = withConfirmation(handler, confirmationMessage);
      }

      const result = await executeAction(actionId, context, wrappedHandler);

      // Show success notification for certain actions
      if (result.success && result.message) {
        showNotifyMessage(result.message);
      }

      return result;
    } catch (error) {
      console.error(`Error in handleActionSafely for ${actionId}:`, error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      showNotifyMessage(`Error: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  };

  return {
    executeAction,
    handlePostDelete,
    handleActionSafely,
    withConfirmation,
  };
}
