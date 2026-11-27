import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface SurveyOptionTextInputTranslations {
  pleaseSpecifyOptional: string;
  textTooLong: string;
}

export const surveyOptionTextInputTranslations: Record<
  SupportedDisplayLanguageCodes,
  SurveyOptionTextInputTranslations
> = {
  en: {
    pleaseSpecifyOptional: "Please specify (optional)",
    textTooLong: "Please shorten your text.",
  },
  de: {
    pleaseSpecifyOptional: "Bitte spezifizieren (optional)",
    textTooLong: "Bitte kürzen Sie Ihren Text.",
  },
  hi: {
    pleaseSpecifyOptional: "कृपया निर्दिष्ट करें (वैकल्पिक)",
    textTooLong: "कृपया अपना पाठ छोटा करें।",
  },
  ar: {
    pleaseSpecifyOptional: "يرجى التوضيح (اختياري)",
    textTooLong: "يرجى تقصير النص.",
  },
  es: {
    pleaseSpecifyOptional: "Especifica (opcional)",
    textTooLong: "Acorta el texto.",
  },
  fa: {
    pleaseSpecifyOptional: "لطفاً توضیح دهید (اختیاری)",
    textTooLong: "لطفاً متن را کوتاه کنید.",
  },
  fr: {
    pleaseSpecifyOptional: "Précisez (facultatif)",
    textTooLong: "Veuillez raccourcir votre texte.",
  },
  he: {
    pleaseSpecifyOptional: "נא לפרט (אופציונלי)",
    textTooLong: "נא לקצר את הטקסט.",
  },
  ja: {
    pleaseSpecifyOptional: "具体的にご記入ください（任意）",
    textTooLong: "入力内容を短くしてください。",
  },
  ky: {
    pleaseSpecifyOptional: "Тактап жазыңыз (милдеттүү эмес)",
    textTooLong: "Текстти кыскартыңыз.",
  },
  ru: {
    pleaseSpecifyOptional: "Уточните (необязательно)",
    textTooLong: "Сократите текст.",
  },
  "zh-Hans": {
    pleaseSpecifyOptional: "请注明（选填）",
    textTooLong: "请缩短文字。",
  },
  "zh-Hant": {
    pleaseSpecifyOptional: "請註明（選填）",
    textTooLong: "請縮短文字。",
  },
};
