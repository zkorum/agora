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
  ar: {
    guest: "ضيف",
  },
  es: {
    guest: "Invitado",
  },
  fr: {
    guest: "Invité",
  },
  "zh-Hans": {
    guest: "访客",
  },
  "zh-Hant": {
    guest: "訪客",
  },
  ja: {
    guest: "ゲスト",
  },
};
