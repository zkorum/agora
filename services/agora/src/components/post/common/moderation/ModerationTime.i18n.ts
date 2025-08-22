import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ModerationTimeTranslations {
  edited: string;
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
