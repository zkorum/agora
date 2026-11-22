import type { ConversationOnboardingStep } from "src/shared/types/dto";
import type { SurveyRouteResolution } from "src/shared/types/zod";
import {
  type ConversationRouteContext,
  getConversationPath as getScopedConversationPath,
  getConversationSurveyBasePath,
  normalConversationRouteContext,
} from "src/utils/router/conversationRouteContext";

export function getConversationPath({
  conversationSlugId,
  routeContext = normalConversationRouteContext,
}: {
  conversationSlugId: string;
  routeContext?: ConversationRouteContext;
}): string {
  return getScopedConversationPath({ conversationSlugId, routeContext });
}

export function getConversationSurveyOnboardingPath({
  conversationSlugId,
  routeContext = normalConversationRouteContext,
}: {
  conversationSlugId: string;
  routeContext?: ConversationRouteContext;
}): string {
  return `${getConversationSurveyBasePath({ conversationSlugId, routeContext })}/`;
}

export function getConversationCredentialChoicePath({
  conversationSlugId,
  routeContext,
  nextStep,
}: {
  conversationSlugId: string;
  routeContext: ConversationRouteContext;
  nextStep: ConversationOnboardingStep | undefined;
}): string {
  switch (nextStep?.kind) {
    case "identity":
      return getConversationSurveyVerifyIdentityPath({
        conversationSlugId,
        routeContext,
      });
    case "account":
    case undefined:
      return getConversationSurveyVerifyHardPath({
        conversationSlugId,
        routeContext,
      });
    case "email":
    case "survey":
    case "email_updates":
      return getConversationSurveyOnboardingPath({
        conversationSlugId,
        routeContext,
      });
  }
}

export function getConversationOnboardingStepPath({
  conversationSlugId,
  routeContext,
  nextStep,
}: {
  conversationSlugId: string;
  routeContext: ConversationRouteContext;
  nextStep: ConversationOnboardingStep;
}): string {
  const params = { conversationSlugId, routeContext };
  switch (nextStep.kind) {
    case "account":
      return getConversationSurveyVerifyHardPath(params);
    case "email":
      return getConversationSurveyVerifyEmailPath(params);
    case "identity":
      return getConversationSurveyVerifyIdentityPath(params);
    case "email_updates":
      return getConversationSurveyCompletePath(params);
    case "survey":
      return getConversationSurveyRoutePath({
        ...params,
        routeResolution: nextStep.routeResolution,
      });
  }
}

export function getConversationSurveyQuestionPath({
  conversationSlugId,
  questionSlugId,
  routeContext = normalConversationRouteContext,
}: {
  conversationSlugId: string;
  questionSlugId: string;
  routeContext?: ConversationRouteContext;
}): string {
  return `${getConversationSurveyBasePath({ conversationSlugId, routeContext })}/question/${questionSlugId}`;
}

export function getConversationSurveyVerifyPath({
  conversationSlugId,
  routeContext = normalConversationRouteContext,
}: {
  conversationSlugId: string;
  routeContext?: ConversationRouteContext;
}): string {
  return `${getConversationSurveyBasePath({ conversationSlugId, routeContext })}/verify`;
}

export function getConversationSurveyVerifyHardPath({
  conversationSlugId,
  routeContext = normalConversationRouteContext,
}: {
  conversationSlugId: string;
  routeContext?: ConversationRouteContext;
}): string {
  return `${getConversationSurveyBasePath({ conversationSlugId, routeContext })}/verify/hard`;
}

export function getConversationSurveyVerifyIdentityPath({
  conversationSlugId,
  routeContext = normalConversationRouteContext,
}: {
  conversationSlugId: string;
  routeContext?: ConversationRouteContext;
}): string {
  return `${getConversationSurveyBasePath({ conversationSlugId, routeContext })}/verify/identity`;
}

export function getConversationSurveyVerifyPhonePath({
  conversationSlugId,
  routeContext = normalConversationRouteContext,
}: {
  conversationSlugId: string;
  routeContext?: ConversationRouteContext;
}): string {
  return `${getConversationSurveyBasePath({ conversationSlugId, routeContext })}/verify/phone`;
}

export function getConversationSurveyVerifyPhoneCodePath({
  conversationSlugId,
  routeContext = normalConversationRouteContext,
}: {
  conversationSlugId: string;
  routeContext?: ConversationRouteContext;
}): string {
  return `${getConversationSurveyBasePath({ conversationSlugId, routeContext })}/verify/phone-code`;
}

export function getConversationSurveyVerifyEmailPath({
  conversationSlugId,
  routeContext = normalConversationRouteContext,
}: {
  conversationSlugId: string;
  routeContext?: ConversationRouteContext;
}): string {
  return `${getConversationSurveyBasePath({ conversationSlugId, routeContext })}/verify/email`;
}

export function getConversationSurveyVerifyEmailCodePath({
  conversationSlugId,
  routeContext = normalConversationRouteContext,
}: {
  conversationSlugId: string;
  routeContext?: ConversationRouteContext;
}): string {
  return `${getConversationSurveyBasePath({ conversationSlugId, routeContext })}/verify/email-code`;
}

export function getConversationSurveyVerifyPassportPath({
  conversationSlugId,
  routeContext = normalConversationRouteContext,
}: {
  conversationSlugId: string;
  routeContext?: ConversationRouteContext;
}): string {
  return `${getConversationSurveyBasePath({ conversationSlugId, routeContext })}/verify/passport`;
}

export function getConversationSurveySummaryPath({
  conversationSlugId,
  routeContext = normalConversationRouteContext,
}: {
  conversationSlugId: string;
  routeContext?: ConversationRouteContext;
}): string {
  return `${getConversationSurveyBasePath({ conversationSlugId, routeContext })}/summary`;
}

export function getConversationSurveyCompletePath({
  conversationSlugId,
  routeContext = normalConversationRouteContext,
}: {
  conversationSlugId: string;
  routeContext?: ConversationRouteContext;
}): string {
  return `${getConversationSurveyBasePath({ conversationSlugId, routeContext })}/complete`;
}

export function getConversationSurveyRoutePath({
  conversationSlugId,
  routeResolution,
  routeContext = normalConversationRouteContext,
}: {
  conversationSlugId: string;
  routeResolution: SurveyRouteResolution;
  routeContext?: ConversationRouteContext;
}): string {
  switch (routeResolution.kind) {
    case "question":
      return getConversationSurveyQuestionPath({
        conversationSlugId,
        questionSlugId: routeResolution.questionSlugId,
        routeContext,
      });
    case "summary":
      return getConversationSurveySummaryPath({
        conversationSlugId,
        routeContext,
      });
    case "none":
      return getConversationSurveyOnboardingPath({
        conversationSlugId,
        routeContext,
      });
  }
}

export function getConversationSurveyContinuePath({
  conversationSlugId,
  routeResolution,
  firstQuestionSlugId,
  routeContext = normalConversationRouteContext,
}: {
  conversationSlugId: string;
  routeResolution: SurveyRouteResolution;
  firstQuestionSlugId: string | undefined;
  routeContext?: ConversationRouteContext;
}): string {
  if (routeResolution.kind === "none") {
    if (firstQuestionSlugId !== undefined) {
      return getConversationSurveyQuestionPath({
        conversationSlugId,
        questionSlugId: firstQuestionSlugId,
        routeContext,
      });
    }

    return getConversationPath({ conversationSlugId, routeContext });
  }

  return getConversationSurveyRoutePath({
    conversationSlugId,
    routeResolution,
    routeContext,
  });
}
