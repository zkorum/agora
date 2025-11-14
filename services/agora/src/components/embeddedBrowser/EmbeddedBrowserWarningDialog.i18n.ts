import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface EmbeddedBrowserWarningTranslations {
  title: string;
  message: string;
  messageGeneric: string;
  instructionsTitle: string;
  instructionStep1: string;
  instructionStep2: string;
  instructionStep3: string;
  copyUrl: string;
  urlCopied: string;
  urlCopiedNotification: string;
  copyFailedNotification: string;
  continueAnyway: string;
  notInAppBrowser: string;
}

export const embeddedBrowserWarningTranslations: Record<
  SupportedDisplayLanguageCodes,
  EmbeddedBrowserWarningTranslations
> = {
  en: {
    title: "You're Using an In-App Browser",
    message:
      "{app}'s in-app browser has limitations. Please open this page in your device's default browser for the best experience.",
    messageGeneric:
      "You're currently using an in-app browser. For the best experience, please open this page in your device's default browser instead.",
    instructionsTitle: "How to open in your default browser:",
    instructionStep1: "Tap the menu icon (⋯ or ⋮)",
    instructionStep2: 'Select "Open in Browser" or similar option',
    instructionStep3: "Or copy the URL below and paste it in your browser app",
    copyUrl: "Copy URL",
    urlCopied: "URL Copied",
    urlCopiedNotification: "URL copied to clipboard",
    copyFailedNotification: "Failed to copy URL",
    continueAnyway: "Continue Anyway",
    notInAppBrowser: "I'm already in my browser (Chrome, Safari, etc.)",
  },
  ar: {
    title: "أنت تستخدم متصفح مدمج في التطبيق",
    message:
      "متصفح {app} المدمج له قيود. يرجى فتح هذه الصفحة في متصفح جهازك الافتراضي للحصول على أفضل تجربة.",
    messageGeneric:
      "أنت تستخدم حاليًا متصفحًا مدمجًا في التطبيق. للحصول على أفضل تجربة، يرجى فتح هذه الصفحة في متصفح جهازك الافتراضي بدلاً من ذلك.",
    instructionsTitle: "كيفية الفتح في متصفحك الافتراضي:",
    instructionStep1: "اضغط على أيقونة القائمة (⋯ أو ⋮)",
    instructionStep2: 'حدد "فتح في المتصفح" أو خيار مماثل',
    instructionStep3: "أو انسخ عنوان URL والصقه في تطبيق المتصفح الخاص بك",
    copyUrl: "نسخ الرابط",
    urlCopied: "تم النسخ",
    urlCopiedNotification: "تم نسخ الرابط إلى الحافظة",
    copyFailedNotification: "فشل نسخ الرابط",
    continueAnyway: "المتابعة على أي حال",
    notInAppBrowser: "أنا بالفعل في متصفحي (Chrome، Safari، إلخ)",
  },
  es: {
    title: "Estás usando un navegador integrado",
    message:
      "El navegador integrado de {app} tiene limitaciones. Por favor, abre esta página en el navegador predeterminado de tu dispositivo para la mejor experiencia.",
    messageGeneric:
      "Actualmente estás usando un navegador integrado. Para la mejor experiencia, abre esta página en el navegador predeterminado de tu dispositivo.",
    instructionsTitle: "Cómo abrir en tu navegador predeterminado:",
    instructionStep1: "Toca el icono de menú (⋯ o ⋮)",
    instructionStep2: 'Selecciona "Abrir en navegador" u opción similar',
    instructionStep3: "O copia la URL y pégala en tu aplicación de navegador",
    copyUrl: "Copiar URL",
    urlCopied: "URL Copiada",
    urlCopiedNotification: "URL copiada al portapapeles",
    copyFailedNotification: "Error al copiar URL",
    continueAnyway: "Continuar de todos modos",
    notInAppBrowser: "Ya estoy en mi navegador (Chrome, Safari, etc.)",
  },
  fr: {
    title: "Vous utilisez un navigateur intégré",
    message:
      "Le navigateur intégré de {app} a des limitations. Veuillez ouvrir cette page dans le navigateur par défaut de votre appareil pour une meilleure expérience.",
    messageGeneric:
      "Vous utilisez actuellement un navigateur intégré. Pour une meilleure expérience, veuillez ouvrir cette page dans le navigateur par défaut de votre appareil.",
    instructionsTitle: "Comment ouvrir dans votre navigateur par défaut:",
    instructionStep1: "Appuyez sur l'icône de menu (⋯ ou ⋮)",
    instructionStep2:
      'Sélectionnez "Ouvrir dans le navigateur" ou option similaire',
    instructionStep3:
      "Ou copiez l'URL et collez-la dans votre application de navigateur",
    copyUrl: "Copier l'URL",
    urlCopied: "URL Copiée",
    urlCopiedNotification: "URL copiée dans le presse-papiers",
    copyFailedNotification: "Échec de la copie de l'URL",
    continueAnyway: "Continuer quand même",
    notInAppBrowser: "Je suis déjà dans mon navigateur (Chrome, Safari, etc.)",
  },
  "zh-Hans": {
    title: "您正在使用应用内浏览器",
    message:
      "{app} 的应用内浏览器有限制。请在您设备的默认浏览器中打开此页面以获得最佳体验。",
    messageGeneric:
      "您当前正在使用应用内浏览器。为获得最佳体验，请在您设备的默认浏览器中打开此页面。",
    instructionsTitle: "如何在您的默认浏览器中打开：",
    instructionStep1: "点击菜单图标 (⋯ 或 ⋮)",
    instructionStep2: '选择"在浏览器中打开"或类似选项',
    instructionStep3: "或复制 URL 并粘贴到您的浏览器应用中",
    copyUrl: "复制链接",
    urlCopied: "已复制",
    urlCopiedNotification: "URL 已复制到剪贴板",
    copyFailedNotification: "复制 URL 失败",
    continueAnyway: "仍然继续",
    notInAppBrowser: "我已经在我的浏览器中 (Chrome, Safari 等)",
  },
  "zh-Hant": {
    title: "您正在使用應用程式內建瀏覽器",
    message:
      "{app} 的應用程式內建瀏覽器有限制。請在您裝置的預設瀏覽器中開啟此頁面以獲得最佳體驗。",
    messageGeneric:
      "您目前正在使用應用程式內建瀏覽器。為獲得最佳體驗，請在您裝置的預設瀏覽器中開啟此頁面。",
    instructionsTitle: "如何在您的預設瀏覽器中開啟：",
    instructionStep1: "點擊選單圖示 (⋯ 或 ⋮)",
    instructionStep2: "選擇「在瀏覽器中開啟」或類似選項",
    instructionStep3: "或複製 URL 並貼到您的瀏覽器應用程式中",
    copyUrl: "複製連結",
    urlCopied: "已複製",
    urlCopiedNotification: "URL 已複製到剪貼簿",
    copyFailedNotification: "複製 URL 失敗",
    continueAnyway: "仍然繼續",
    notInAppBrowser: "我已經在我的瀏覽器中 (Chrome, Safari 等)",
  },
  ja: {
    title: "アプリ内ブラウザを使用しています",
    message:
      "{app} のアプリ内ブラウザには制限があります。最適な体験のため、デバイスのデフォルトブラウザでこのページを開いてください。",
    messageGeneric:
      "現在、アプリ内ブラウザを使用しています。最適な体験のため、デバイスのデフォルトブラウザでこのページを開いてください。",
    instructionsTitle: "デフォルトブラウザで開く方法：",
    instructionStep1: "メニューアイコン (⋯ または ⋮) をタップ",
    instructionStep2: "「ブラウザで開く」または類似のオプションを選択",
    instructionStep3:
      "または URL をコピーしてブラウザアプリに貼り付けてください",
    copyUrl: "URL をコピー",
    urlCopied: "コピー完了",
    urlCopiedNotification: "URL をクリップボードにコピーしました",
    copyFailedNotification: "URL のコピーに失敗しました",
    continueAnyway: "このまま続ける",
    notInAppBrowser: "すでにブラウザを使用しています (Chrome, Safari など)",
  },
};
