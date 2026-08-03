import { useQuasar } from "quasar";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useLoginIntentionStore } from "src/stores/loginIntention";
import { useRouter } from "vue-router";

import { useBackendAuthApi } from "../api/auth";
import { useNotify } from "../ui/notify";
import { resetLocalAuthState } from "./localAuthState";
import { type LogoutFlowResult, runLogoutFlow } from "./logoutFlow";
import { navigateHomeAfterLogout } from "./logoutNavigation";
import {
  type AuthSetupTranslations,
  authSetupTranslations,
} from "./setup.i18n";

export function useAuthSetup() {
  const { logoutFromServer } = useBackendAuthApi();
  const { showNotifyMessage } = useNotify();
  const { t } = useComponentI18n<AuthSetupTranslations>(authSetupTranslations);
  const { setActiveUserIntention } = useLoginIntentionStore();
  const quasar = useQuasar();

  const router = useRouter();

  async function logoutRequested(shouldRedirect: boolean) {
    const result = await runLogoutFlow({
      revokeFromServer: logoutFromServer,
      clearLocalState: resetLocalState,
      clearActiveUserIntention,
      navigate: getLogoutNavigation(shouldRedirect),
    });

    if (result.status === "server-revocation-failed") {
      console.error("Server logout could not be confirmed", result.error);
      showNotifyMessage(t("logoutFailed"));
      showServerLogoutFailureDialog(shouldRedirect);
      return;
    }

    handleLocalLogoutResult({ result, shouldRedirect });
  }

  function showServerLogoutFailureDialog(shouldRedirect: boolean): void {
    quasar
      .dialog({
        title: t("localOnlyTitle"),
        message: t("localOnlyMessage"),
        ok: { label: t("clearLocalData"), color: "negative" },
        cancel: { label: t("retry"), flat: true },
      })
      .onOk(() => {
        void clearLocalDevice({ shouldRedirect });
      })
      .onCancel(() => {
        void logoutRequested(shouldRedirect);
      });
  }

  async function clearLocalDevice({
    shouldRedirect,
  }: {
    shouldRedirect: boolean;
  }): Promise<void> {
    const result = await runLogoutFlow({
      clearLocalState: resetLocalState,
      clearActiveUserIntention,
      navigate: getLogoutNavigation(shouldRedirect),
    });
    handleLocalLogoutResult({ result, shouldRedirect });
  }

  function handleLocalLogoutResult({
    result,
    shouldRedirect,
  }: {
    result: LogoutFlowResult;
    shouldRedirect: boolean;
  }): void {
    if (result.status === "completed") {
      showNotifyMessage(t("loggedOut"));
      return;
    }

    if (result.status === "local-cleanup-failed") {
      console.error("Failed to clear local authentication state", result.error);
      showBlockingRetryDialog({
        title: t("localCleanupFailedTitle"),
        message: t("localCleanupFailedMessage"),
        retry: () => clearLocalDevice({ shouldRedirect }),
      });
      return;
    }

    if (result.status === "navigation-failed") {
      console.error("Failed to navigate after logout", result.error);
      showNavigationRetryDialog();
    }
  }

  function showNavigationRetryDialog(): void {
    showBlockingRetryDialog({
      title: t("navigationFailedTitle"),
      message: t("navigationFailedMessage"),
      retry: retryNavigation,
    });
  }

  async function retryNavigation(): Promise<void> {
    try {
      await navigateHome();
    } catch (error) {
      console.error("Failed to navigate after logout", error);
      showNavigationRetryDialog();
    }
  }

  function showBlockingRetryDialog({
    title,
    message,
    retry,
  }: {
    title: string;
    message: string;
    retry: () => Promise<void>;
  }): void {
    quasar
      .dialog({
        title,
        message,
        ok: { label: t("retry") },
        cancel: false,
        persistent: true,
      })
      .onOk(() => {
        void retry();
      });
  }

  function clearActiveUserIntention(): void {
    setActiveUserIntention("none");
  }

  function resetLocalState(): Promise<void> {
    return resetLocalAuthState({ shouldClearLanguagePreferences: true });
  }

  function getLogoutNavigation(
    shouldRedirect: boolean
  ): (() => Promise<void>) | undefined {
    return shouldRedirect ? navigateHome : undefined;
  }

  async function navigateHome(): Promise<void> {
    await navigateHomeAfterLogout(router);
  }

  return { logoutRequested };
}
