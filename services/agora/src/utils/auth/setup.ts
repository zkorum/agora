import { useLoginIntentionStore } from "src/stores/loginIntention";
import { useRouter } from "vue-router";

import { useBackendAuthApi } from "../api/auth";
import { useNotify } from "../ui/notify";

export function useAuthSetup() {
  const { logoutFromServer, updateAuthState } = useBackendAuthApi();
  const { showNotifyMessage } = useNotify();
  const { setActiveUserIntention } = useLoginIntentionStore();

  const router = useRouter();

  async function logoutRequested(shouldRedirect: boolean) {
    try {
      await logoutFromServer();
      await updateAuthState({ partialLoginStatus: { isLoggedIn: false } });
      setActiveUserIntention("none");
      showNotifyMessage("Logged out");
      if (shouldRedirect) {
        await router.push({ name: "/" });
      }
    } catch (e) {
      console.error("Unexpected error when logging out", e);
      showNotifyMessage("Oops! Logout failed. Please try again");
    }
  }

  return { logoutRequested };
}
