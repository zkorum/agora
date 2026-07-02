import { defineStore } from "pinia";
import {
  type ConversationRouteContext,
  normalConversationRouteContext,
} from "src/utils/router/conversationRouteContext";
import { getConversationPath } from "src/utils/survey/navigation";
import { ref } from "vue";

export const useConversationOnboardingStore = defineStore(
  "conversationOnboarding",
  () => {
    const conversationSlugId = ref<string | null>(null);
    const returnTarget = ref<string | null>(null);
    const returnHistoryPosition = ref<number | null>(null);
    const routeContext = ref<ConversationRouteContext>(normalConversationRouteContext);
    const isResumeMode = ref(false);
    const justCompletedSurvey = ref(false);

    function startManualEntry({
      conversationSlugId: nextConversationSlugId,
      returnTarget: nextReturnTarget,
      returnHistoryPosition: nextReturnHistoryPosition,
      routeContext: nextRouteContext = normalConversationRouteContext,
    }: {
      conversationSlugId: string;
      returnTarget?: string;
      returnHistoryPosition?: number | null;
      routeContext?: ConversationRouteContext;
    }): void {
      conversationSlugId.value = nextConversationSlugId;
      routeContext.value = nextRouteContext;
      returnTarget.value =
        nextReturnTarget ??
        getConversationPath({
          conversationSlugId: nextConversationSlugId,
          routeContext: nextRouteContext,
        });
      returnHistoryPosition.value = nextReturnHistoryPosition ?? null;
      isResumeMode.value = false;
      justCompletedSurvey.value = false;
    }

    function startResumeEntry({
      conversationSlugId: nextConversationSlugId,
      returnTarget: nextReturnTarget,
      returnHistoryPosition: nextReturnHistoryPosition,
      routeContext: nextRouteContext = normalConversationRouteContext,
    }: {
      conversationSlugId: string;
      returnTarget?: string;
      returnHistoryPosition?: number | null;
      routeContext?: ConversationRouteContext;
    }): void {
      conversationSlugId.value = nextConversationSlugId;
      routeContext.value = nextRouteContext;
      returnTarget.value =
        nextReturnTarget ??
        getConversationPath({
          conversationSlugId: nextConversationSlugId,
          routeContext: nextRouteContext,
        });
      returnHistoryPosition.value = nextReturnHistoryPosition ?? null;
      isResumeMode.value = true;
      justCompletedSurvey.value = false;
    }

    function markJustCompletedSurvey({
      conversationSlugId: nextConversationSlugId,
      routeContext: nextRouteContext,
    }: {
      conversationSlugId: string;
      routeContext?: ConversationRouteContext;
    }): void {
      const isSameConversation = conversationSlugId.value === nextConversationSlugId;

      conversationSlugId.value = nextConversationSlugId;
      if (nextRouteContext !== undefined) {
        routeContext.value = nextRouteContext;
      }

      if (!isSameConversation || returnTarget.value === null) {
        returnTarget.value = getConversationPath({
          conversationSlugId: nextConversationSlugId,
          routeContext: routeContext.value,
        });
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
      routeContext.value = normalConversationRouteContext;
      isResumeMode.value = false;
      justCompletedSurvey.value = false;
    }

    return {
      conversationSlugId,
      returnTarget,
      returnHistoryPosition,
      routeContext,
      isResumeMode,
      justCompletedSurvey,
      startManualEntry,
      startResumeEntry,
      markJustCompletedSurvey,
      clearForConversation,
    };
  }
);
