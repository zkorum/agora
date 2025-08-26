export interface PollComponentTranslations {
  addPoll: string;
  option: string;
  inputOptionText: string;
  addOption: string;
  [key: string]: string;
}

export const pollComponentTranslations: Record<
  string,
  PollComponentTranslations
> = {
  en: {
    addPoll: "Add a poll",
    option: "Option",
    inputOptionText: "Input option text",
    addOption: "Add Option",
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
  "zh-CN": {
    addPoll: "添加投票",
    option: "选项",
    inputOptionText: "输入选项文本",
    addOption: "添加选项",
  },
  "zh-TW": {
    addPoll: "添加投票",
    option: "選項",
    inputOptionText: "輸入選項文本",
    addOption: "添加選項",
  },
  ja: {
    addPoll: "投票を追加",
    option: "オプション",
    inputOptionText: "オプションテキストを入力",
    addOption: "オプションを追加",
  },
};
