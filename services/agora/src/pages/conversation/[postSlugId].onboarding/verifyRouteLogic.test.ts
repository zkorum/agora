import type { SurveyFormFetchResponse, SurveyStatusCheckResponse } from "src/shared/types/dto";
import { describe, expect, it } from "vitest";

import { resolveVerifyRouteDecision } from "./verifyRouteLogic";

function createNoSurveyStatus(): SurveyStatusCheckResponse {
  return {
    surveyGate: {
      hasSurvey: false,
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

    expect(decision.redirectPath).toBe(
      "/conversation/qlWQFzY/onboarding/verify/ticket"
    );
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

    expect(decision.redirectPath).toBeNull();
  });

  it("returns to the conversation once ticket-only verification is already satisfied", () => {
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

    expect(decision.redirectPath).toBe("/conversation/qlWQFzY/");
  });

  it("routes auth-gated conversations before checking ticket or survey completion", () => {
    const surveyForm: SurveyFormFetchResponse = {
      currentRevision: 1,
      questions: [],
      surveyGate: {
        hasSurvey: false,
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

    expect(decision.redirectPath).toBe(
      "/conversation/qlWQFzY/onboarding/verify/hard"
    );
    expect(decision.credentialUpgradeTarget).toBe("hard");
    expect(decision.onboardingMode).toBe("LOGIN");
  });
});
