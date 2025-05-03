import { useAuthenticationStore } from "src/stores/authentication";
import { usePostStore } from "src/stores/post";
import { useUserStore } from "src/stores/user";
import { useBackendAuthApi } from "../api/auth";
import { useNotify } from "../ui/notify";

export function useAuthSetup() {
  const { loadPostData } = usePostStore();
  const { loadUserProfile } = useUserStore();
  const authStore = useAuthenticationStore();

  const { logoutFromServer, updateAuthState } = useBackendAuthApi();
  const { showNotifyMessage } = useNotify();

  async function userLogin() {
    authStore.setLoginStatus({
      isLoggedIn: true,
    });
    await loadPostData(false);
    await loadUserProfile();
  }

  async function logoutRequested() {
    try {
      await logoutFromServer();
      await updateAuthState({ partialLoginStatus: { isLoggedIn: false } });
      showNotifyMessage("Logged out");
    } catch (e) {
      console.error("Unexpected error when logging out", e);
      showNotifyMessage("Oops! Logout failed. Please try again");
    }
  }

  return { userLogin, logoutRequested };
}
