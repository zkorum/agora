import { useQueryClient } from "@tanstack/vue-query";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { ConversationParticipationRejection } from "src/shared/types/dto";
import { useConversationOnboardingStore } from "src/stores/conversationOnboarding";
import { useParticipationStatusQuery } from "src/utils/api/participation/useParticipationStatusQuery";
import { getHistoryPosition } from "src/utils/nav/historyBack";
import {
  getConversationRouteContextFromRoute,
  isConversationOnboardingRouteName,
} from "src/utils/router/conversationRouteContext";
import { useNotify } from "src/utils/ui/notify";
import { computed, type MaybeRefOrGetter, toValue } from "vue";
import { useRoute } from "vue-router";

import { participationGateTranslations } from "./useParticipationGate.i18n";
import { useSurveyNavigation } from "./useSurveyNavigation";

export function useParticipationGate(
  conversationSlugId: MaybeRefOrGetter<string>
) {
  const route = useRoute();
  const queryClient = useQueryClient();
  const { showNotifyMessage } = useNotify();
  const { t } = useComponentI18n(participationGateTranslations);
  const onboarding = useConversationOnboardingStore();
  const { navigateToSurveyRoot } = useSurveyNavigation();
  const { participationStatus, recordRejection } =
    useParticipationStatusQuery(conversationSlugId);

  async function navigateToOnboarding(): Promise<void> {
    if (isConversationOnboardingRouteName(route.name)) return;
    // Routing uses the snapshot; actual questionnaire data refreshes on entry.
    for (const resource of ["survey-status", "survey-form"]) {
      void queryClient.invalidateQueries({
        queryKey: [resource, toValue(conversationSlugId)],
        refetchType: "none",
      });
    }
    onboarding.startResumeEntry({
      conversationSlugId: toValue(conversationSlugId),
      returnTarget: route.fullPath,
      returnHistoryPosition: getHistoryPosition({
        historyState: window.history.state,
      }),
      routeContext: getConversationRouteContextFromRoute(route),
    });
    await navigateToSurveyRoot({
      conversationSlugId: toValue(conversationSlugId),
    });
  }

  async function openParticipationOnboarding(): Promise<void> {
    if (participationStatus.value.status === "blocked") {
      showNotifyMessage(t("participationUnavailable"));
      return;
    }
    await navigateToOnboarding();
  }

  function captureParticipationAction() {
    const isCurrent = onboarding.captureSession();
    async function handleBlockedReason({
      participationStatus: status,
    }: ConversationParticipationRejection): Promise<void> {
      // A rejection from before this onboarding session must not rewind it.
      if (!isCurrent()) return;
      recordRejection(status);
      if (status.status === "blocked") return;
      showNotifyMessage(t("participationNeedsOnboarding"));
      await navigateToOnboarding();
    }
    return { isCurrent, handleBlockedReason };
  }

  const needsAuth = computed(() => {
    const status = participationStatus.value;
    return (
      status.status === "onboarding_required" &&
      (status.nextStep.kind === "account" ||
        status.nextStep.kind === "email" ||
        status.nextStep.kind === "identity")
    );
  });
  const needsTicket = computed(
    () =>
      participationStatus.value.status === "onboarding_required" &&
      participationStatus.value.nextStep.kind === "ticket"
  );

  return {
    participationStatus,
    needsAuth,
    needsTicket,
    openParticipationOnboarding,
    captureParticipationAction,
    recordParticipationRejection: recordRejection,
  };
}
