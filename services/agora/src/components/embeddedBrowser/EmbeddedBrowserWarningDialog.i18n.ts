import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface EmbeddedBrowserWarningTranslations {
  title: string;
  titleGeneric: string;
  message: string;
  showManualInstructions: string;
  instructionStep1: string;
  instructionStep1iOS: string;
  instructionStep2: string;
  instructionStep3: string;
  retryRedirect: string;
  retryingRedirect: string;
  redirectFailed: string;
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
    title: "You're in {app} browser",
    titleGeneric: "You're in an in-app browser",
    message: "Please open in your default browser for the best experience.",
    showManualInstructions: "Or try manually",
    instructionStep1: "Tap the menu icon (⋯ or ⋮)",
    instructionStep1iOS:
      "Tap the compass icon at the bottom-right corner to open in your default browser",
    instructionStep2: 'Select "Open in Browser" or similar option',
    instructionStep3: "Or copy the URL below and paste it in your browser app",
    retryRedirect: "Open in Default Browser",
    retryingRedirect: "Opening in default browser...",
    redirectFailed: "Redirect failed. Please try manually.",
    copyUrl: "Copy URL",
    urlCopied: "URL Copied",
    urlCopiedNotification: "URL copied to clipboard",
    copyFailedNotification: "Failed to copy URL",
    continueAnyway: "Continue Anyway",
    notInAppBrowser: "I'm already in my browser (Chrome, Safari, etc.)",
  },
  ar: {
    title: "أنت في متصفح {app}",
    titleGeneric: "أنت في متصفح مدمج",
    message:
      "يرجى فتح هذه الصفحة في متصفح جهازك الافتراضي للحصول على أفضل تجربة.",
    showManualInstructions: "أو حاول يدويًا",
    instructionStep1: "اضغط على أيقونة القائمة (⋯ أو ⋮)",
    instructionStep1iOS:
      "اضغط على أيقونة البوصلة في الزاوية السفلية اليمنى للفتح في متصفحك الافتراضي",
    instructionStep2: 'حدد "فتح في المتصفح" أو خيار مماثل',
    instructionStep3: "أو انسخ عنوان URL والصقه في تطبيق المتصفح الخاص بك",
    retryRedirect: "فتح في المتصفح الافتراضي",
    retryingRedirect: "جاري الفتح في المتصفح الافتراضي...",
    redirectFailed: "فشلت إعادة التوجيه. يرجى المحاولة يدويًا.",
    copyUrl: "نسخ الرابط",
    urlCopied: "تم النسخ",
    urlCopiedNotification: "تم نسخ الرابط إلى الحافظة",
    copyFailedNotification: "فشل نسخ الرابط",
    continueAnyway: "المتابعة على أي حال",
    notInAppBrowser: "أنا بالفعل في متصفحي (Chrome، Safari، إلخ)",
  },
  es: {
    title: "Estás en el navegador de {app}",
    titleGeneric: "Estás en un navegador integrado",
    message:
      "Por favor, abre esta página en tu navegador predeterminado para la mejor experiencia.",
    showManualInstructions: "O inténtalo manualmente",
    instructionStep1: "Toca el icono de menú (⋯ o ⋮)",
    instructionStep1iOS:
      "Toca el icono de la brújula en la esquina inferior derecha para abrir en tu navegador predeterminado",
    instructionStep2: 'Selecciona "Abrir en navegador" u opción similar',
    instructionStep3: "O copia la URL y pégala en tu aplicación de navegador",
    retryRedirect: "Abrir en navegador predeterminado",
    retryingRedirect: "Abriendo en navegador predeterminado...",
    redirectFailed: "Redirección fallida. Por favor, inténtalo manualmente.",
    copyUrl: "Copiar URL",
    urlCopied: "URL Copiada",
    urlCopiedNotification: "URL copiada al portapapeles",
    copyFailedNotification: "Error al copiar URL",
    continueAnyway: "Continuar de todos modos",
    notInAppBrowser: "Ya estoy en mi navegador (Chrome, Safari, etc.)",
  },
  fr: {
    title: "Vous êtes dans le navigateur {app}",
    titleGeneric: "Vous êtes dans un navigateur intégré",
    message:
      "Veuillez ouvrir cette page dans votre navigateur par défaut pour une meilleure expérience.",
    showManualInstructions: "Ou essayez manuellement",
    instructionStep1: "Appuyez sur l'icône de menu (⋯ ou ⋮)",
    instructionStep1iOS:
      "Appuyez sur l'icône de la boussole en bas à droite pour ouvrir dans votre navigateur par défaut",
    instructionStep2:
      'Sélectionnez "Ouvrir dans le navigateur" ou option similaire',
    instructionStep3:
      "Ou copiez l'URL et collez-la dans votre application de navigateur",
    retryRedirect: "Ouvrir dans le navigateur par défaut",
    retryingRedirect: "Ouverture dans le navigateur par défaut...",
    redirectFailed: "Échec de la redirection. Veuillez essayer manuellement.",
    copyUrl: "Copier l'URL",
    urlCopied: "URL Copiée",
    urlCopiedNotification: "URL copiée dans le presse-papiers",
    copyFailedNotification: "Échec de la copie de l'URL",
    continueAnyway: "Continuer quand même",
    notInAppBrowser: "Je suis déjà dans mon navigateur (Chrome, Safari, etc.)",
  },
  "zh-Hans": {
    title: "您在 {app} 浏览器中",
    titleGeneric: "您在应用内浏览器中",
    message: "请在您设备的默认浏览器中打开此页面以获得最佳体验。",
    showManualInstructions: "或手动尝试",
    instructionStep1: "点击菜单图标 (⋯ 或 ⋮)",
    instructionStep1iOS: "点击右下角的指南针图标以在默认浏览器中打开",
    instructionStep2: '选择"在浏览器中打开"或类似选项',
    instructionStep3: "或复制 URL 并粘贴到您的浏览器应用中",
    retryRedirect: "在默认浏览器中打开",
    retryingRedirect: "正在默认浏览器中打开...",
    redirectFailed: "重定向失败。请手动尝试。",
    copyUrl: "复制链接",
    urlCopied: "已复制",
    urlCopiedNotification: "URL 已复制到剪贴板",
    copyFailedNotification: "复制 URL 失败",
    continueAnyway: "仍然继续",
    notInAppBrowser: "我已经在我的浏览器中 (Chrome, Safari 等)",
  },
  "zh-Hant": {
    title: "您在 {app} 瀏覽器中",
    titleGeneric: "您在應用程式內建瀏覽器中",
    message: "請在您裝置的預設瀏覽器中開啟此頁面以獲得最佳體驗。",
    showManualInstructions: "或手動嘗試",
    instructionStep1: "點擊選單圖示 (⋯ 或 ⋮)",
    instructionStep1iOS: "點擊右下角的指南針圖示以在預設瀏覽器中開啟",
    instructionStep2: "選擇「在瀏覽器中開啟」或類似選項",
    instructionStep3: "或複製 URL 並貼到您的瀏覽器應用程式中",
    retryRedirect: "在預設瀏覽器中開啟",
    retryingRedirect: "正在預設瀏覽器中開啟...",
    redirectFailed: "重新導向失敗。請手動嘗試。",
    copyUrl: "複製連結",
    urlCopied: "已複製",
    urlCopiedNotification: "URL 已複製到剪貼簿",
    copyFailedNotification: "複製 URL 失敗",
    continueAnyway: "仍然繼續",
    notInAppBrowser: "我已經在我的瀏覽器中 (Chrome, Safari 等)",
  },
  ja: {
    title: "{app} ブラウザ内です",
    titleGeneric: "アプリ内ブラウザ内です",
    message:
      "最適な体験のため、デバイスのデフォルトブラウザでこのページを開いてください。",
    showManualInstructions: "または手動で試す",
    instructionStep1: "メニューアイコン (⋯ または ⋮) をタップ",
    instructionStep1iOS:
      "右下のコンパスアイコンをタップしてデフォルトブラウザで開く",
    instructionStep2: "「ブラウザで開く」または類似のオプションを選択",
    instructionStep3:
      "または URL をコピーしてブラウザアプリに貼り付けてください",
    retryRedirect: "デフォルトブラウザで開く",
    retryingRedirect: "デフォルトブラウザで開いています...",
    redirectFailed: "リダイレクトに失敗しました。手動で試してください。",
    copyUrl: "URL をコピー",
    urlCopied: "コピー完了",
    urlCopiedNotification: "URL をクリップボードにコピーしました",
    copyFailedNotification: "URL のコピーに失敗しました",
    continueAnyway: "このまま続ける",
    notInAppBrowser: "すでにブラウザを使用しています (Chrome, Safari など)",
  },
};
