import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface DivisiveTabTranslations {
  divisiveTitle: string;
  noDivisiveOpinionsMessage: string;
  [key: string]: string; // Required for Record<string, string> constraint
}

export const divisiveTabTranslations: Record<
  SupportedDisplayLanguageCodes,
  DivisiveTabTranslations
> = {
  en: {
    divisiveTitle: "Divisive",
    noDivisiveOpinionsMessage: "No divisive opinions found yet.",
  },
  es: {
    divisiveTitle: "Divisivo",
    noDivisiveOpinionsMessage: "Aún no se encontraron opiniones divisivas.",
  },
  fr: {
    divisiveTitle: "Controversé",
    noDivisiveOpinionsMessage:
      "Aucune opinion controversée trouvée pour le moment.",
  },
};
