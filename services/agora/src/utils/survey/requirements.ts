import type { EventSlug, ParticipationMode } from "src/shared/types/zod";

export type CredentialUpgradeDestination =
  | {
      target: "hard";
      path: "/verify/hard/";
    }
  | {
      target: "email";
      path: "/verify/email/";
    }
  | {
      target: "strong";
      path: "/verify/identity/";
    };

export interface SurveyRequirementState {
  needsAuth: boolean;
  needsTicket: boolean;
}

export function deriveSurveyRequirementState({
  participationMode,
  requiresEventTicket,
  isLoggedIn,
  hasStrongVerification,
  hasEmailVerification,
  verifiedEventTicketList,
}: {
  participationMode: ParticipationMode;
  requiresEventTicket: EventSlug | undefined;
  isLoggedIn: boolean;
  hasStrongVerification: boolean;
  hasEmailVerification: boolean;
  verifiedEventTicketList: readonly EventSlug[];
}): SurveyRequirementState {
  const needsAuth = (() => {
    switch (participationMode) {
      case "guest":
        return false;
      case "account_required":
        return !isLoggedIn;
      case "strong_verification":
        return !hasStrongVerification;
      case "email_verification":
        return !hasEmailVerification;
    }
  })();

  const needsTicket =
    requiresEventTicket !== undefined &&
    !verifiedEventTicketList.includes(requiresEventTicket);

  return {
    needsAuth,
    needsTicket,
  };
}

export function getCredentialUpgradeDestination({
  participationMode,
}: {
  participationMode: Exclude<ParticipationMode, "guest">;
}): CredentialUpgradeDestination {
  switch (participationMode) {
    case "account_required":
      return {
        target: "hard",
        path: "/verify/hard/",
      };
    case "email_verification":
      return {
        target: "email",
        path: "/verify/email/",
      };
    case "strong_verification":
      return {
        target: "strong",
        path: "/verify/identity/",
      };
  }
}
