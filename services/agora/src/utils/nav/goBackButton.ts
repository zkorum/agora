import { useRouter } from "vue-router";
import { useNavigationStore } from "src/stores/navigation";

export function useGoBackButtonHandler() {
  const router = useRouter();
  const navigationStore = useNavigationStore();

  async function safeNavigateBack() {
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
      await router.replace({ name: "/" });
    }
  }

  return {
    safeNavigateBack,
  };
}
