import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface NewConversationDraftsTranslations {
  // Title validation messages
  titleRequired: string;

  // Body validation messages (with interpolation)
  bodyExceedsLimit: (characterCount: number, maxLength: number) => string;

  // Polis URL validation messages
  polisUrlInvalid: string;
  polisUrlRequired: string;

  // Poll mutation error messages (with interpolation)
  pollMaxOptionsError: (maxOptions: number) => string;
  pollMinOptionsError: (minOptions: number) => string;
}

export const newConversationDraftsTranslations: Record<
  SupportedDisplayLanguageCodes,
  NewConversationDraftsTranslations
> = {
  en: {
    titleRequired: "Title is required to continue",
    bodyExceedsLimit: (characterCount: number, maxLength: number) =>
      `Body content exceeds ${maxLength} character limit (${characterCount}/${maxLength})`,
    polisUrlInvalid: "Please enter a valid Polis URL.",
    polisUrlRequired: "Please enter a Polis URL to import",
    pollMaxOptionsError: (maxOptions: number) =>
      `Maximum ${maxOptions} poll options allowed`,
    pollMinOptionsError: (minOptions: number) =>
      `Minimum ${minOptions} poll options required`,
  },
  ar: {
    titleRequired: "العنوان مطلوب للمتابعة",
    bodyExceedsLimit: (characterCount: number, maxLength: number) =>
      `يتجاوز محتوى النص حد ${maxLength} حرف (${characterCount}/${maxLength})`,
    polisUrlInvalid: "يرجى إدخال رابط Polis صالح.",
    polisUrlRequired: "يرجى إدخال رابط Polis للاستيراد",
    pollMaxOptionsError: (maxOptions: number) =>
      `الحد الأقصى ${maxOptions} خيارات للاستطلاع`,
    pollMinOptionsError: (minOptions: number) =>
      `الحد الأدنى ${minOptions} خيارات مطلوبة`,
  },
  es: {
    titleRequired: "El título es obligatorio para continuar",
    bodyExceedsLimit: (characterCount: number, maxLength: number) =>
      `El contenido del cuerpo excede el límite de ${maxLength} caracteres (${characterCount}/${maxLength})`,
    polisUrlInvalid: "Por favor, ingrese una URL de Polis válida.",
    polisUrlRequired: "Por favor, ingrese una URL de Polis para importar",
    pollMaxOptionsError: (maxOptions: number) =>
      `Máximo ${maxOptions} opciones de encuesta permitidas`,
    pollMinOptionsError: (minOptions: number) =>
      `Mínimo ${minOptions} opciones requeridas`,
  },
  fr: {
    titleRequired: "Le titre est requis pour continuer",
    bodyExceedsLimit: (characterCount: number, maxLength: number) =>
      `Le contenu du corps dépasse la limite de ${maxLength} caractères (${characterCount}/${maxLength})`,
    polisUrlInvalid: "Veuillez entrer une URL Polis valide.",
    polisUrlRequired: "Veuillez entrer une URL Polis à importer",
    pollMaxOptionsError: (maxOptions: number) =>
      `Maximum ${maxOptions} options de sondage autorisées`,
    pollMinOptionsError: (minOptions: number) =>
      `Minimum ${minOptions} options requises`,
  },
  "zh-Hant": {
    titleRequired: "標題為必填項才能繼續",
    bodyExceedsLimit: (characterCount: number, maxLength: number) =>
      `正文內容超過 ${maxLength} 字符限制 (${characterCount}/${maxLength})`,
    polisUrlInvalid: "請輸入有效的 Polis 網址。",
    polisUrlRequired: "請輸入要導入的 Polis 網址",
    pollMaxOptionsError: (maxOptions: number) =>
      `最多允許 ${maxOptions} 個投票選項`,
    pollMinOptionsError: (minOptions: number) =>
      `至少需要 ${minOptions} 個選項`,
  },
  "zh-Hans": {
    titleRequired: "标题为必填项才能继续",
    bodyExceedsLimit: (characterCount: number, maxLength: number) =>
      `正文内容超过 ${maxLength} 字符限制 (${characterCount}/${maxLength})`,
    polisUrlInvalid: "请输入有效的 Polis 网址。",
    polisUrlRequired: "请输入要导入的 Polis 网址",
    pollMaxOptionsError: (maxOptions: number) =>
      `最多允许 ${maxOptions} 个投票选项`,
    pollMinOptionsError: (minOptions: number) =>
      `至少需要 ${minOptions} 个选项`,
  },
  ja: {
    titleRequired: "続行するにはタイトルが必要です",
    bodyExceedsLimit: (characterCount: number, maxLength: number) =>
      `本文が${maxLength}文字の制限を超えています (${characterCount}/${maxLength})`,
    polisUrlInvalid: "有効なPolis URLを入力してください。",
    polisUrlRequired: "インポートするPolis URLを入力してください",
    pollMaxOptionsError: (maxOptions: number) =>
      `投票オプションは最大${maxOptions}つまで`,
    pollMinOptionsError: (minOptions: number) =>
      `最低${minOptions}つのオプションが必要です`,
  },
};
