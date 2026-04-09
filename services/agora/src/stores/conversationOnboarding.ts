import { defineStore } from "pinia";
import { getConversationPath } from "src/utils/survey/navigation";
import { ref } from "vue";

export const useConversationOnboardingStore = defineStore(
  "conversationOnboarding",
  () => {
    const conversationSlugId = ref<string | null>(null);
    const returnTarget = ref<string | null>(null);
    const isResumeMode = ref(false);
    const justCompletedSurvey = ref(false);

    function startManualEntry({ conversationSlugId: nextConversationSlugId }: { conversationSlugId: string }): void {
      conversationSlugId.value = nextConversationSlugId;
      returnTarget.value = getConversationPath({ conversationSlugId: nextConversationSlugId });
      isResumeMode.value = false;
      justCompletedSurvey.value = false;
    }

    function startResumeEntry({ conversationSlugId: nextConversationSlugId }: { conversationSlugId: string }): void {
      conversationSlugId.value = nextConversationSlugId;
      returnTarget.value = getConversationPath({ conversationSlugId: nextConversationSlugId });
      isResumeMode.value = true;
      justCompletedSurvey.value = false;
    }

    function markJustCompletedSurvey({ conversationSlugId: nextConversationSlugId }: { conversationSlugId: string }): void {
      conversationSlugId.value = nextConversationSlugId;
      returnTarget.value = getConversationPath({ conversationSlugId: nextConversationSlugId });
      justCompletedSurvey.value = true;
    }

    function clearForConversation({ conversationSlugId: currentConversationSlugId }: { conversationSlugId: string }): void {
      if (conversationSlugId.value !== currentConversationSlugId) {
        return;
      }

      conversationSlugId.value = null;
      returnTarget.value = null;
      isResumeMode.value = false;
      justCompletedSurvey.value = false;
    }

    return {
      conversationSlugId,
      returnTarget,
      isResumeMode,
      justCompletedSurvey,
      startManualEntry,
      startResumeEntry,
      markJustCompletedSurvey,
      clearForConversation,
    };
  }
);
