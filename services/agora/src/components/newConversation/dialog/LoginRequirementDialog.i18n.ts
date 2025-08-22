import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface LoginRequirementDialogTranslations {
  requiresLoginTitle: string;
  requiresLoginDescription: string;
  guestParticipationTitle: string;
  guestParticipationDescription: string;
}

export const loginRequirementDialogTranslations: Record<
  SupportedDisplayLanguageCodes,
  LoginRequirementDialogTranslations
> = {
  en: {
    requiresLoginTitle: "Requires login",
    requiresLoginDescription:
      "Anyone with the link can view the conversation, but will need to login to vote and contribute opinions",
    guestParticipationTitle: "Guest participation",
    guestParticipationDescription:
      "Anyone with the link can view the conversation, vote and contribute opinions",
  },
  es: {
    requiresLoginTitle: "Requiere inicio de sesión",
    requiresLoginDescription:
      "Cualquiera con el enlace puede ver la conversación, pero necesitará iniciar sesión para votar y contribuir opiniones",
    guestParticipationTitle: "Participación de invitados",
    guestParticipationDescription:
      "Cualquiera con el enlace puede ver la conversación, votar y contribuir opiniones",
  },
  fr: {
    requiresLoginTitle: "Connexion requise",
    requiresLoginDescription:
      "Toute personne ayant le lien peut voir la conversation, mais devra se connecter pour voter et contribuer des opinions",
    guestParticipationTitle: "Participation d'invités",
    guestParticipationDescription:
      "Toute personne ayant le lien peut voir la conversation, voter et contribuer des opinions",
  },
};
