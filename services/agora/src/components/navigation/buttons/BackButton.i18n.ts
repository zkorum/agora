import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface BackButtonTranslations {
  goBack: string;
}

export const backButtonTranslations: Record<
  SupportedDisplayLanguageCodes,
  BackButtonTranslations
> = {
  en: { goBack: "Go back" },
  ar: { goBack: "الرجوع" },
  es: { goBack: "Volver" },
  fa: { goBack: "بازگشت" },
  fr: { goBack: "Retour" },
  he: { goBack: "חזרה" },
  ja: { goBack: "戻る" },
  ky: { goBack: "Артка" },
  ru: { goBack: "Назад" },
  "zh-Hans": { goBack: "返回" },
  "zh-Hant": { goBack: "返回" },
};
