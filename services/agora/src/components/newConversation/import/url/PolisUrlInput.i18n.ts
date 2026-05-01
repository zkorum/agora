import { type SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface PolisUrlInputTranslations {
  importTitle: string;
  description: string;
  validUrlExamples: string;
  urlPlaceholder: string;
  polisTerms: string;
  termsOfUse: string;
  ccLicense: string;
}

export const polisUrlInputTranslations: Record<
  SupportedDisplayLanguageCodes,
  PolisUrlInputTranslations
> = {
  en: {
    importTitle: "Import Conversation from Polis",
    description: "Paste a Polis URL below to import a conversation.",
    validUrlExamples: "Valid URL examples:",
    urlPlaceholder: "e.g., https://pol.is/xxxxx",
    polisTerms: "Pol.is Terms",
    termsOfUse: "Terms of Use",
    ccLicense: "CC BY 4.0",
  },
  ar: {
    importTitle: "استيراد محادثة من بوليس",
    description: "الصق رابط بوليس أدناه لاستيراد محادثة.",
    validUrlExamples: "أمثلة روابط صالحة:",
    urlPlaceholder: "مثلاً، https://pol.is/xxxxx",
    polisTerms: "شروط بوليس",
    termsOfUse: "شروط الاستخدام",
    ccLicense: "CC BY 4.0",
  },
  es: {
    importTitle: "Importar Conversación desde Polis",
    description:
      "Pega una URL de Polis a continuación para importar una conversación.",
    validUrlExamples: "Ejemplos de URL válidas:",
    urlPlaceholder: "ej., https://pol.is/xxxxx",
    polisTerms: "Términos de uso de Pol.is",
    termsOfUse: "Términos de uso",
    ccLicense: "CC BY 4.0",
  },
  fa: {
    importTitle: "واردات گفتگو از Polis",
    description: "آدرس Polis را در زیر جای‌گذاری کنید تا گفتگو وارد شود.",
    validUrlExamples: "نمونه‌های آدرس معتبر:",
    urlPlaceholder: "مثلاً https://pol.is/xxxxx",
    polisTerms: "شرایط Pol.is",
    termsOfUse: "شرایط استفاده",
    ccLicense: "CC BY 4.0",
  },
  fr: {
    importTitle: "Importer une Conversation depuis Polis",
    description:
      "Collez une URL Polis ci-dessous pour importer une conversation.",
    validUrlExamples: "Exemples d'URL valides :",
    urlPlaceholder: "ex., https://pol.is/xxxxx",
    polisTerms: "Conditions d'utilisation de Pol.is",
    termsOfUse: "Conditions d'utilisation",
    ccLicense: "CC BY 4.0",
  },
  "zh-Hans": {
    importTitle: "从 Polis 导入对话",
    description: "粘贴一个 Polis URL 以导入对话。",
    validUrlExamples: "有效 URL 示例：",
    urlPlaceholder: "例如，https://pol.is/xxxxx",
    polisTerms: "Pol.is 条款",
    termsOfUse: "使用条款",
    ccLicense: "CC BY 4.0",
  },
  "zh-Hant": {
    importTitle: "從 Polis 匯入對話",
    description: "貼上一個 Polis URL 以匯入對話。",
    validUrlExamples: "有效 URL 示例：",
    urlPlaceholder: "例如，https://pol.is/xxxxx",
    polisTerms: "Pol.is 條款",
    termsOfUse: "使用條款",
    ccLicense: "CC BY 4.0",
  },
  he: {
    importTitle: "ייבוא שיחה מ-Polis",
    description: "הדביקו כתובת Polis למטה כדי לייבא שיחה.",
    validUrlExamples: "דוגמאות לכתובות תקינות:",
    urlPlaceholder: "לדוגמה, https://pol.is/xxxxx",
    polisTerms: "תנאי Pol.is",
    termsOfUse: "תנאי שימוש",
    ccLicense: "CC BY 4.0",
  },
  ja: {
    importTitle: "Polis から会話をインポート",
    description:
      "会話をインポートするために Polis の URL を貼り付けてください。",
    validUrlExamples: "有効な URL の例：",
    urlPlaceholder: "例：https://pol.is/xxxxx",
    polisTerms: "Pol.is の利用規約",
    termsOfUse: "利用規約",
    ccLicense: "CC BY 4.0",
  },
  ky: {
    importTitle: "Polis'тен талкуу импорттоо",
    description: "Талкууну импорттоо үчүн төмөнгө Polis URL чаптаңыз.",
    validUrlExamples: "Жарактуу URL мисалдары:",
    urlPlaceholder: "мис., https://pol.is/xxxxx",
    polisTerms: "Pol.is шарттары",
    termsOfUse: "Колдонуу шарттары",
    ccLicense: "CC BY 4.0",
  },
  ru: {
    importTitle: "Импорт обсуждения из Polis",
    description: "Вставьте URL Polis ниже, чтобы импортировать обсуждение.",
    validUrlExamples: "Примеры допустимых URL:",
    urlPlaceholder: "напр., https://pol.is/xxxxx",
    polisTerms: "Условия Pol.is",
    termsOfUse: "Условия использования",
    ccLicense: "CC BY 4.0",
  },
};
