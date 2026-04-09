import type { SurveyGateStatus } from "src/shared/types/zod";

import type { ConversationRequirementBannerTranslations } from "./ConversationRequirementBanner.i18n";

export interface RequirementBannerCopyState {
  hasSurvey: boolean;
  needsAuth: boolean;
  needsTicket: boolean;
  surveyGateStatus: SurveyGateStatus;
  canParticipate: boolean;
}

export interface RequirementBannerCopyKeys {
  titleKey: keyof ConversationRequirementBannerTranslations;
  messageKey: keyof ConversationRequirementBannerTranslations;
  buttonKey: keyof ConversationRequirementBannerTranslations;
}

export function resolveRequirementBannerCopy({
  hasSurvey,
  needsAuth,
  needsTicket,
  surveyGateStatus,
  canParticipate,
}: RequirementBannerCopyState): RequirementBannerCopyKeys {
  if (!hasSurvey) {
    if (needsAuth || needsTicket) {
      return {
        titleKey: "ticketRequiredTitle",
        messageKey: "ticketRequiredMessage",
        buttonKey: "continueLabel",
      };
    }

    return {
      titleKey: "ticketVerifiedTitle",
      messageKey: "ticketVerifiedMessage",
      buttonKey: "continueLabel",
    };
  }

  if (needsAuth || needsTicket) {
    return {
      titleKey: "requiredAccessTitle",
      messageKey:
        needsAuth || !needsTicket
          ? "requiredAccessMessage"
          : "verifyTicketMessage",
      buttonKey: "continueLabel",
    };
  }

  if (surveyGateStatus === "not_started") {
    return {
      titleKey: canParticipate ? "optionalSurveyTitle" : "requiredSurveyTitle",
      messageKey: canParticipate ? "optionalSurveyMessage" : "requiredSurveyMessage",
      buttonKey: canParticipate ? "openSurveyLabel" : "startSurveyLabel",
    };
  }

  switch (surveyGateStatus) {
    case "complete_valid":
      return {
        titleKey: "surveyCompleteTitle",
        messageKey: "surveyUpToDateMessage",
        buttonKey: "reviewAnswersLabel",
      };
    case "needs_update":
      return {
        titleKey: "surveyUpdateTitle",
        messageKey: "surveyChangedMessage",
        buttonKey: "updateAnswersLabel",
      };
    case "in_progress":
      return {
        titleKey: "surveyInProgressTitle",
        messageKey: canParticipate
          ? "surveyInProgressAvailableMessage"
          : "surveyInProgressRequiredMessage",
        buttonKey: "continueSurveyLabel",
      };
    case "no_survey":
      return {
        titleKey: "surveyUnavailableTitle",
        messageKey: "surveyUnavailableTitle",
        buttonKey: "openSurveyLabel",
      };
  }
}
