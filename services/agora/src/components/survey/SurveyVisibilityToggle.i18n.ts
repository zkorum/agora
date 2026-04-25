import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface SurveyVisibilityToggleTranslations {
  suppressed: string;
  full: string;
}

export const surveyVisibilityToggleTranslations: Record<
  SupportedDisplayLanguageCodes,
  SurveyVisibilityToggleTranslations
> = {
  en: {
    suppressed: "Suppressed",
    full: "Full",
  },
  ar: {
    suppressed: "محجوب",
    full: "كامل",
  },
  es: {
    suppressed: "Suprimido",
    full: "Completo",
  },
  fa: {
    suppressed: "پنهان‌شده",
    full: "کامل",
  },
  fr: {
    suppressed: "Masqué",
    full: "Complet",
  },
  he: {
    suppressed: "מוסתר",
    full: "מלא",
  },
  ja: {
    suppressed: "非表示",
    full: "完全",
  },
  ky: {
    suppressed: "Жашырылган",
    full: "Толук",
  },
  ru: {
    suppressed: "Скрыто",
    full: "Полностью",
  },
  "zh-Hans": {
    suppressed: "已隐藏",
    full: "完整",
  },
  "zh-Hant": {
    suppressed: "已隱藏",
    full: "完整",
  },
};
