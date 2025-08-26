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
  "zh-Hans": {
    edited: "(已编辑)",
  },
  "zh-Hant": {
    edited: "(已編輯)",
  },
  ja: {
    edited: "(編集済み)",
  },
};
