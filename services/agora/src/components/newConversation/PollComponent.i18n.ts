import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface PollComponentTranslations {
  addPoll: string;
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
    option: "Option",
    inputOptionText: "Input option text",
    addOption: "Add Option",
  },
  ar: {
    addPoll: "إضافة استطلاع",
    option: "خيار",
    inputOptionText: "أدخل نص الخيار",
    addOption: "إضافة خيار",
  },
  es: {
    addPoll: "Agregar una encuesta",
    option: "Opción",
    inputOptionText: "Ingresa el texto de la opción",
    addOption: "Agregar Opción",
  },
  fr: {
    addPoll: "Ajouter un sondage",
    option: "Option",
    inputOptionText: "Saisir le texte de l'option",
    addOption: "Ajouter une Option",
  },
  "zh-Hans": {
    addPoll: "添加投票",
    option: "选项",
    inputOptionText: "输入选项文本",
    addOption: "添加选项",
  },
  "zh-Hant": {
    addPoll: "添加投票",
    option: "選項",
    inputOptionText: "輸入選項文本",
    addOption: "添加選項",
  },
  ja: {
    addPoll: "投票を追加",
    option: "オプション",
    inputOptionText: "オプションのテキストを入力",
    addOption: "オプションを追加",
  },
};
