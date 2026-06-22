import type { SurveyStatusCheckResponse } from "src/shared/types/dto";
import type { ParticipationMode } from "src/shared/types/zod";
import type { SurveyFormData } from "src/utils/api/survey/useSurveyQueries";
import {
  getConversationPath,
  getConversationSurveyCompletePath,
  getConversationSurveyContinuePath,
  getConversationSurveyOnboardingPath,
  getConversationSurveyVerifyEmailPath,
  getConversationSurveyVerifyHardPath,
  getConversationSurveyVerifyIdentityPath,
  getConversationSurveyVerifyTicketPath,
} from "src/utils/survey/navigation";
import { getCredentialUpgradeDestination } from "src/utils/survey/requirements";

export interface VerifyRouteConversationState {
  participationMode: ParticipationMode;
}

export interface VerifyRouteRequirementState {
  needsAuth: boolean;
  needsTicket: boolean;
}

export interface VerifyRouteDecision {
  navigation:
    | { kind: "none" }
    | { kind: "redirect"; path: string }
    | { kind: "exitToConversation" };
  credentialUpgradeTarget: "hard" | "email" | "strong" | null;
  onboardingMode: "LOGIN" | null;
}

interface CreateDecisionParams {
  navigation: VerifyRouteDecision["navigation"];
  credentialUpgradeTarget?: "hard" | "email" | "strong" | null;
  onboardingMode?: "LOGIN" | null;
}

function createDecision({
  navigation,
  credentialUpgradeTarget = null,
  onboardingMode = null,
}: CreateDecisionParams): VerifyRouteDecision {
  return {
    navigation,
    credentialUpgradeTarget,
    onboardingMode,
  };
}

export function resolveVerifyRouteDecision({
  exactVerifyRoute,
  isInitialLoading,
  hasLoadError,
  justCompletedSurvey,
  conversationSlugId,
  conversation,
  surveyStatus,
  surveyForm,
  requirementState,
}: {
  exactVerifyRoute: boolean;
  isInitialLoading: boolean;
  hasLoadError: boolean;
  justCompletedSurvey: boolean;
  conversationSlugId: string;
  conversation: VerifyRouteConversationState | undefined;
  surveyStatus: SurveyStatusCheckResponse | undefined;
  surveyForm: SurveyFormData | undefined;
  requirementState: VerifyRouteRequirementState;
}): VerifyRouteDecision {
  if (!exactVerifyRoute || isInitialLoading) {
    return createDecision({ navigation: { kind: "none" } });
  }

  if (justCompletedSurvey) {
    return createDecision({
      navigation: {
        kind: "redirect",
        path: getConversationSurveyCompletePath({ conversationSlugId }),
      },
    });
  }

  if (hasLoadError) {
    return createDecision({
      navigation: {
        kind: "redirect",
        path: getConversationSurveyOnboardingPath({ conversationSlugId }),
      },
    });
  }

  if (conversation === undefined || surveyStatus === undefined) {
    return createDecision({ navigation: { kind: "none" } });
  }

  if (requirementState.needsAuth) {
    if (conversation.participationMode === "guest") {
      return createDecision({
        navigation: { kind: "none" },
        onboardingMode: "LOGIN",
      });
    }

    const destination = getCredentialUpgradeDestination({
      participationMode: conversation.participationMode,
    });

    const redirectPath = (() => {
      switch (destination.target) {
        case "email":
          return getConversationSurveyVerifyEmailPath({ conversationSlugId });
        case "strong":
          return getConversationSurveyVerifyIdentityPath({ conversationSlugId });
        case "hard":
          return getConversationSurveyVerifyHardPath({ conversationSlugId });
      }
    })();

    return createDecision({
      navigation: { kind: "redirect", path: redirectPath },
      credentialUpgradeTarget: destination.target,
      onboardingMode: "LOGIN",
    });
  }

  if (requirementState.needsTicket) {
    return createDecision({
      navigation: {
        kind: "redirect",
        path: getConversationSurveyVerifyTicketPath({ conversationSlugId }),
      },
    });
  }

  if (!surveyStatus.surveyGate.hasSurvey) {
    return createDecision({ navigation: { kind: "exitToConversation" } });
  }

  if (surveyForm === undefined) {
    return createDecision({ navigation: { kind: "none" } });
  }

  const continuePath = getConversationSurveyContinuePath({
    conversationSlugId,
    routeResolution: surveyStatus.routeResolution,
    firstQuestionSlugId: surveyForm.questions[0]?.questionSlugId,
  });

  if (continuePath === getConversationPath({ conversationSlugId })) {
    return createDecision({ navigation: { kind: "exitToConversation" } });
  }

  return createDecision({
    navigation: {
      kind: "redirect",
      path: continuePath,
    },
  });
}
