import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ModerationTimeTranslations {
  edited: string;
  [key: string]: string; // Required for Record<string, string> constraint
}

export const moderationTimeTranslations: Record<
  SupportedDisplayLanguageCodes,
  ModerationTimeTranslations
> = {
  en: {
    edited: "(edited)",
  },
  es: {
    edited: "(editado)",
  },
  fr: {
    edited: "(modifié)",
  },
};
