export interface SpokenLanguageStepTranslations {
  title: string;
  nextButton: string;
  [key: string]: string; // Required for Record<string, string> constraint
}

export const spokenLanguageStepTranslations: Record<
  string,
  SpokenLanguageStepTranslations
> = {
  en: {
    title: "What languages do you speak?",
    nextButton: "Next",
  },
  es: {
    title: "¿Qué idiomas hablas?",
    nextButton: "Siguiente",
  },
  fr: {
    title: "Quelles langues parlez-vous ?",
    nextButton: "Suivant",
  },
};
