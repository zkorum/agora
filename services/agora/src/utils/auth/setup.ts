import { useRouter } from "vue-router";

import { useBackendAuthApi } from "../api/auth";
import { useNotify } from "../ui/notify";

export function useAuthSetup() {
  const { logoutFromServer, updateAuthState } = useBackendAuthApi();
  const { showNotifyMessage } = useNotify();

  const router = useRouter();

  async function logoutRequested(shouldRedirect: boolean) {
    try {
      await logoutFromServer();
      await updateAuthState({ partialLoginStatus: { isLoggedIn: false } });
      showNotifyMessage("Logged out");
      if (shouldRedirect) {
        await router.push({ name: "/welcome/" });
      }
    } catch (e) {
      console.error("Unexpected error when logging out", e);
      showNotifyMessage("Oops! Logout failed. Please try again");
    }
  }

  return { logoutRequested };
}
