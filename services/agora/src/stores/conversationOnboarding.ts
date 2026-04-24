import { defineStore } from "pinia";
import { getConversationPath } from "src/utils/survey/navigation";
import { ref } from "vue";

export const useConversationOnboardingStore = defineStore(
  "conversationOnboarding",
  () => {
    const conversationSlugId = ref<string | null>(null);
    const returnTarget = ref<string | null>(null);
    const returnHistoryPosition = ref<number | null>(null);
    const isResumeMode = ref(false);
    const justCompletedSurvey = ref(false);

    function startManualEntry({
      conversationSlugId: nextConversationSlugId,
      returnTarget: nextReturnTarget,
      returnHistoryPosition: nextReturnHistoryPosition,
    }: {
      conversationSlugId: string;
      returnTarget?: string;
      returnHistoryPosition?: number | null;
    }): void {
      conversationSlugId.value = nextConversationSlugId;
      returnTarget.value =
        nextReturnTarget ??
        getConversationPath({ conversationSlugId: nextConversationSlugId });
      returnHistoryPosition.value = nextReturnHistoryPosition ?? null;
      isResumeMode.value = false;
      justCompletedSurvey.value = false;
    }

    function startResumeEntry({
      conversationSlugId: nextConversationSlugId,
      returnTarget: nextReturnTarget,
      returnHistoryPosition: nextReturnHistoryPosition,
    }: {
      conversationSlugId: string;
      returnTarget?: string;
      returnHistoryPosition?: number | null;
    }): void {
      conversationSlugId.value = nextConversationSlugId;
      returnTarget.value =
        nextReturnTarget ??
        getConversationPath({ conversationSlugId: nextConversationSlugId });
      returnHistoryPosition.value = nextReturnHistoryPosition ?? null;
      isResumeMode.value = true;
      justCompletedSurvey.value = false;
    }

    function markJustCompletedSurvey({ conversationSlugId: nextConversationSlugId }: { conversationSlugId: string }): void {
      const isSameConversation = conversationSlugId.value === nextConversationSlugId;

      conversationSlugId.value = nextConversationSlugId;

      if (!isSameConversation || returnTarget.value === null) {
        returnTarget.value = getConversationPath({ conversationSlugId: nextConversationSlugId });
      }

      if (!isSameConversation) {
        returnHistoryPosition.value = null;
      }

      justCompletedSurvey.value = true;
    }

    function clearForConversation({ conversationSlugId: currentConversationSlugId }: { conversationSlugId: string }): void {
      if (conversationSlugId.value !== currentConversationSlugId) {
        return;
      }

      conversationSlugId.value = null;
      returnTarget.value = null;
      returnHistoryPosition.value = null;
      isResumeMode.value = false;
      justCompletedSurvey.value = false;
    }

    return {
      conversationSlugId,
      returnTarget,
      returnHistoryPosition,
      isResumeMode,
      justCompletedSurvey,
      startManualEntry,
      startResumeEntry,
      markJustCompletedSurvey,
      clearForConversation,
    };
  }
);
