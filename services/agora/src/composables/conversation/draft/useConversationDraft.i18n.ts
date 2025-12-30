/**
 * Internationalization for conversation draft composable
 */

import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface UseConversationDraftTranslations {
  bodyExceedsLimit: string;
  polisUrlRequired: string;
  polisUrlInvalid: string;
  pollMaxOptionsError: string;
  pollMinOptionsError: string;
  titleRequired: string;
}

export const useConversationDraftTranslations: Record<
  SupportedDisplayLanguageCodes,
  UseConversationDraftTranslations
> = {
  en: {
    bodyExceedsLimit: "Body exceeds maximum length ({count}/{max})",
    polisUrlRequired: "Polis URL is required",
    polisUrlInvalid: "Please enter a valid Polis URL.",
    pollMaxOptionsError: "Maximum {max} poll options allowed",
    pollMinOptionsError: "Minimum {min} poll options required",
    titleRequired: "Title is required to continue",
  },
  fr: {
    bodyExceedsLimit: "Le corps dépasse la longueur maximale ({count}/{max})",
    polisUrlRequired: "L'URL Polis est requise",
    polisUrlInvalid: "Veuillez entrer une URL Polis valide.",
    pollMaxOptionsError: "Maximum {max} options de sondage autorisées",
    pollMinOptionsError: "Minimum {min} options de sondage requises",
    titleRequired: "Le titre est requis pour continuer",
  },
  es: {
    bodyExceedsLimit: "El cuerpo excede la longitud máxima ({count}/{max})",
    polisUrlRequired: "Se requiere la URL de Polis",
    polisUrlInvalid: "Por favor ingrese una URL de Polis válida.",
    pollMaxOptionsError: "Máximo {max} opciones de encuesta permitidas",
    pollMinOptionsError: "Mínimo {min} opciones de encuesta requeridas",
    titleRequired: "Se requiere título para continuar",
  },
  ar: {
    bodyExceedsLimit: "يتجاوز النص الحد الأقصى للطول ({count}/{max})",
    polisUrlRequired: "عنوان URL لـ Polis مطلوب",
    polisUrlInvalid: "الرجاء إدخال عنوان URL صالح لـ Polis.",
    pollMaxOptionsError: "الحد الأقصى {max} خيارات استطلاع مسموحة",
    pollMinOptionsError: "الحد الأدنى {min} خيارات استطلاع مطلوبة",
    titleRequired: "العنوان مطلوب للمتابعة",
  },
  ja: {
    bodyExceedsLimit: "本文が最大長を超えています ({count}/{max})",
    polisUrlRequired: "Polis URLが必要です",
    polisUrlInvalid: "有効なPolis URLを入力してください。",
    pollMaxOptionsError: "最大{max}個の投票選択肢が許可されています",
    pollMinOptionsError: "最小{min}個の投票選択肢が必要です",
    titleRequired: "続行するにはタイトルが必要です",
  },
  "zh-Hans": {
    bodyExceedsLimit: "正文超过最大长度 ({count}/{max})",
    polisUrlRequired: "需要 Polis URL",
    polisUrlInvalid: "请输入有效的 Polis URL。",
    pollMaxOptionsError: "最多允许 {max} 个投票选项",
    pollMinOptionsError: "至少需要 {min} 个投票选项",
    titleRequired: "需要标题才能继续",
  },
  "zh-Hant": {
    bodyExceedsLimit: "正文超過最大長度 ({count}/{max})",
    polisUrlRequired: "需要 Polis URL",
    polisUrlInvalid: "請輸入有效的 Polis URL。",
    pollMaxOptionsError: "最多允許 {max} 個投票選項",
    pollMinOptionsError: "至少需要 {min} 個投票選項",
    titleRequired: "需要標題才能繼續",
  },
};
