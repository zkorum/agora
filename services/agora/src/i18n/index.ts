import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

import ar from "./ar";
import en from "./en";
import es from "./es";
import fa from "./fa";
import fr from "./fr";
import he from "./he";
import ja from "./ja";
import ky from "./ky";
import ru from "./ru";
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
  fa: fa,
  he: he,
  ky: ky,
  ru: ru,
};

export default translations;
