import { useNavigationStore } from "src/stores/navigation";
import type { RouteLocationRaw } from "vue-router";
import { useRouter } from "vue-router";

const defaultFallback: RouteLocationRaw = { name: "/" };

export function useGoBackButtonHandler() {
  const router = useRouter();
  const navigationStore = useNavigationStore();

  async function safeNavigateBack(
    fallbackRoute: RouteLocationRaw = defaultFallback,
  ) {
    // Check if user came from conversation creation flow
    if (navigationStore.cameFromConversationCreation) {
      navigationStore.clearConversationCreationContext();
      await router.replace({ name: "/" });
      return;
    }

    // Vue Router 4 stores the previous path in window.history.state.back.
    // It is null when the current page is the first in the session (direct
    // URL entry, page refresh, or app opened via link).
    // Only trust state.back — history.length counts external entries too
    // and would cause router.go(-1) to leave the app.
    if (window.history.state?.back != null) {
      router.go(-1);
    } else {
      await router.replace(fallbackRoute);
    }
  }

  return {
    safeNavigateBack,
  };
}
