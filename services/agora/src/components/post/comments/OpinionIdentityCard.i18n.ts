import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface OpinionIdentityCardTranslations {
  seedOpinion: string;
}

export const opinionIdentityCardTranslations: Record<
  SupportedDisplayLanguageCodes,
  OpinionIdentityCardTranslations
> = {
  en: {
    seedOpinion: "Seed statement",
  },
  ar: {
    seedOpinion: "المقترح الأولي",
  },
  es: {
    seedOpinion: "Proposición inicial",
  },
  fa: {
    seedOpinion: "گزاره اولیه",
  },
  fr: {
    seedOpinion: "Proposition initiale",
  },
  "zh-Hans": {
    seedOpinion: "初始意见",
  },
  "zh-Hant": {
    seedOpinion: "初始意見",
  },
  he: {
    seedOpinion: "הצהרה ראשונית",
  },
  ja: {
    seedOpinion: "初期の意見",
  },
  ky: {
    seedOpinion: "Баштапкы пикир",
  },
  ru: {
    seedOpinion: "Начальное высказывание",
  },
};
