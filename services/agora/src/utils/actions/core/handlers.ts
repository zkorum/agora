/**
 * Action handlers composable
 * This composable provides action execution functions with proper error handling
 */

import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useNewOpinionDraftsStore } from "src/stores/newOpinionDrafts";
import { useUserStore } from "src/stores/user";
import { useBackendPostApi } from "src/utils/api/post/post";
import { useInvalidateFeedQuery } from "src/utils/api/post/useFeedQuery";
import { useNotify } from "src/utils/ui/notify";

import {
  type ActionHandlersTranslations,
  actionHandlersTranslations,
} from "./handlers.i18n";
import type { ContentActionContext, ContentActionResult } from "./types";

/**
 * Composable for handling action execution
 */
export function useActionHandlers() {
  const { showNotifyMessage } = useNotify();
  const { t } = useComponentI18n<ActionHandlersTranslations>(
    actionHandlersTranslations
  );
  const { deletePostBySlugId } = useBackendPostApi();
  const { loadUserProfile } = useUserStore();
  const { deleteOpinionDraft } = useNewOpinionDraftsStore();
  const { invalidateFeed } = useInvalidateFeedQuery();

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
        showNotifyMessage(t("conversationDeleted"));
        deleteOpinionDraft(context.targetId);
        invalidateFeed();
        await loadUserProfile();

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

  return {
    executeAction,
    handlePostDelete,
  };
}
