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
  de: {
    guest: "Gast",
  },
  hi: {
    guest: "अतिथि",
  },
  ar: {
    guest: "ضيف",
  },
  es: {
    guest: "Invitado",
  },
  fa: {
    guest: "مهمان",
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
  he: {
    guest: "אורח",
  },
  ja: {
    guest: "ゲスト",
  },
  ky: {
    guest: "Конок",
  },
  ru: {
    guest: "Гость",
  },
};
