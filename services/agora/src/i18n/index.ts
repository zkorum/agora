import type { SupportedDisplayLanguageCodes } from "src/shared/languages";
import en from "./en";
import es from "./es";
import fr from "./fr";
import type { TranslationSchema } from "./types";

const messages: Record<SupportedDisplayLanguageCodes, TranslationSchema> = {
  en: en,
  es: es,
  fr: fr,
};

export default messages;
