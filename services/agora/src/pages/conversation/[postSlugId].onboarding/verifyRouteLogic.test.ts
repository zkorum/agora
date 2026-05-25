import type { SurveyFormFetchResponse, SurveyStatusCheckResponse } from "src/shared/types/dto";
import { describe, expect, it } from "vitest";

import { resolveVerifyRouteDecision } from "./verifyRouteLogic";

function createNoSurveyStatus(): SurveyStatusCheckResponse {
  return {
    surveyGate: {
      hasSurvey: false,
      isOptional: false,
      canParticipate: true,
      status: "no_survey",
    },
    routeResolution: {
      kind: "none",
    },
  };
}

function createSurveyStatus(): SurveyStatusCheckResponse {
  return {
    surveyGate: {
      hasSurvey: true,
      isOptional: false,
      canParticipate: false,
      status: "not_started",
    },
    routeResolution: {
      kind: "none",
    },
  };
}

describe("resolveVerifyRouteDecision", () => {
  it("routes ticket-only conversations to the ticket step without waiting for a survey form", () => {
    const decision = resolveVerifyRouteDecision({
      exactVerifyRoute: true,
      isInitialLoading: false,
      hasLoadError: false,
      justCompletedSurvey: false,
      conversationSlugId: "qlWQFzY",
      conversation: {
        participationMode: "guest",
      },
      surveyStatus: createNoSurveyStatus(),
      surveyForm: undefined,
      requirementState: {
        needsAuth: false,
        needsTicket: true,
      },
    });

    expect(decision.navigation).toEqual({
      kind: "redirect",
      path: "/conversation/qlWQFzY/onboarding/verify/ticket",
    });
  });

  it("waits for the survey form only when a survey actually exists", () => {
    const decision = resolveVerifyRouteDecision({
      exactVerifyRoute: true,
      isInitialLoading: false,
      hasLoadError: false,
      justCompletedSurvey: false,
      conversationSlugId: "qlWQFzY",
      conversation: {
        participationMode: "guest",
      },
      surveyStatus: createSurveyStatus(),
      surveyForm: undefined,
      requirementState: {
        needsAuth: false,
        needsTicket: false,
      },
    });

    expect(decision.navigation).toEqual({ kind: "none" });
  });

  it("exits through the intention-aware path once ticket-only verification is already satisfied", () => {
    const decision = resolveVerifyRouteDecision({
      exactVerifyRoute: true,
      isInitialLoading: false,
      hasLoadError: false,
      justCompletedSurvey: false,
      conversationSlugId: "qlWQFzY",
      conversation: {
        participationMode: "guest",
      },
      surveyStatus: createNoSurveyStatus(),
      surveyForm: undefined,
      requirementState: {
        needsAuth: false,
        needsTicket: false,
      },
    });

    expect(decision.navigation).toEqual({ kind: "exitToConversation" });
  });

  it("exits through the intention-aware path when the survey flow resolves to the conversation", () => {
    const surveyForm: SurveyFormFetchResponse = {
      currentRevision: 1,
      questions: [],
      surveyGate: {
        hasSurvey: true,
        isOptional: false,
        canParticipate: true,
        status: "complete_valid",
      },
    };

    const decision = resolveVerifyRouteDecision({
      exactVerifyRoute: true,
      isInitialLoading: false,
      hasLoadError: false,
      justCompletedSurvey: false,
      conversationSlugId: "qlWQFzY",
      conversation: {
        participationMode: "guest",
      },
      surveyStatus: {
        surveyGate: surveyForm.surveyGate,
        routeResolution: {
          kind: "none",
        },
      },
      surveyForm,
      requirementState: {
        needsAuth: false,
        needsTicket: false,
      },
    });

    expect(decision.navigation).toEqual({ kind: "exitToConversation" });
  });

  it("routes auth-gated conversations before checking ticket or survey completion", () => {
    const surveyForm: SurveyFormFetchResponse = {
      currentRevision: 1,
      questions: [],
      surveyGate: {
        hasSurvey: false,
        isOptional: false,
        canParticipate: true,
        status: "no_survey",
      },
    };

    const decision = resolveVerifyRouteDecision({
      exactVerifyRoute: true,
      isInitialLoading: false,
      hasLoadError: false,
      justCompletedSurvey: false,
      conversationSlugId: "qlWQFzY",
      conversation: {
        participationMode: "account_required",
      },
      surveyStatus: createNoSurveyStatus(),
      surveyForm,
      requirementState: {
        needsAuth: true,
        needsTicket: true,
      },
    });

    expect(decision.navigation).toEqual({
      kind: "redirect",
      path: "/conversation/qlWQFzY/onboarding/verify/hard",
    });
    expect(decision.credentialUpgradeTarget).toBe("hard");
    expect(decision.onboardingMode).toBe("LOGIN");
  });
});
