import { storeToRefs } from "pinia";
import { useSurveyNavigation } from "src/composables/conversation/useSurveyNavigation";
import type {
  EventSlug,
  ParticipationBlockedReason,
  ParticipationMode,
  SurveyGateSummary,
} from "src/shared/types/zod";
import { useAuthenticationStore } from "src/stores/authentication";
import { useConversationOnboardingStore } from "src/stores/conversationOnboarding";
import { useUserStore } from "src/stores/user";
import { useSurveyStatusQuery } from "src/utils/api/survey/useSurveyQueries";
import { getHistoryPosition } from "src/utils/nav/historyBack";
import { deriveSurveyRequirementState } from "src/utils/survey/requirements";
import { computed, type ComputedRef, type MaybeRefOrGetter, toValue } from "vue";
import { useRoute } from "vue-router";

export interface ParticipationGateState {
  needsAuth: ComputedRef<boolean>;
  needsTicket: ComputedRef<boolean>;
  hasSurvey: ComputedRef<boolean>;
  isSurveyBlocked: ComputedRef<boolean>;
  isBlockedBeforeParticipation: ComputedRef<boolean>;
}

function deriveSurveyBlocked({
  surveyGate,
  needsAuth,
  needsTicket,
}: {
  surveyGate: SurveyGateSummary | undefined;
  needsAuth: boolean;
  needsTicket: boolean;
}): boolean {
  return (
    surveyGate?.hasSurvey === true &&
    surveyGate.isOptional !== true &&
    !surveyGate.canParticipate &&
    !needsAuth &&
    !needsTicket
  );
}

function deriveBlockedBeforeParticipation({
  needsAuth,
  needsTicket,
  isSurveyBlocked,
}: {
  needsAuth: boolean;
  needsTicket: boolean;
  isSurveyBlocked: boolean;
}): boolean {
  return needsAuth || needsTicket || isSurveyBlocked;
}

export function useParticipationGate({
  conversationSlugId,
  participationMode,
  requiresEventTicket,
  surveyGate,
}: {
  conversationSlugId: MaybeRefOrGetter<string>;
  participationMode: MaybeRefOrGetter<ParticipationMode>;
  requiresEventTicket: MaybeRefOrGetter<EventSlug | undefined>;
  surveyGate: MaybeRefOrGetter<SurveyGateSummary | undefined>;
}) {
  const route = useRoute();
  const { isAuthInitialized, isLoggedIn, hasStrongVerification, hasEmailVerification } = storeToRefs(
    useAuthenticationStore()
  );
  const { verifiedEventTickets } = storeToRefs(useUserStore());
  const conversationOnboardingStore = useConversationOnboardingStore();
  const {
    navigateToSurveyRoot,
    navigateToNextSurveyStep,
    navigateToSurveySummary,
  } = useSurveyNavigation();
  const surveyStatusQuery = useSurveyStatusQuery({
    conversationSlugId: computed(() => toValue(conversationSlugId)),
    enabled: computed(() => isAuthInitialized.value),
  });

  const requirementState = computed(() => {
    return deriveSurveyRequirementState({
      participationMode: toValue(participationMode),
      requiresEventTicket: toValue(requiresEventTicket),
      isLoggedIn: isLoggedIn.value,
      hasStrongVerification: hasStrongVerification.value,
      hasEmailVerification: hasEmailVerification.value,
      verifiedEventTicketList: Array.from(verifiedEventTickets.value),
    });
  });

  const effectiveSurveyGate = computed(() => {
    return surveyStatusQuery.data.value?.surveyGate ?? toValue(surveyGate);
  });

  const hasSurvey = computed(() => {
    return effectiveSurveyGate.value?.hasSurvey === true;
  });

  const isSurveyBlocked = computed(() => {
    return deriveSurveyBlocked({
      surveyGate: effectiveSurveyGate.value,
      needsAuth: requirementState.value.needsAuth,
      needsTicket: requirementState.value.needsTicket,
    });
  });

  const isBlockedBeforeParticipation = computed(() => {
    return deriveBlockedBeforeParticipation({
      needsAuth: requirementState.value.needsAuth,
      needsTicket: requirementState.value.needsTicket,
      isSurveyBlocked: isSurveyBlocked.value,
    });
  });

  function startResumeEntry(): void {
    conversationOnboardingStore.startResumeEntry({
      conversationSlugId: toValue(conversationSlugId),
      returnTarget: route.fullPath,
      returnHistoryPosition: getHistoryPosition({
        historyState: window.history.state,
      }),
    });
  }

  async function shouldOpenParticipationModal(): Promise<boolean> {
    if (requirementState.value.needsAuth || requirementState.value.needsTicket) {
      return true;
    }

    if (surveyStatusQuery.data.value === undefined && isAuthInitialized.value) {
      await surveyStatusQuery.refetch();
    }

    return deriveSurveyBlocked({
      surveyGate: effectiveSurveyGate.value,
      needsAuth: requirementState.value.needsAuth,
      needsTicket: requirementState.value.needsTicket,
    });
  }

  async function openParticipationOnboarding(): Promise<void> {
    startResumeEntry();

    const gate = effectiveSurveyGate.value;
    if (
      gate?.hasSurvey === true &&
      gate.status === "complete_valid" &&
      !requirementState.value.needsAuth &&
      !requirementState.value.needsTicket
    ) {
      await navigateToSurveySummary({
        conversationSlugId: toValue(conversationSlugId),
      });
      return;
    }

    await navigateToSurveyRoot({
      conversationSlugId: toValue(conversationSlugId),
    });
  }

  async function openNextSurveyStep(): Promise<void> {
    startResumeEntry();
    await navigateToNextSurveyStep({
      conversationSlugId: toValue(conversationSlugId),
    });
  }

  async function handleBlockedReason({
    reason,
  }: {
    reason: ParticipationBlockedReason;
  }): Promise<"handled"> {
    switch (reason) {
      case "survey_required":
      case "survey_outdated":
        await openNextSurveyStep();
        return "handled";
      case "account_required":
      case "strong_verification_required":
      case "email_verification_required":
      case "event_ticket_required":
        await openParticipationOnboarding();
        return "handled";
      case "conversation_closed":
      case "conversation_locked":
        return "handled";
    }
  }

  return {
    needsAuth: computed(() => requirementState.value.needsAuth),
    needsTicket: computed(() => requirementState.value.needsTicket),
    hasSurvey,
    isSurveyBlocked,
    isBlockedBeforeParticipation,
    openParticipationOnboarding,
    openNextSurveyStep,
    handleBlockedReason,
    shouldOpenParticipationModal,
  } satisfies ParticipationGateState & {
    openParticipationOnboarding: () => Promise<void>;
    openNextSurveyStep: () => Promise<void>;
    handleBlockedReason: ({
      reason,
    }: {
      reason: ParticipationBlockedReason;
    }) => Promise<"handled">;
    shouldOpenParticipationModal: () => Promise<boolean>;
  };
}
