import type { SupportedDisplayLanguageCodes } from "src/shared/languages";
import en from "./en";
import es from "./es";
import fr from "./fr";
import zh_CN from "./zh-CN";
import zh_TW from "./zh-TW";
import ja from "./ja";
import type { TranslationSchema } from "./types";

export default {
  en: en,
  es: es,
  fr: fr,
  "zh-CN": zh_CN,
  "zh-TW": zh_TW,
  ja: ja,
} as Record<SupportedDisplayLanguageCodes, TranslationSchema>;
