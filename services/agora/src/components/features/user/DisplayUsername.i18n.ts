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
  "zh-CN": {
    guest: "访客",
  },
  "zh-TW": {
    guest: "訪客",
  },
  ja: {
    guest: "ゲスト",
  },
};
