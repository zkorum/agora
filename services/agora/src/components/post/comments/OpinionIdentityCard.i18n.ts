export interface OpinionIdentityCardTranslations {
  seedOpinion: string;
  [key: string]: string; // Required for Record<string, string> constraint
}

export const opinionIdentityCardTranslations: Record<
  string,
  OpinionIdentityCardTranslations
> = {
  en: {
    seedOpinion: "Seed opinion",
  },
  es: {
    seedOpinion: "Opinión semilla",
  },
  fr: {
    seedOpinion: "Opinion germe",
  },
};
