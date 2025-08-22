import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ConsensusTabTranslations {
  commonGroundTitle: string;
  noCommonGroundMessage: string;
}

export const consensusTabTranslations: Record<
  SupportedDisplayLanguageCodes,
  ConsensusTabTranslations
> = {
  en: {
    commonGroundTitle: "Common ground",
    noCommonGroundMessage: "No common ground found yet.",
  },
  es: {
    commonGroundTitle: "Terreno común",
    noCommonGroundMessage: "Aún no se encontró terreno común.",
  },
  fr: {
    commonGroundTitle: "Terrain d'entente",
    noCommonGroundMessage: "Aucun terrain d'entente trouvé pour le moment.",
  },
};
