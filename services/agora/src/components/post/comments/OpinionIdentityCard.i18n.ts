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
    seedOpinion: "المقترح البدائي",
  },
  es: {
    seedOpinion: "Proposición semilla",
  },
  fr: {
    seedOpinion: "Proposition germe",
  },
  "zh-Hans": {
    seedOpinion: "种子观点",
  },
  "zh-Hant": {
    seedOpinion: "種子觀點",
  },
  ja: {
    seedOpinion: "主張の種",
  },
};
