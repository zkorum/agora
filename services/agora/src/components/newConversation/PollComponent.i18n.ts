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
};
