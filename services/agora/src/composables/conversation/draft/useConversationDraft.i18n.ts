/**
 * Internationalization for conversation draft composable
 */

import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface UseConversationDraftTranslations {
  bodyExceedsLimit: string;
  polisUrlRequired: string;
  polisUrlInvalid: string;
  titleRequired: string;
  titleValidationFailed: string;
}

export const useConversationDraftTranslations: Record<
  SupportedDisplayLanguageCodes,
  UseConversationDraftTranslations
> = {
  en: {
    bodyExceedsLimit: "Body exceeds maximum length ({count}/{max})",
    polisUrlRequired: "Polis URL is required",
    polisUrlInvalid: "Please enter a valid Polis URL.",
    titleRequired: "Title is required to continue",
    titleValidationFailed: "Title validation failed",
  },
  fr: {
    bodyExceedsLimit: "Le corps dépasse la longueur maximale ({count}/{max})",
    polisUrlRequired: "L'URL Polis est requise",
    polisUrlInvalid: "Veuillez entrer une URL Polis valide.",
    titleRequired: "Le titre est requis pour continuer",
    titleValidationFailed: "La validation du titre a échoué",
  },
  es: {
    bodyExceedsLimit: "El cuerpo excede la longitud máxima ({count}/{max})",
    polisUrlRequired: "Se requiere la URL de Polis",
    polisUrlInvalid: "Por favor ingrese una URL de Polis válida.",
    titleRequired: "Se requiere título para continuar",
    titleValidationFailed: "La validación del título falló",
  },
  fa: {
    bodyExceedsLimit: "متن از حداکثر طول فراتر رفته است ({count}/{max})",
    polisUrlRequired: "آدرس Polis الزامی است",
    polisUrlInvalid: "لطفاً یک آدرس Polis معتبر وارد کنید.",
    titleRequired: "عنوان برای ادامه الزامی است",
    titleValidationFailed: "اعتبارسنجی عنوان ناموفق بود",
  },
  he: {
    bodyExceedsLimit: "הגוף חורג מהאורך המרבי ({count}/{max})",
    polisUrlRequired: "נדרשת כתובת Polis",
    polisUrlInvalid: "אנא הזינו כתובת Polis תקינה.",
    titleRequired: "נדרשת כותרת כדי להמשיך",
    titleValidationFailed: "אימות הכותרת נכשל",
  },
  ar: {
    bodyExceedsLimit: "يتجاوز النص الحد الأقصى للطول ({count}/{max})",
    polisUrlRequired: "عنوان URL لـ Polis مطلوب",
    polisUrlInvalid: "الرجاء إدخال عنوان URL صالح لـ Polis.",
    titleRequired: "العنوان مطلوب للمتابعة",
    titleValidationFailed: "فشل التحقق من صحة العنوان",
  },
  ja: {
    bodyExceedsLimit: "本文が最大長を超えています ({count}/{max})",
    polisUrlRequired: "Polis URLが必要です",
    polisUrlInvalid: "有効なPolis URLを入力してください。",
    titleRequired: "続行するにはタイトルが必要です",
    titleValidationFailed: "タイトルの検証に失敗しました",
  },
  "zh-Hans": {
    bodyExceedsLimit: "正文超过最大长度 ({count}/{max})",
    polisUrlRequired: "需要 Polis URL",
    polisUrlInvalid: "请输入有效的 Polis URL。",
    titleRequired: "需要标题才能继续",
    titleValidationFailed: "标题验证失败",
  },
  "zh-Hant": {
    bodyExceedsLimit: "正文超過最大長度 ({count}/{max})",
    polisUrlRequired: "需要 Polis URL",
    polisUrlInvalid: "請輸入有效的 Polis URL。",
    titleRequired: "需要標題才能繼續",
    titleValidationFailed: "標題驗證失敗",
  },
  ky: {
    bodyExceedsLimit: "Текст максималдуу узундуктан ашып кетти ({count}/{max})",
    polisUrlRequired: "Polis URL талап кылынат",
    polisUrlInvalid: "Жарактуу Polis URL киргизиңиз.",
    titleRequired: "Улантуу үчүн аталыш талап кылынат",
    titleValidationFailed: "Аталышты текшерүү ишке ашкан жок",
  },
  ru: {
    bodyExceedsLimit: "Текст превышает максимальную длину ({count}/{max})",
    polisUrlRequired: "Требуется URL Polis",
    polisUrlInvalid: "Пожалуйста, введите корректный URL Polis.",
    titleRequired: "Для продолжения необходим заголовок",
    titleValidationFailed: "Не удалось проверить заголовок",
  },
};
