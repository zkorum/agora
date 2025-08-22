import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface VisibilityOptionsDialogTranslations {
  publicTitle: string;
  publicDescription: string;
  privateTitle: string;
  privateDescription: string;
}

export const visibilityOptionsDialogTranslations: Record<
  SupportedDisplayLanguageCodes,
  VisibilityOptionsDialogTranslations
> = {
  en: {
    publicTitle: "Public",
    publicDescription:
      "This conversation will be visible to all users in the main Agora feed",
    privateTitle: "Private",
    privateDescription:
      "Only visible to those with whom you share a link or QR code",
  },
  es: {
    publicTitle: "Público",
    publicDescription:
      "Esta conversación será visible para todos los usuarios en el feed principal de Ágora",
    privateTitle: "Privado",
    privateDescription:
      "Solo visible para aquellos con quienes compartas un enlace o código QR",
  },
  fr: {
    publicTitle: "Public",
    publicDescription:
      "Cette conversation sera visible par tous les utilisateurs dans le flux principal d'Agora",
    privateTitle: "Privé",
    privateDescription:
      "Visible uniquement par ceux avec qui vous partagez un lien ou un code QR",
  },
};
