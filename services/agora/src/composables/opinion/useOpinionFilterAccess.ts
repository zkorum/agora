import { useAuthenticationStore } from "src/stores/authentication";
import { useUserStore } from "src/stores/user";
import type { CommentFilterOptions } from "src/utils/component/opinion";

export function useOpinionFilterAccess() {
  const authStore = useAuthenticationStore();
  const userStore = useUserStore();

  function isFilterAvailable(filter: CommentFilterOptions): boolean {
    switch (filter) {
      case "my_statements":
      case "my_votes":
        return authStore.isGuestOrLoggedIn;
      case "hidden":
        return authStore.isLoggedIn && userStore.profileData.isSiteModerator;
      case "discover":
      case "new":
      case "moderated":
        return true;
    }
  }

  function resolveFilter(filter: CommentFilterOptions): CommentFilterOptions {
    // Copied URLs and expired sessions can request a filter this viewer cannot use.
    return isFilterAvailable(filter) ? filter : "discover";
  }

  return { isFilterAvailable, resolveFilter };
}
