import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface MajorityTabTranslations {
  majorityTitle: string;
  noMajorityOpinionsMessage: string;
}

export const majorityTabTranslations: Record<
  SupportedDisplayLanguageCodes,
  MajorityTabTranslations
> = {
  en: {
    majorityTitle: "Majority",
    noMajorityOpinionsMessage: "No majority opinions found yet.",
  },
  es: {
    majorityTitle: "Mayoría",
    noMajorityOpinionsMessage: "Aún no se encontraron opiniones mayoritarias.",
  },
  fr: {
    majorityTitle: "Majorité",
    noMajorityOpinionsMessage:
      "Aucune opinion majoritaire trouvée pour le moment.",
  },
};
