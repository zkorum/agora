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

    const currentIndex = window.history.length - 1;

    if (currentIndex > 1) {
      router.go(-1);
    } else {
      await router.replace(fallbackRoute);
    }
  }

  return {
    safeNavigateBack,
  };
}
