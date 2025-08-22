import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface DisplayUsernameTranslations {
  guest: string;
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
