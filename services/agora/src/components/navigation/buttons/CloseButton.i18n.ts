import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface CloseButtonTranslations {
  close: string;
}

export const closeButtonTranslations: Record<
  SupportedDisplayLanguageCodes,
  CloseButtonTranslations
> = {
  en: { close: "Close" },
  ar: { close: "إغلاق" },
  es: { close: "Cerrar" },
  fa: { close: "بستن" },
  fr: { close: "Fermer" },
  he: { close: "סגירה" },
  ja: { close: "閉じる" },
  ky: { close: "Жабуу" },
  ru: { close: "Закрыть" },
  "zh-Hans": { close: "关闭" },
  "zh-Hant": { close: "關閉" },
};
