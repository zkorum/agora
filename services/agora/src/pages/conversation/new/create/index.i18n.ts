import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface CreateConversationTranslations {
  importButton: string;
  nextButton: string;
  titlePlaceholder: string;
  bodyPlaceholder: string;
}

export const createConversationTranslations: Record<
  SupportedDisplayLanguageCodes,
  CreateConversationTranslations
> = {
  en: {
    importButton: "Import",
    nextButton: "Next",
    titlePlaceholder: "What do you want to ask?",
    bodyPlaceholder:
      "Body text. Provide context or relevant resources. Make sure it's aligned with the main question!",
  },
  ar: {
    importButton: "استيراد",
    nextButton: "التالي",
    titlePlaceholder: "ماذا تريد أن تسأل؟",
    bodyPlaceholder:
      "نص المحتوى. قدم سياقاً أو موارد ذات صلة. تأكد من أنه متماشٍ مع السؤال الرئيسي!",
  },
  es: {
    importButton: "Importar",
    nextButton: "Siguiente",
    titlePlaceholder: "¿Qué quiere preguntar?",
    bodyPlaceholder: "Agregue contexto o enlaces útiles",
  },
  fr: {
    importButton: "Importer",
    nextButton: "Suivant",
    titlePlaceholder: "Que voulez-vous demander ?",
    bodyPlaceholder: "Ajoutez du contexte ou des liens utiles",
  },
  "zh-Hans": {
    importButton: "导入",
    nextButton: "下一步",
    titlePlaceholder: "您想问什么？",
    bodyPlaceholder: "正文内容。提供背景或相关资源。确保与主要问题保持一致！",
  },
  "zh-Hant": {
    importButton: "匯入",
    nextButton: "下一步",
    titlePlaceholder: "您想問什麼？",
    bodyPlaceholder: "正文內容。提供背景或相關資源。確保與主要問題保持一致！",
  },
  ja: {
    importButton: "インポート",
    nextButton: "次へ",
    titlePlaceholder: "何を聞きたいですか？",
    bodyPlaceholder:
      "本文テキスト。背景や関連リソースを提供してください。メインの質問と一致していることを確認してください！",
  },
};
