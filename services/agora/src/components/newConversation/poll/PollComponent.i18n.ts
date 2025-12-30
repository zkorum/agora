import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface PollComponentTranslations {
  addPoll: string;
  existingPoll: string;
  readonlyExplanation: string;
  option: string;
  inputOptionText: string;
  addOption: string;
}

export const pollComponentTranslations: Record<
  SupportedDisplayLanguageCodes,
  PollComponentTranslations
> = {
  en: {
    addPoll: "Add a poll",
    existingPoll: "Existing Poll",
    readonlyExplanation:
      "Poll options cannot be edited once votes are cast. To create a new poll, remove this one first.",
    option: "Option",
    inputOptionText: "Input option text",
    addOption: "Add Option",
  },
  ar: {
    addPoll: "إضافة استطلاع",
    existingPoll: "استطلاع موجود",
    readonlyExplanation:
      "لا يمكن تعديل خيارات الاستطلاع بمجرد الإدلاء بالأصوات. لإنشاء استطلاع جديد، قم بإزالة هذا أولاً.",
    option: "خيار",
    inputOptionText: "أدخل نص الخيار",
    addOption: "إضافة خيار",
  },
  es: {
    addPoll: "Agregar una encuesta",
    existingPoll: "Encuesta existente",
    readonlyExplanation:
      "Las opciones de la encuesta no se pueden editar una vez que se emitan votos. Para crear una nueva encuesta, elimina esta primero.",
    option: "Opción",
    inputOptionText: "Ingresa el texto de la opción",
    addOption: "Agregar Opción",
  },
  fr: {
    addPoll: "Ajouter un sondage",
    existingPoll: "Sondage existant",
    readonlyExplanation:
      "Les options du sondage ne peuvent pas être modifiées une fois les votes exprimés. Pour créer un nouveau sondage, supprimez d'abord celui-ci.",
    option: "Option",
    inputOptionText: "Saisir le texte de l'option",
    addOption: "Ajouter une Option",
  },
  "zh-Hans": {
    addPoll: "添加投票",
    existingPoll: "现有投票",
    readonlyExplanation:
      "一旦投票被提交，投票选项就无法编辑。要创建新投票，请先删除此投票。",
    option: "选项",
    inputOptionText: "输入选项文本",
    addOption: "添加选项",
  },
  "zh-Hant": {
    addPoll: "添加投票",
    existingPoll: "現有投票",
    readonlyExplanation:
      "一旦投票被提交，投票選項就無法編輯。要創建新投票，請先刪除此投票。",
    option: "選項",
    inputOptionText: "輸入選項文本",
    addOption: "添加選項",
  },
  ja: {
    addPoll: "投票を追加",
    existingPoll: "既存の投票",
    readonlyExplanation:
      "投票が送信されると、投票オプションは編集できません。新しい投票を作成するには、まずこの投票を削除してください。",
    option: "オプション",
    inputOptionText: "オプションのテキストを入力",
    addOption: "オプションを追加",
  },
};
