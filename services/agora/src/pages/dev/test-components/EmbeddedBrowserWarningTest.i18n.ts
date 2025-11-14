import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface EmbeddedBrowserWarningTestTranslations {
  embeddedBrowserWarning: string;
  embeddedBrowserWarningDescription: string;
  openWarningButton: string;
}

export const embeddedBrowserWarningTestTranslations: Record<
  SupportedDisplayLanguageCodes,
  EmbeddedBrowserWarningTestTranslations
> = {
  en: {
    embeddedBrowserWarning: "Embedded Browser Warning",
    embeddedBrowserWarningDescription:
      "Test the embedded browser warning dialog that appears when users open the app in an in-app browser (Telegram, WeChat, etc.)",
    openWarningButton: "Open Warning Dialog",
  },
  ar: {
    embeddedBrowserWarning: "تحذير المتصفح المضمن",
    embeddedBrowserWarningDescription:
      "اختبر حوار تحذير المتصفح المضمن الذي يظهر عندما يفتح المستخدمون التطبيق في متصفح مضمن (Telegram، WeChat، إلخ)",
    openWarningButton: "فتح حوار التحذير",
  },
  es: {
    embeddedBrowserWarning: "Advertencia de navegador integrado",
    embeddedBrowserWarningDescription:
      "Prueba el diálogo de advertencia del navegador integrado que aparece cuando los usuarios abren la aplicación en un navegador integrado (Telegram, WeChat, etc.)",
    openWarningButton: "Abrir diálogo de advertencia",
  },
  fr: {
    embeddedBrowserWarning: "Avertissement de navigateur intégré",
    embeddedBrowserWarningDescription:
      "Testez le dialogue d'avertissement du navigateur intégré qui apparaît lorsque les utilisateurs ouvrent l'application dans un navigateur intégré (Telegram, WeChat, etc.)",
    openWarningButton: "Ouvrir le dialogue d'avertissement",
  },
  "zh-Hans": {
    embeddedBrowserWarning: "内嵌浏览器警告",
    embeddedBrowserWarningDescription:
      "测试当用户在应用内浏览器（Telegram、微信等）中打开应用时出现的内嵌浏览器警告对话框",
    openWarningButton: "打开警告对话框",
  },
  "zh-Hant": {
    embeddedBrowserWarning: "內建瀏覽器警告",
    embeddedBrowserWarningDescription:
      "測試當使用者在應用程式內建瀏覽器（Telegram、WeChat 等）中開啟應用程式時出現的內建瀏覽器警告對話框",
    openWarningButton: "開啟警告對話框",
  },
  ja: {
    embeddedBrowserWarning: "埋め込みブラウザ警告",
    embeddedBrowserWarningDescription:
      "ユーザーがアプリ内ブラウザ（Telegram、WeChatなど）でアプリを開いたときに表示される埋め込みブラウザ警告ダイアログをテストします",
    openWarningButton: "警告ダイアログを開く",
  },
};
