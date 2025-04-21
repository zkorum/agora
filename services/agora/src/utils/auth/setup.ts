import { useAuthenticationStore } from "src/stores/authentication";
import { usePostStore } from "src/stores/post";
import { useUserStore } from "src/stores/user";

export function useAuthSetup() {
  const { loadPostData } = usePostStore();
  const { loadUserProfile } = useUserStore();
  const authStore = useAuthenticationStore();

  async function userLogin() {
    authStore.setLoginStatus({
      isLoggedIn: true,
    });
    await loadPostData(false);
    await loadUserProfile();
  }

  return { userLogin };
}
