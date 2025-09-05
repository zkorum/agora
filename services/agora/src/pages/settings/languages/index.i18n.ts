import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface LanguagesSettingsTranslations {
  pageTitle: string;
  displayLanguageLabel: string;
  spokenLanguagesLabel: string;
  displayLanguageTitle: string;
  displayLanguageDescription: string;
  additionalLanguagesTitle: string;
  additionalLanguagesDescription: string;
  englishFallback: string;
  noneSelected: string;
  and: string;
  other: string;
  others: string;
}

export const languagesSettingsTranslations: Record<
  SupportedDisplayLanguageCodes,
  LanguagesSettingsTranslations
> = {
  en: {
    pageTitle: "Language",
    displayLanguageLabel: "Display Language",
    spokenLanguagesLabel: "Spoken Languages",
    displayLanguageTitle: "Display language",
    displayLanguageDescription:
      "Your preferred language for the Agora App headers, buttons and other text",
    additionalLanguagesTitle: "Additional languages",
    additionalLanguagesDescription:
      "For content you would like to see on Agora",
    englishFallback: "English",
    noneSelected: "None selected",
    and: "and",
    other: "other",
    others: "others",
  },
  ar: {
    pageTitle: "اللغة",
    displayLanguageLabel: "لغة العرض",
    spokenLanguagesLabel: "اللغات المنطوقة",
    displayLanguageTitle: "لغة العرض",
    displayLanguageDescription:
      "لغتك المفضلة لرؤوس صفحات تطبيق أجورا والأزرار والنصوص الأخرى",
    additionalLanguagesTitle: "لغات إضافية",
    additionalLanguagesDescription: "للمحتوى الذي ترغب في رؤيته على أجورا",
    englishFallback: "الإنجليزية",
    noneSelected: "لا يوجد اختيار",
    and: "و",
    other: "آخر",
    others: "آخرون",
  },
  es: {
    pageTitle: "Idioma",
    displayLanguageLabel: "Idioma de visualización",
    spokenLanguagesLabel: "Idiomas hablados",
    displayLanguageTitle: "Idioma de visualización",
    displayLanguageDescription:
      "Su idioma preferido para los encabezados, botones y otros textos de la aplicación Agora",
    additionalLanguagesTitle: "Idiomas adicionales",
    additionalLanguagesDescription:
      "Para el contenido que le gustaría ver en Agora",
    englishFallback: "Inglés",
    noneSelected: "Ninguno seleccionado",
    and: "y",
    other: "otro",
    others: "otros",
  },
  fr: {
    pageTitle: "Langue",
    displayLanguageLabel: "Langue d'affichage",
    spokenLanguagesLabel: "Langues parlées",
    displayLanguageTitle: "Langue d'affichage",
    displayLanguageDescription:
      "Votre langue préférée pour les en-têtes, boutons et autres textes de l'application Agora",
    additionalLanguagesTitle: "Langues supplémentaires",
    additionalLanguagesDescription:
      "Pour le contenu que vous aimeriez voir sur Agora",
    englishFallback: "Anglais",
    noneSelected: "Aucun sélectionné",
    and: "et",
    other: "autre",
    others: "autres",
  },
  "zh-Hans": {
    pageTitle: "语言",
    displayLanguageLabel: "显示语言",
    spokenLanguagesLabel: "口语语言",
    displayLanguageTitle: "显示语言",
    displayLanguageDescription:
      "您的 Agora 应用的头部、按钮和其他文本的首选语言",
    additionalLanguagesTitle: "额外语言",
    additionalLanguagesDescription: "您希望在 Agora 上看到的语言",
    englishFallback: "英语",
    noneSelected: "未选择",
    and: "和",
    other: "其他",
    others: "其他",
  },
  "zh-Hant": {
    pageTitle: "語言",
    displayLanguageLabel: "顯示語言",
    spokenLanguagesLabel: "口語語言",
    displayLanguageTitle: "顯示語言",
    displayLanguageDescription:
      "您的 Agora 應用的標題、按鈕和其他文本的首選語言",
    additionalLanguagesTitle: "額外語言",
    additionalLanguagesDescription: "您希望在 Agora 上看到的語言",
    englishFallback: "英語",
    noneSelected: "未選擇",
    and: "和",
    other: "其他",
    others: "其他",
  },
  ja: {
    pageTitle: "言語",
    displayLanguageLabel: "表示言語",
    spokenLanguagesLabel: "話される言語",
    displayLanguageTitle: "表示言語",
    displayLanguageDescription:
      "あなたの Agora アプリのヘッダー、ボタン、その他のテキストのお好みの言語",
    additionalLanguagesTitle: "追加の言語",
    additionalLanguagesDescription: "Agora で見たい言語",
    englishFallback: "英語",
    noneSelected: "未選択",
    and: "と",
    other: "その他",
    others: "その他",
  },
};
