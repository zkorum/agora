import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface PostTypeDialogTranslations {
  newConversation: string;
  newConversationDescription: string;
  newPrioritization: string;
  newPrioritizationDescription: string;
  importFromPolis: string;
  importFromPolisDescription: string;
  importFromCsv: string;
  importFromCsvDescription: string;
}

export const postTypeDialogTranslations: Record<
  SupportedDisplayLanguageCodes,
  PostTypeDialogTranslations
> = {
  en: {
    newConversation: "New Conversation",
    newConversationDescription:
      "Create a new conversation topic for discussion.",
    newPrioritization: "New Prioritization",
    newPrioritizationDescription:
      "Create a conversation where participants rank statements by importance using Best-Worst Scaling.",
    importFromPolis: "Import from Polis URL",
    importFromPolisDescription:
      "Import and continue an existing Polis conversation.",
    importFromCsv: "Import from CSV",
    importFromCsvDescription:
      "Import a Polis conversation from exported CSV files.",
  },
  ar: {
    newConversation: "محادثة جديدة",
    newConversationDescription: "إنشاء موضوع محادثة جديد للنقاش.",
    newPrioritization: "ترتيب أولويات جديد",
    newPrioritizationDescription:
      "إنشاء محادثة يقوم فيها المشاركون بترتيب العبارات حسب الأهمية باستخدام Best-Worst Scaling.",
    importFromPolis: "استيراد من رابط بوليس",
    importFromPolisDescription: "استيراد ومتابعة محادثة بوليس موجودة.",
    importFromCsv: "استيراد من CSV",
    importFromCsvDescription: "استيراد محادثة بوليس من ملفات CSV المصدرة.",
  },
  es: {
    newConversation: "Nueva Conversación",
    newConversationDescription:
      "Crear un nuevo tema de conversación para discusión.",
    newPrioritization: "Nueva Priorización",
    newPrioritizationDescription:
      "Crear una conversación donde los participantes clasifican declaraciones por importancia usando Best-Worst Scaling.",
    importFromPolis: "Importar desde URL de Polis",
    importFromPolisDescription:
      "Importar y continuar una conversación de Polis existente.",
    importFromCsv: "Importar desde CSV",
    importFromCsvDescription:
      "Importar una conversación de Polis desde archivos CSV exportados.",
  },
  fr: {
    newConversation: "Nouvelle Conversation",
    newConversationDescription:
      "Créer un nouveau sujet de conversation pour discussion.",
    newPrioritization: "Nouvelle Hiérarchisation",
    newPrioritizationDescription:
      "Créer une conversation où les participants classent les propositions par importance via le Best-Worst Scaling.",
    importFromPolis: "Importer depuis URL Polis",
    importFromPolisDescription:
      "Importer et continuer une conversation Polis existante.",
    importFromCsv: "Importer depuis CSV",
    importFromCsvDescription:
      "Importer une conversation Polis depuis des fichiers CSV exportés.",
  },
  "zh-Hans": {
    newConversation: "新对话",
    newConversationDescription: "创建一个新的话题进行讨论。",
    newPrioritization: "新建优先排序",
    newPrioritizationDescription:
      "创建一个参与者通过 Best-Worst Scaling 按重要性排列陈述的对话。",
    importFromPolis: "从 Polis URL 导入",
    importFromPolisDescription: "导入并继续一个现有的 Polis 对话。",
    importFromCsv: "从 CSV 导入",
    importFromCsvDescription: "从导出的 CSV 文件导入 Polis 对话。",
  },
  "zh-Hant": {
    newConversation: "新對話",
    newConversationDescription: "創建一個新的話題進行討論。",
    newPrioritization: "新建優先排序",
    newPrioritizationDescription:
      "創建一個參與者通過 Best-Worst Scaling 按重要性排列陳述的對話。",
    importFromPolis: "從 Polis URL 導入",
    importFromPolisDescription: "導入並繼續一個現有的 Polis 對話。",
    importFromCsv: "從 CSV 導入",
    importFromCsvDescription: "從導出的 CSV 檔案導入 Polis 對話。",
  },
  ja: {
    newConversation: "新しい会話",
    newConversationDescription: "新しいトピックを作成して議論します。",
    newPrioritization: "新しい優先順位付け",
    newPrioritizationDescription:
      "参加者が Best-Worst Scaling を使ってステートメントを重要度順に並べる会話を作成します。",
    importFromPolis: "Polis URL からインポート",
    importFromPolisDescription: "既存の Polis 会話をインポートして続けます。",
    importFromCsv: "CSV からインポート",
    importFromCsvDescription:
      "エクスポートされた CSV ファイルから Polis 会話をインポートします。",
  },
  ky: {
    newConversation: "Жаңы талкуу",
    newConversationDescription: "Талкуулоо үчүн жаңы тема түзүңүз.",
    newPrioritization: "Жаңы артыкчылыктуу кылуу",
    newPrioritizationDescription:
      "Катышуучулар Best-Worst Scaling аркылуу билдирүүлөрдү маанилүүлүгү боюнча рейтингдеген талкуу түзүңүз.",
    importFromPolis: "Polis URL'ден импорттоо",
    importFromPolisDescription: "Учурдагы Polis талкууну импорттоп улантыңыз.",
    importFromCsv: "CSV'ден импорттоо",
    importFromCsvDescription:
      "Экспорттолгон CSV файлдарынан Polis талкууну импорттоо.",
  },
  ru: {
    newConversation: "Новое обсуждение",
    newConversationDescription: "Создайте новую тему для обсуждения.",
    newPrioritization: "Новая приоритизация",
    newPrioritizationDescription:
      "Создайте обсуждение, где участники ранжируют утверждения по важности с помощью Best-Worst Scaling.",
    importFromPolis: "Импорт из URL Polis",
    importFromPolisDescription: "Импортируйте и продолжите существующее обсуждение Polis.",
    importFromCsv: "Импорт из CSV",
    importFromCsvDescription:
      "Импортируйте обсуждение Polis из экспортированных CSV-файлов.",
  },
};
