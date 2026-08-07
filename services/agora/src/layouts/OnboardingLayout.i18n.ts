import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface OnboardingLayoutTranslations {
  goBack: string;
  close: string;
}

export const onboardingLayoutTranslations: Record<
  SupportedDisplayLanguageCodes,
  OnboardingLayoutTranslations
> = {
  en: { goBack: "Go back", close: "Close" },
  ar: { goBack: "الرجوع", close: "إغلاق" },
  es: { goBack: "Volver", close: "Cerrar" },
  fa: { goBack: "بازگشت", close: "بستن" },
  fr: { goBack: "Retour", close: "Fermer" },
  he: { goBack: "חזרה", close: "סגירה" },
  ja: { goBack: "戻る", close: "閉じる" },
  ky: { goBack: "Артка", close: "Жабуу" },
  ru: { goBack: "Назад", close: "Закрыть" },
  "zh-Hans": { goBack: "返回", close: "关闭" },
  "zh-Hant": { goBack: "返回", close: "關閉" },
};
