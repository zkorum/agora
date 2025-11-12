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
    polisTerms: "Polis Terms of Service",
    termsOfUse: "Terms of Use",
    ccLicense: "Creative Commons Attribution 4.0 License",
  },
  ar: {
    importTitle: "استيراد محادثة من بوليس",
    description: "الصق رابط بوليس أدناه لاستيراد محادثة.",
    validUrlExamples: "أمثلة روابط صالحة:",
    urlPlaceholder: "مثلاً، https://pol.is/xxxxx",
    polisTerms: "شروط خدمة Polis",
    termsOfUse: "شروط الاستخدام",
    ccLicense: "رخصة المشاع الإبداعي 4.0",
  },
  es: {
    importTitle: "Importar Conversación desde Polis",
    description:
      "Pega una URL de Polis a continuación para importar una conversación.",
    validUrlExamples: "Ejemplos de URL válidas:",
    urlPlaceholder: "ej., https://pol.is/xxxxx",
    polisTerms: "Términos de servicio de Polis",
    termsOfUse: "Términos de uso",
    ccLicense: "Licencia Creative Commons Atribución 4.0",
  },
  fr: {
    importTitle: "Importer une Conversation depuis Polis",
    description:
      "Collez une URL Polis ci-dessous pour importer une conversation.",
    validUrlExamples: "Exemples d'URL valides :",
    urlPlaceholder: "ex., https://pol.is/xxxxx",
    polisTerms: "Conditions d'utilisation de Polis",
    termsOfUse: "Conditions d'utilisation",
    ccLicense: "Licence Creative Commons Attribution 4.0",
  },
  "zh-Hans": {
    importTitle: "从 Polis 导入对话",
    description: "粘贴一个 Polis URL 以导入对话。",
    validUrlExamples: "有效 URL 示例：",
    urlPlaceholder: "例如，https://pol.is/xxxxx",
    polisTerms: "Polis 服务条款",
    termsOfUse: "使用条款",
    ccLicense: "知识共享署名 4.0 许可协议",
  },
  "zh-Hant": {
    importTitle: "從 Polis 導入對話",
    description: "粘貼一個 Polis URL 以導入對話。",
    validUrlExamples: "有效 URL 示例：",
    urlPlaceholder: "例如，https://pol.is/xxxxx",
    polisTerms: "Polis 服務條款",
    termsOfUse: "使用條款",
    ccLicense: "創用 CC 姓名標示 4.0 授權條款",
  },
  ja: {
    importTitle: "Polis から会話をインポート",
    description:
      "会話をインポートするために Polis の URL を貼り付けてください。",
    validUrlExamples: "有効な URL の例：",
    urlPlaceholder: "例：https://pol.is/xxxxx",
    polisTerms: "Polis 利用規約",
    termsOfUse: "利用規約",
    ccLicense: "クリエイティブ・コモンズ 表示 4.0 ライセンス",
  },
};
