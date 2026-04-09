import type { SurveyFormFetchResponse, SurveyStatusCheckResponse } from "src/shared/types/dto";
import type { ParticipationMode } from "src/shared/types/zod";
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
  redirectPath: string | null;
  credentialUpgradeTarget: "hard" | "email" | "strong" | null;
  onboardingMode: "LOGIN" | null;
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
  surveyForm: SurveyFormFetchResponse | undefined;
  requirementState: VerifyRouteRequirementState;
}): VerifyRouteDecision {
  if (!exactVerifyRoute || isInitialLoading) {
    return {
      redirectPath: null,
      credentialUpgradeTarget: null,
      onboardingMode: null,
    };
  }

  if (justCompletedSurvey) {
    return {
      redirectPath: getConversationSurveyCompletePath({ conversationSlugId }),
      credentialUpgradeTarget: null,
      onboardingMode: null,
    };
  }

  if (hasLoadError) {
    return {
      redirectPath: getConversationSurveyOnboardingPath({ conversationSlugId }),
      credentialUpgradeTarget: null,
      onboardingMode: null,
    };
  }

  if (conversation === undefined || surveyStatus === undefined) {
    return {
      redirectPath: null,
      credentialUpgradeTarget: null,
      onboardingMode: null,
    };
  }

  if (requirementState.needsAuth) {
    if (conversation.participationMode === "guest") {
      return {
        redirectPath: null,
        credentialUpgradeTarget: null,
        onboardingMode: "LOGIN",
      };
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

    return {
      redirectPath,
      credentialUpgradeTarget: destination.target,
      onboardingMode: "LOGIN",
    };
  }

  if (requirementState.needsTicket) {
    return {
      redirectPath: getConversationSurveyVerifyTicketPath({ conversationSlugId }),
      credentialUpgradeTarget: null,
      onboardingMode: null,
    };
  }

  if (!surveyStatus.surveyGate.hasSurvey) {
    return {
      redirectPath: getConversationPath({ conversationSlugId }),
      credentialUpgradeTarget: null,
      onboardingMode: null,
    };
  }

  if (surveyForm === undefined) {
    return {
      redirectPath: null,
      credentialUpgradeTarget: null,
      onboardingMode: null,
    };
  }

  return {
    redirectPath: getConversationSurveyContinuePath({
      conversationSlugId,
      routeResolution: surveyStatus.routeResolution,
      firstQuestionSlugId: surveyForm.questions[0]?.questionSlugId,
    }),
    credentialUpgradeTarget: null,
    onboardingMode: null,
  };
}
