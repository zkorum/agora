export interface SpokenLanguageStepTranslations {
  title: string;
  nextButton: string;
}

export const spokenLanguageStepTranslations: Record<
  string,
  SpokenLanguageStepTranslations
> = {
  en: {
    title: "What languages do you speak?",
    nextButton: "Next",
  },
  ar: {
    title: "ما هي اللغات التي تتحدثها؟",
    nextButton: "التالي",
  },
  es: {
    title: "¿Qué idiomas hablas?",
    nextButton: "Siguiente",
  },
  fr: {
    title: "Quelles langues parlez-vous ?",
    nextButton: "Suivant",
  },
  "zh-Hans": {
    title: "您会说哪些语言？",
    nextButton: "下一步",
  },
  "zh-Hant": {
    title: "您會說哪些語言？",
    nextButton: "下一步",
  },
  ja: {
    title: "あなたはどの言語を話しますか？",
    nextButton: "次へ",
  },
};
