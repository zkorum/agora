import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface CreateConversationTranslations {
  importButton: string;
  nextButton: string;
  titlePlaceholder: string;
  bodyPlaceholder: string;
  activeImportMessage: string;
  viewImportStatus: string;
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
    activeImportMessage:
      "You have an import in progress. Please wait for it to complete before starting a new one.",
    viewImportStatus: "View Import Status",
  },
  ar: {
    importButton: "استيراد",
    nextButton: "التالي",
    titlePlaceholder: "ماذا تريد أن تسأل؟",
    bodyPlaceholder:
      "نص المحتوى. قدم سياقاً أو موارد ذات صلة. تأكد من أنه متماشٍ مع السؤال الرئيسي!",
    activeImportMessage:
      "لديك عملية استيراد قيد التقدم. يرجى الانتظار حتى تكتمل قبل بدء عملية جديدة.",
    viewImportStatus: "عرض حالة الاستيراد",
  },
  es: {
    importButton: "Importar",
    nextButton: "Siguiente",
    titlePlaceholder: "¿Qué quiere preguntar?",
    bodyPlaceholder: "Agregue contexto o enlaces útiles",
    activeImportMessage:
      "Tiene una importación en progreso. Espere a que se complete antes de iniciar una nueva.",
    viewImportStatus: "Ver Estado de Importación",
  },
  fr: {
    importButton: "Importer",
    nextButton: "Suivant",
    titlePlaceholder: "Que voulez-vous demander ?",
    bodyPlaceholder: "Ajoutez du contexte ou des liens utiles",
    activeImportMessage:
      "Vous avez une importation en cours. Veuillez attendre qu'elle soit terminée avant d'en démarrer une nouvelle.",
    viewImportStatus: "Voir l'État de l'Importation",
  },
  "zh-Hans": {
    importButton: "导入",
    nextButton: "下一步",
    titlePlaceholder: "您想问什么？",
    bodyPlaceholder: "正文内容。提供背景或相关资源。确保与主要问题保持一致！",
    activeImportMessage: "您有一个正在进行的导入。请等待完成后再开始新的导入。",
    viewImportStatus: "查看导入状态",
  },
  "zh-Hant": {
    importButton: "匯入",
    nextButton: "下一步",
    titlePlaceholder: "您想問什麼？",
    bodyPlaceholder: "正文內容。提供背景或相關資源。確保與主要問題保持一致！",
    activeImportMessage: "您有一個正在進行的匯入。請等待完成後再開始新的匯入。",
    viewImportStatus: "查看匯入狀態",
  },
  ja: {
    importButton: "インポート",
    nextButton: "次へ",
    titlePlaceholder: "何を聞きたいですか？",
    bodyPlaceholder:
      "本文テキスト。背景や関連リソースを提供してください。メインの質問と一致していることを確認してください！",
    activeImportMessage:
      "インポートが進行中です。新しいインポートを開始する前に完了するまでお待ちください。",
    viewImportStatus: "インポート状態を表示",
  },
};
