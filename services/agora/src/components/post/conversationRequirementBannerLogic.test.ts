import { describe, expect, it } from "vitest";

import { resolveRequirementBannerCopy } from "./conversationRequirementBannerLogic";

describe("resolveRequirementBannerCopy", () => {
  it("uses requirement-first copy when a survey also needs ticket verification", () => {
    expect(
      resolveRequirementBannerCopy({
        hasSurvey: true,
        needsAuth: false,
        needsTicket: true,
        surveyGateStatus: "not_started",
        canParticipate: false,
      })
    ).toEqual({
      titleKey: "requiredAccessTitle",
      messageKey: "verifyTicketMessage",
      buttonKey: "continueLabel",
    });
  });

  it("uses requirement-first copy when a survey also needs account verification", () => {
    expect(
      resolveRequirementBannerCopy({
        hasSurvey: true,
        needsAuth: true,
        needsTicket: false,
        surveyGateStatus: "not_started",
        canParticipate: false,
      })
    ).toEqual({
      titleKey: "requiredAccessTitle",
      messageKey: "requiredAccessMessage",
      buttonKey: "continueLabel",
    });
  });

  it("uses requirement-first copy when both account and ticket are required before the survey", () => {
    expect(
      resolveRequirementBannerCopy({
        hasSurvey: true,
        needsAuth: true,
        needsTicket: true,
        surveyGateStatus: "not_started",
        canParticipate: false,
      })
    ).toEqual({
      titleKey: "requiredAccessTitle",
      messageKey: "requiredAccessMessage",
      buttonKey: "continueLabel",
    });
  });
});
