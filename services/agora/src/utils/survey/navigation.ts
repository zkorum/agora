import type { SurveyRouteResolution } from "src/shared/types/zod";

export function getConversationPath({
  conversationSlugId,
}: {
  conversationSlugId: string;
}): string {
  return `/conversation/${conversationSlugId}/`;
}

export function getConversationSurveyOnboardingPath({
  conversationSlugId,
}: {
  conversationSlugId: string;
}): string {
  return `/conversation/${conversationSlugId}/onboarding/`;
}

export function getConversationSurveyQuestionPath({
  conversationSlugId,
  questionSlugId,
}: {
  conversationSlugId: string;
  questionSlugId: string;
}): string {
  return `/conversation/${conversationSlugId}/onboarding/question/${questionSlugId}`;
}

export function getConversationSurveyVerifyPath({
  conversationSlugId,
}: {
  conversationSlugId: string;
}): string {
  return `/conversation/${conversationSlugId}/onboarding/verify`;
}

export function getConversationSurveyVerifyHardPath({
  conversationSlugId,
}: {
  conversationSlugId: string;
}): string {
  return `/conversation/${conversationSlugId}/onboarding/verify/hard`;
}

export function getConversationSurveyVerifyIdentityPath({
  conversationSlugId,
}: {
  conversationSlugId: string;
}): string {
  return `/conversation/${conversationSlugId}/onboarding/verify/identity`;
}

export function getConversationSurveyVerifyTicketPath({
  conversationSlugId,
}: {
  conversationSlugId: string;
}): string {
  return `/conversation/${conversationSlugId}/onboarding/verify/ticket`;
}

export function getConversationSurveyVerifyPhonePath({
  conversationSlugId,
}: {
  conversationSlugId: string;
}): string {
  return `/conversation/${conversationSlugId}/onboarding/verify/phone`;
}

export function getConversationSurveyVerifyPhoneCodePath({
  conversationSlugId,
}: {
  conversationSlugId: string;
}): string {
  return `/conversation/${conversationSlugId}/onboarding/verify/phone-code`;
}

export function getConversationSurveyVerifyEmailPath({
  conversationSlugId,
}: {
  conversationSlugId: string;
}): string {
  return `/conversation/${conversationSlugId}/onboarding/verify/email`;
}

export function getConversationSurveyVerifyEmailCodePath({
  conversationSlugId,
}: {
  conversationSlugId: string;
}): string {
  return `/conversation/${conversationSlugId}/onboarding/verify/email-code`;
}

export function getConversationSurveyVerifyPassportPath({
  conversationSlugId,
}: {
  conversationSlugId: string;
}): string {
  return `/conversation/${conversationSlugId}/onboarding/verify/passport`;
}

export function getConversationSurveySummaryPath({
  conversationSlugId,
}: {
  conversationSlugId: string;
}): string {
  return `/conversation/${conversationSlugId}/onboarding/summary`;
}

export function getConversationSurveyCompletePath({
  conversationSlugId,
}: {
  conversationSlugId: string;
}): string {
  return `/conversation/${conversationSlugId}/onboarding/complete`;
}

export function getConversationSurveyRoutePath({
  conversationSlugId,
  routeResolution,
}: {
  conversationSlugId: string;
  routeResolution: SurveyRouteResolution;
}): string {
  switch (routeResolution.kind) {
    case "question":
      return getConversationSurveyQuestionPath({
        conversationSlugId,
        questionSlugId: routeResolution.questionSlugId,
      });
    case "summary":
      return getConversationSurveySummaryPath({ conversationSlugId });
    case "none":
      return getConversationSurveyOnboardingPath({ conversationSlugId });
  }
}

export function getConversationSurveyContinuePath({
  conversationSlugId,
  routeResolution,
  firstQuestionSlugId,
}: {
  conversationSlugId: string;
  routeResolution: SurveyRouteResolution;
  firstQuestionSlugId: string | undefined;
}): string {
  if (routeResolution.kind === "none") {
    if (firstQuestionSlugId !== undefined) {
      return getConversationSurveyQuestionPath({
        conversationSlugId,
        questionSlugId: firstQuestionSlugId,
      });
    }

    return getConversationPath({ conversationSlugId });
  }

  return getConversationSurveyRoutePath({
    conversationSlugId,
    routeResolution,
  });
}
