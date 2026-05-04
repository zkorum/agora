import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useLoginIntentionStore } from "src/stores/loginIntention";
import { useRouter } from "vue-router";

import { useBackendAuthApi } from "../api/auth";
import { useNotify } from "../ui/notify";
import {
  type AuthSetupTranslations,
  authSetupTranslations,
} from "./setup.i18n";

export function useAuthSetup() {
  const { logoutFromServer, updateAuthState } = useBackendAuthApi();
  const { showNotifyMessage } = useNotify();
  const { t } = useComponentI18n<AuthSetupTranslations>(authSetupTranslations);
  const { setActiveUserIntention } = useLoginIntentionStore();

  const router = useRouter();

  async function logoutRequested(shouldRedirect: boolean) {
    try {
      await logoutFromServer();
      await updateAuthState({ partialLoginStatus: { isLoggedIn: false } });
      setActiveUserIntention("none");
      showNotifyMessage(t("loggedOut"));
      if (shouldRedirect) {
        await router.push({ name: "/" });
      }
    } catch (e) {
      console.error("Unexpected error when logging out", e);
      showNotifyMessage(t("logoutFailed"));
    }
  }

  return { logoutRequested };
}
