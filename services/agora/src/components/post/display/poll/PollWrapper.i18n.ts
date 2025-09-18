import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface PollWrapperTranslations {
  results: string;
  vote: string;
  votes: string;
}

export const pollWrapperTranslations: Record<SupportedDisplayLanguageCodes, PollWrapperTranslations> =
  {
    en: {
      results: "Results",
      vote: "Vote",
      votes: "votes",
    },
    ar: {
      results: "النتائج",
      vote: "تصويت",
      votes: "أصوات",
    },
    es: {
      results: "Resultados",
      vote: "Votar",
      votes: "votos",
    },
    fr: {
      results: "Résultats",
      vote: "Vote",
      votes: "votes",
    },
    "zh-Hans": {
      results: "结果",
      vote: "投票",
      votes: "票",
    },
    "zh-Hant": {
      results: "結果",
      vote: "投票",
      votes: "票",
    },
    ja: {
      results: "結果",
      vote: "投票",
      votes: "票",
    },
  };
