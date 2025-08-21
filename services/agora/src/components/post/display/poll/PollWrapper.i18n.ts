export interface PollWrapperTranslations {
  results: string;
  vote: string;
  votes: string;
  [key: string]: string; // Required for Record<string, string> constraint
}

export const pollWrapperTranslations: Record<string, PollWrapperTranslations> =
  {
    en: {
      results: "Results",
      vote: "Vote",
      votes: "votes",
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
  };
