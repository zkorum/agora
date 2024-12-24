import { storeToRefs } from "pinia";
import { useAuthenticationStore } from "src/stores/authentication";
import { usePostStore } from "src/stores/post";
import { useUserStore } from "src/stores/user";

export function useAuthSetup() {
  const { loadPostData } = usePostStore();
  const { loadUserProfile } = useUserStore();
  const { isAuthenticated } = storeToRefs(useAuthenticationStore());

  async function userLogin() {
    isAuthenticated.value = true;
    await loadPostData(false);
    await loadUserProfile();
  }

  return { userLogin };
}
