import type { SupportedDisplayLanguageCodes } from "src/shared/languages";
import en from "./en";
import es from "./es";
import fr from "./fr";
import zh_Hans from "./zh-Hans";
import zh_Hant from "./zh-Hant";
import ja from "./ja";
import type { TranslationSchema } from "./types";

export default {
  en: en,
  es: es,
  fr: fr,
  "zh-Hans": zh_Hans,
  "zh-Hant": zh_Hant,
  ja: ja,
} as Record<SupportedDisplayLanguageCodes, TranslationSchema>;
