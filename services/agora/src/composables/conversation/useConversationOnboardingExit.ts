import { useConversationOnboardingStore } from "src/stores/conversationOnboarding";
import { useLoginIntentionStore } from "src/stores/loginIntention";
import {
  getHistoryPosition,
  navigateToHistoryPositionOrReplace,
} from "src/utils/nav/historyBack";
import { getConversationPath } from "src/utils/survey/navigation";
import { useRouter } from "vue-router";

export function useConversationOnboardingExit() {
  const router = useRouter();
  const conversationOnboardingStore = useConversationOnboardingStore();
  const loginIntentionStore = useLoginIntentionStore();

  async function exitToConversation({
    conversationSlugId,
  }: {
    conversationSlugId: string;
  }): Promise<void> {
    if (loginIntentionStore.activeUserIntention !== "none") {
      conversationOnboardingStore.clearForConversation({ conversationSlugId });
      await loginIntentionStore.routeUserAfterLogin();
      return;
    }

    const hasCurrentOnboardingState =
      conversationOnboardingStore.conversationSlugId === conversationSlugId;
    const fallbackPath =
      hasCurrentOnboardingState && conversationOnboardingStore.returnTarget !== null
        ? conversationOnboardingStore.returnTarget
        : getConversationPath({ conversationSlugId });
    const targetHistoryPosition = hasCurrentOnboardingState
      ? conversationOnboardingStore.returnHistoryPosition
      : null;

    conversationOnboardingStore.clearForConversation({ conversationSlugId });

    await navigateToHistoryPositionOrReplace({
      router,
      fallbackRoute: { path: fallbackPath },
      targetHistoryPosition,
      currentHistoryPosition: getHistoryPosition({
        historyState: window.history.state,
      }),
    });
  }

  return {
    exitToConversation,
  };
}
