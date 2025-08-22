import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface LoginIntentionTranslations {
  newOpinion: string;
  newConversation: string;
  agreement: string;
  reportUserContent: string;
  voting: string;
}

export const welcomeTranslations: Record<
  SupportedDisplayLanguageCodes,
  LoginIntentionTranslations
> = {
  en: {
    newOpinion: "Your written opinion draft will be restored when you return.",
    newConversation:
      "Your written conversation draft will be restored when you return.",
    agreement: "You will be returned to this opinion when you return.",
    reportUserContent: "A user account is required to report user content.",
    voting: "You will be returned to this conversation when you return.",
  },
  es: {
    newOpinion: "Su borrador se restaurará cuando regrese.",
    newConversation:
      "Su borrador de conversación escrita se restaurará cuando regrese.",
    agreement: "Se le devolverá a esta opinión cuando regrese.",
    reportUserContent:
      "Se requiere una cuenta de usuario para reportar contenido.",
    voting: "Se le devolverá a esta conversación cuando regrese.",
  },
  fr: {
    newOpinion: "Votre brouillon d’opinion sera restauré à votre retour.",
    newConversation:
      "Votre brouillon de conversation sera restauré à votre retour.",
    agreement: "Vous serez redirigé vers cette opinion à votre retour.",
    reportUserContent:
      "Un compte utilisateur est requis pour signaler du contenu.",
    voting: "Vous serez redirigé vers cette conversation à votre retour.",
  },
};
