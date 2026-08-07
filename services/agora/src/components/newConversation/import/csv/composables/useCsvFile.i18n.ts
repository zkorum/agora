import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface UseCsvFileTranslations {
  validationFailed: string;
}

export const useCsvFileTranslations: Record<
  SupportedDisplayLanguageCodes,
  UseCsvFileTranslations
> = {
  en: { validationFailed: "Validation failed" },
  ar: { validationFailed: "فشل التحقق" },
  es: { validationFailed: "La validación falló" },
  fa: { validationFailed: "اعتبارسنجی ناموفق بود" },
  fr: { validationFailed: "Échec de la validation" },
  he: { validationFailed: "האימות נכשל" },
  ja: { validationFailed: "検証に失敗しました" },
  ky: { validationFailed: "Текшерүү ишке ашкан жок" },
  ru: { validationFailed: "Проверка не пройдена" },
  "zh-Hans": { validationFailed: "验证失败" },
  "zh-Hant": { validationFailed: "驗證失敗" },
};
