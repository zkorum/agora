import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface CommentModerationTranslations {
  edit: string;
  moderatorFlaggedMessage: string;
  [key: string]: string; // Required for Record<string, string> constraint
}

export const commentModerationTranslations: Record<
  SupportedDisplayLanguageCodes,
  CommentModerationTranslations
> = {
  en: {
    edit: "Edit",
    moderatorFlaggedMessage: "Moderator flagged this response as",
  },
  es: {
    edit: "Editar",
    moderatorFlaggedMessage: "El moderador marcó esta respuesta como",
  },
  fr: {
    edit: "Modifier",
    moderatorFlaggedMessage: "Le modérateur a signalé cette réponse comme",
  },
};
