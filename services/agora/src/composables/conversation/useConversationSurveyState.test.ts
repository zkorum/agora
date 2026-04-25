import type {
  SurveyFormFetchResponse,
  SurveyStatusCheckResponse,
} from "src/shared/types/dto";
import { describe, expect, it } from "vitest";

import {
  resolveSurveyForm,
  shouldFetchSurveyForm,
} from "./surveyStateLogic";

describe("shouldFetchSurveyForm", () => {
  it("returns false before survey status is known", () => {
    expect(shouldFetchSurveyForm({ surveyStatus: undefined })).toBe(false);
  });

  it("returns false when the conversation has no survey", () => {
    const surveyStatus: SurveyStatusCheckResponse = {
      surveyGate: {
        hasSurvey: false,
        canParticipate: true,
        status: "no_survey",
      },
      routeResolution: {
        kind: "none",
      },
    };

    expect(shouldFetchSurveyForm({ surveyStatus })).toBe(false);
  });

  it("returns true when the conversation has a survey", () => {
    const surveyStatus: SurveyStatusCheckResponse = {
      surveyGate: {
        hasSurvey: true,
        canParticipate: false,
        status: "not_started",
      },
      routeResolution: {
        kind: "none",
      },
    };

    expect(shouldFetchSurveyForm({ surveyStatus })).toBe(true);
  });
});

describe("resolveSurveyForm", () => {
  it("hides stale survey form data when the latest status reports no survey", () => {
    const surveyStatus: SurveyStatusCheckResponse = {
      surveyGate: {
        hasSurvey: false,
        canParticipate: true,
        status: "no_survey",
      },
      routeResolution: {
        kind: "none",
      },
    };
    const surveyForm: SurveyFormFetchResponse = {
      currentRevision: 1,
      questions: [],
      surveyGate: {
        hasSurvey: true,
        canParticipate: true,
        status: "complete_valid",
      },
    };

    expect(resolveSurveyForm({ surveyStatus, surveyForm })).toBeUndefined();
  });
});
