import { describe, expect, it } from "vitest";

import { resolveRequirementBannerCopy } from "./conversationRequirementBannerLogic";

describe("resolveRequirementBannerCopy", () => {
  it("shows ordinary survey copy without retired ticket verification", () => {
    expect(
      resolveRequirementBannerCopy({
        hasSurvey: true,
        isOptional: false,
        needsAuth: false,
        surveyGateStatus: "not_started",
        canParticipate: false,
      })
    ).toEqual({
      titleKey: "requiredSurveyTitle",
      messageKey: "requiredSurveyMessage",
      buttonKey: "startSurveyLabel",
    });
  });

  it("uses requirement-first copy when a survey also needs account verification", () => {
    expect(
      resolveRequirementBannerCopy({
        hasSurvey: true,
        isOptional: false,
        needsAuth: true,
        surveyGateStatus: "not_started",
        canParticipate: false,
      })
    ).toEqual({
      titleKey: "requiredAccessTitle",
      messageKey: "requiredAccessMessage",
      buttonKey: "continueLabel",
    });
  });

  it("keeps account verification before the survey", () => {
    expect(
      resolveRequirementBannerCopy({
        hasSurvey: true,
        isOptional: false,
        needsAuth: true,
        surveyGateStatus: "not_started",
        canParticipate: false,
      })
    ).toEqual({
      titleKey: "requiredAccessTitle",
      messageKey: "requiredAccessMessage",
      buttonKey: "continueLabel",
    });
  });

  it("uses optional survey copy only for survey-level optional surveys", () => {
    expect(
      resolveRequirementBannerCopy({
        hasSurvey: true,
        isOptional: true,
        needsAuth: false,
        surveyGateStatus: "not_started",
        canParticipate: true,
      })
    ).toMatchObject({
      titleKey: "optionalSurveyTitle",
      messageKey: "optionalSurveyMessage",
    });

    expect(
      resolveRequirementBannerCopy({
        hasSurvey: true,
        isOptional: false,
        needsAuth: false,
        surveyGateStatus: "not_started",
        canParticipate: true,
      })
    ).toMatchObject({
      titleKey: "surveyAvailableTitle",
      messageKey: "openViaOnboardingMessage",
    });
  });
});
