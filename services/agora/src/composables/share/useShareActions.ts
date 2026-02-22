/**
 * Share actions composable
 * Manages share action menu state and execution
 */

import { storeToRefs } from "pinia";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useAuthenticationStore } from "src/stores/authentication";
import { useUserStore } from "src/stores/user";
import { createActionContext } from "src/utils/actions/core/permissions";
import type {
  ContentAction,
  ContentActionDialogState,
} from "src/utils/actions/core/types";
import { getAvailableShareActions } from "src/utils/actions/definitions/share-actions";
import {
  type ShareActionsTranslations,
  shareActionsTranslations,
} from "src/utils/actions/definitions/share-actions.i18n";
import { useEmbedMode } from "src/utils/ui/embedMode";
import { type Ref, ref } from "vue";

export interface ShareActionsComposable {
  dialogState: Ref<ContentActionDialogState>;
  showShareActions: (params: {
    targetType: "post" | "comment";
    targetId: string;
    targetAuthor: string;
    copyLinkCallback: () => void | Promise<void>;
    openQrCodeCallback?: () => void | Promise<void>;
    showShareVia: boolean;
    shareUrl: string;
    shareTitle: string;
  }) => void;
  executeAction: (action: ContentAction) => Promise<void>;
  closeDialog: () => void;
}

/**
 * Composable for managing share actions
 */
export function useShareActions(): ShareActionsComposable {
  const { profileData } = storeToRefs(useUserStore());
  const { isLoggedIn } = storeToRefs(useAuthenticationStore());
  const { isEmbeddedMode } = useEmbedMode();
  const { t } = useComponentI18n<ShareActionsTranslations>(
    shareActionsTranslations
  );

  // Dialog state management
  const dialogStateRef = ref<ContentActionDialogState>({
    isVisible: false,
    context: null,
    actions: [],
  });

  /**
   * Show share actions dialog
   */
  const showShareActions = ({
    targetType,
    targetId,
    targetAuthor,
    copyLinkCallback,
    openQrCodeCallback,
    showShareVia,
    shareUrl,
    shareTitle,
  }: {
    targetType: "post" | "comment";
    targetId: string;
    targetAuthor: string;
    copyLinkCallback: () => void | Promise<void>;
    openQrCodeCallback?: () => void | Promise<void>;
    showShareVia: boolean;
    shareUrl: string;
    shareTitle: string;
  }): void => {
    const context = createActionContext(
      targetType,
      targetId,
      targetAuthor,
      profileData.value.userName,
      profileData.value.isModerator,
      isLoggedIn.value,
      isEmbeddedMode()
    );

    const translations = {
      copyLink: t("copyLink"),
      showQrCode: t("showQrCode"),
      shareVia: t("shareVia"),
    };

    const availableActions = getAvailableShareActions({
      context,
      copyLinkCallback,
      openQrCodeCallback,
      showShareVia,
      shareUrl,
      shareTitle,
      translations,
    });

    dialogStateRef.value = {
      isVisible: true,
      context,
      actions: availableActions,
    };
  };

  /**
   * Execute a share action
   */
  const executeAction = async (action: ContentAction): Promise<void> => {
    if (!dialogStateRef.value.context) {
      console.warn("No context available for action execution");
      return;
    }

    try {
      await action.handler(dialogStateRef.value.context);
      // Close dialog after successful execution
      closeDialog();
    } catch (error) {
      // AbortError is thrown when user cancels native share dialog - this is expected behavior
      if (error instanceof Error && error.name === "AbortError") {
        // User canceled share - just close dialog, don't log as error
        closeDialog();
        return;
      }
      // Log other errors
      console.error("Error executing share action:", error);
      // Close dialog even on error to prevent stuck state
      closeDialog();
    }
  };

  /**
   * Close the share actions dialog
   */
  const closeDialog = (): void => {
    dialogStateRef.value = {
      isVisible: false,
      context: null,
      actions: [],
    };
  };

  return {
    dialogState: dialogStateRef,
    showShareActions,
    executeAction,
    closeDialog,
  };
}
