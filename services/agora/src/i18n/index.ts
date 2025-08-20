import type { SupportedDisplayLanguageCodes } from "src/shared/languages";
import en from "./en";
import es from "./es";
import fr from "./fr";
import type { TranslationSchema } from "./types";

export default {
  en: en,
  es: es,
  fr: fr,
} as Record<SupportedDisplayLanguageCodes, TranslationSchema>;
