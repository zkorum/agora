import type {
  ConversationEmailUpdateOnboardingAction,
  ConversationParticipationRejection,
  ConversationParticipationStatus,
  SurveyAnswerSaveResponse,
} from "src/shared/types/dto";
import type { ParticipationBlockedReason } from "src/shared/types/zod";

const statuses = {
  account_required: {
    status: "onboarding_required",
    nextStep: { kind: "account", purpose: "login" },
  },
  email_verification_required: {
    status: "onboarding_required",
    nextStep: { kind: "email", purpose: "login" },
  },
  strong_verification_required: {
    status: "onboarding_required",
    nextStep: { kind: "identity", purpose: "login" },
  },
  survey_required: {
    status: "onboarding_required",
    nextStep: {
      kind: "survey",
      routeResolution: { kind: "question", questionSlugId: "question" },
    },
  },
  survey_outdated: {
    status: "onboarding_required",
    nextStep: {
      kind: "survey",
      routeResolution: { kind: "question", questionSlugId: "question" },
    },
  },
  conversation_closed: { status: "blocked", reason: "conversation_closed" },
  conversation_locked: { status: "blocked", reason: "conversation_locked" },
} satisfies Record<
  ParticipationBlockedReason,
  ConversationParticipationRejection["participationStatus"]
>;

export function participationRejectionFixture(
  reason: ParticipationBlockedReason
): ConversationParticipationRejection {
  return { success: false, reason, participationStatus: statuses[reason] };
}

export const emailUpdateActionFixture: ConversationEmailUpdateOnboardingAction =
  {
    operation: "set_conversation_preference",
    conversationSlugId: "example",
    initialEnabled: true,
  };
export const emailUpdateStatusFixture: ConversationParticipationStatus = {
  status: "onboarding_required",
  nextStep: { kind: "email_updates", action: emailUpdateActionFixture },
};
export const savedSurveyFixture: Extract<
  SurveyAnswerSaveResponse,
  { success: true }
> = {
  success: true,
  justCompleted: true,
  surveyConfigId: 1,
  currentRevision: 1,
  routeResolution: { kind: "summary" },
  savedQuestion: {
    questionSlugId: "question",
    questionType: "choice",
    questionText: "How do you travel?",
    displayOrder: 0,
    isRequired: true,
    isPublicAggregateSuppressionEnabled: false,
    choiceDisplay: "list",
    constraints: { type: "choice", minSelections: 1, maxSelections: 1 },
    options: [
      { optionSlugId: "bicycle", optionText: "Bicycle", displayOrder: 0 },
    ],
    currentAnswer: { questionType: "choice", optionSlugIds: ["bicycle"] },
    isPassed: false,
    isMissingRequired: false,
    isStale: false,
    isCurrentAnswerValid: true,
    currentSemanticVersion: 1,
    answeredQuestionSemanticVersion: 1,
  },
  surveyGate: {
    hasSurvey: true,
    isOptional: false,
    canParticipate: true,
    status: "complete_valid",
  },
  participationStatus: { status: "ready" },
};
