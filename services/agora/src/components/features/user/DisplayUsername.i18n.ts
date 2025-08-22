import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface DisplayUsernameTranslations {
  guest: string;
  [key: string]: string; // Required for Record<string, string> constraint
}

export const displayUsernameTranslations: Record<
  SupportedDisplayLanguageCodes,
  DisplayUsernameTranslations
> = {
  en: {
    guest: "Guest",
  },
  es: {
    guest: "Invitado",
  },
  fr: {
    guest: "Invité",
  },
};
