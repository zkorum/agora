import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

import ar from "./ar";
import en from "./en";
import es from "./es";
import fr from "./fr";
import ja from "./ja";
import type { TranslationSchema } from "./types";
import zh_Hans from "./zh-Hans";
import zh_Hant from "./zh-Hant";

const translations: Record<SupportedDisplayLanguageCodes, TranslationSchema> = {
  en: en,
  es: es,
  fr: fr,
  "zh-Hans": zh_Hans,
  "zh-Hant": zh_Hant,
  ja: ja,
  ar: ar,
};

export default translations;
