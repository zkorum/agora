import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface RarimoVerificationFormTranslations {
  download: string;
  claimAnonymousId: string;
  comeBackAndVerify: string;
  scanQrCode: string;
  failedToGenerateLink: string;
  loadingVerificationLink: string;
  openLinkOnMobile: string;
  copy: string;
  waitingForVerification: string;
  verify: string;
  verificationSuccessful: string;
  accountMerged: string;
  verificationFailed: string;
  passportAlreadyLinked: string;
  unexpectedError: string;
  syncHiccup: string;
  copiedToClipboard: string;
  couldNotCopy: string;
}

export const rarimoVerificationFormTranslations: Record<
  SupportedDisplayLanguageCodes,
  RarimoVerificationFormTranslations
> = {
  en: {
    download: "Download",
    claimAnonymousId: "Claim your anonymous ID",
    comeBackAndVerify: "Come back here and click Verify",
    scanQrCode: "Scan the QR code with Rarimo to verify your identity",
    failedToGenerateLink: "Failed to generate verification link",
    loadingVerificationLink: "Loading verification link",
    openLinkOnMobile: "Or open the below link on your mobile browser:",
    copy: "Copy",
    waitingForVerification: "Waiting for verification...",
    verify: "Verify",
    verificationSuccessful: "Verification successful",
    accountMerged: "Success! Your accounts have been merged",
    verificationFailed: "Verification attempt failed. Please retry.",
    passportAlreadyLinked:
      "This passport is already linked to another Rarimo account. Please try a different one.",
    unexpectedError: "Oops! Unexpected error—try refreshing the page",
    syncHiccup:
      "Oops! Sync hiccup detected. We've refreshed your QR code—try scanning it again!",
    copiedToClipboard: "Copied link to clipboard",
    couldNotCopy: "Could not copy to clipboard",
  },
  ar: {
    download: "تحميل",
    claimAnonymousId: "احصل على هويتك المجهولة",
    comeBackAndVerify: "ارجع هنا وانقر على التحقق",
    scanQrCode: "امسح رمز الاستجابة السريعة باستخدام رقمي للتحقق من هويتك",
    failedToGenerateLink: "فشل في إنشاء رابط التحقق",
    loadingVerificationLink: "تحميل رابط التحقق",
    openLinkOnMobile: "أو افتح الرابط أدناه في متصفح الهاتف المحمول:",
    copy: "نسخ",
    waitingForVerification: "في انتظار التحقق...",
    verify: "تحقق",
    verificationSuccessful: "تم التحقق بنجاح",
    accountMerged: "نجح! تم دمج حساباتك",
    verificationFailed: "فشلت محاولة التحقق. يرجى المحاولة مرة أخرى.",
    passportAlreadyLinked:
      "جواز السفر هذا مرتبط بالفعل بحساب رقمي آخر. يرجى تجربة جواز سفر آخر.",
    unexpectedError: "عفواً! خطأ غير متوقع - حاول تحديث الصفحة",
    syncHiccup:
      "عفواً! تم اكتشاف خلل في المزامنة. لقد حدثنا رمز الاستجابة السريعة - حاول مسحه مرة أخرى!",
    copiedToClipboard: "تم نسخ الرابط إلى الحافظة",
    couldNotCopy: "تعذر النسخ إلى الحافظة",
  },
  es: {
    download: "Descargar",
    claimAnonymousId: "Reclame su ID anónima",
    comeBackAndVerify: "Regrese aquí y haga clic en Verificar",
    scanQrCode: "Escanee el código QR con Rarimo para verificar su identidad",
    failedToGenerateLink: "Error al generar el enlace de verificación",
    loadingVerificationLink: "Cargando enlace de verificación",
    openLinkOnMobile: "O abra el siguiente enlace en su navegador móvil:",
    copy: "Copiar",
    waitingForVerification: "Esperando verificación...",
    verify: "Verificar",
    verificationSuccessful: "Verificación exitosa",
    accountMerged: "¡Éxito! Sus cuentas han sido fusionadas",
    verificationFailed:
      "El intento de verificación falló. Por favor, inténtelo de nuevo.",
    passportAlreadyLinked:
      "Este pasaporte ya está vinculado a otra cuenta de Rarimo. Por favor, intente con uno diferente.",
    unexpectedError: "¡Ups! Error inesperado—intente refrescar la página",
    syncHiccup:
      "¡Ups! Detectamos un problema de sincronización. Hemos actualizado su código QR—¡intente escanearlo de nuevo!",
    copiedToClipboard: "Enlace copiado al portapapeles",
    couldNotCopy: "No se pudo copiar al portapapeles",
  },
  fr: {
    download: "Télécharger",
    claimAnonymousId: "Réclamez votre ID anonyme",
    comeBackAndVerify: "Revenez ici et cliquez sur Vérifier",
    scanQrCode: "Scannez le code QR avec Rarimo pour vérifier votre identité",
    failedToGenerateLink: "Échec de la génération du lien de vérification",
    loadingVerificationLink: "Chargement du lien de vérification",
    openLinkOnMobile:
      "Ou ouvrez le lien ci-dessous dans votre navigateur mobile :",
    copy: "Copier",
    waitingForVerification: "En attente de vérification...",
    verify: "Vérifier",
    verificationSuccessful: "Vérification réussie",
    accountMerged: "Succès ! Vos comptes ont été fusionnés",
    verificationFailed:
      "La tentative de vérification a échoué. Veuillez réessayer.",
    passportAlreadyLinked:
      "Ce passeport est déjà lié à un autre compte Rarimo. Veuillez en essayer un différent.",
    unexpectedError: "Oups ! Erreur inattendue—essayez de rafraîchir la page",
    syncHiccup:
      "Oups ! Problème de synchronisation détecté. Nous avons actualisé votre code QR—essayez de le scanner à nouveau !",
    copiedToClipboard: "Lien copié dans le presse-papiers",
    couldNotCopy: "Impossible de copier dans le presse-papiers",
  },
  "zh-Hans": {
    download: "下载",
    claimAnonymousId: "领取您的匿名 ID",
    comeBackAndVerify: "返回这里并点击验证",
    scanQrCode: "使用 Rarimo 扫描二维码以验证您的身份",
    failedToGenerateLink: "生成验证链接失败",
    loadingVerificationLink: "加载验证链接",
    openLinkOnMobile: "或者在您的移动浏览器中打开以下链接：",
    copy: "复制",
    waitingForVerification: "等待验证...",
    verify: "验证",
    verificationSuccessful: "验证成功",
    accountMerged: "成功！您的账户已合并",
    verificationFailed: "验证尝试失败。请重试。",
    passportAlreadyLinked:
      "此护照已与另一个 Rarimo 账户关联。请尝试使用不同的护照。",
    unexpectedError: "哎呀！意外错误——请刷新页面",
    syncHiccup: "哎呀！同步问题检测到。我们已经刷新了您的二维码——请再次扫描！",
    copiedToClipboard: "已复制链接到剪贴板",
    couldNotCopy: "无法复制到剪贴板",
  },
  "zh-Hant": {
    download: "下載",
    claimAnonymousId: "領取您的匿名 ID",
    comeBackAndVerify: "返回這裡並點擊驗證",
    scanQrCode: "使用 Rarimo 掃描二維碼以驗證您的身份",
    failedToGenerateLink: "生成驗證鏈接失敗",
    loadingVerificationLink: "加載驗證鏈接",
    openLinkOnMobile: "或者在您的移動瀏覽器中打開以下鏈接：",
    copy: "複製",
    waitingForVerification: "等待驗證...",
    verify: "驗證",
    verificationSuccessful: "驗證成功",
    accountMerged: "成功！您的帳戶已合併",
    verificationFailed: "驗證嘗試失敗。請重試。",
    passportAlreadyLinked:
      "此護照已與另一個 Rarimo 賬戶關聯。請嘗試使用不同的護照。",
    unexpectedError: "哎呀！意外錯誤——請刷新頁面",
    syncHiccup: "哎呀！同步問題檢測到。我們已經刷新了您的二維碼——請再次掃描！",
    copiedToClipboard: "已複製連結到剪貼簿",
    couldNotCopy: "無法複製到剪貼簿",
  },
  ja: {
    download: "ダウンロード",
    claimAnonymousId: "匿名 ID を取得",
    comeBackAndVerify: "ここに戻って Verify をクリック",
    scanQrCode: "Rarimo で QR コードをスキャンして身元を確認",
    failedToGenerateLink: "検証リンクの生成に失敗",
    loadingVerificationLink: "検証リンクを読み込んでいます",
    openLinkOnMobile:
      "または、以下のリンクをモバイルブラウザで開いてください：",
    copy: "コピー",
    waitingForVerification: "検証待ち...",
    verify: "検証",
    verificationSuccessful: "検証成功",
    accountMerged: "成功！アカウントが統合されました",
    verificationFailed: "検証試行に失敗しました。再試行してください。",
    passportAlreadyLinked:
      "このパスポートはすでに別の Rarimo アカウントにリンクされています。別のパスポートを試してください。",
    unexpectedError:
      "おっと！予期しないエラーが発生しました—ページを更新してください",
    syncHiccup:
      "おっと！同期の問題が検出されました。QR コードを更新しました—再スキャンしてください！",
    copiedToClipboard: "リンクをクリップボードにコピーしました",
    couldNotCopy: "クリップボードにコピーできませんでした",
  },
};
