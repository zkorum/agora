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
  credentialAlreadyLinked: string;
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
    credentialAlreadyLinked:
      "This passport is already linked to another account",
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
    credentialAlreadyLinked:
      "جواز السفر هذا مرتبط بالفعل بحساب آخر",
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
    credentialAlreadyLinked:
      "Este pasaporte ya está vinculado a otra cuenta",
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
    credentialAlreadyLinked:
      "Ce passeport est déjà associé à un autre compte",
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
    credentialAlreadyLinked: "此护照已关联到另一个账户",
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
    credentialAlreadyLinked: "此護照已關聯到另一個帳戶",
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
    credentialAlreadyLinked:
      "このパスポートはすでに別のアカウントにリンクされています",
    copiedToClipboard: "リンクをクリップボードにコピーしました",
    couldNotCopy: "クリップボードにコピーできませんでした",
  },
  ky: {
    download: "Жүктөп алуу",
    claimAnonymousId: "Анонимдүү ID алыңыз",
    comeBackAndVerify: "Бул жерге кайтып, Текшерүү баскычын басыңыз",
    scanQrCode: "Өзүңүздү тастыктоо үчүн Rarimo менен QR кодду сканерлеңиз",
    failedToGenerateLink: "Текшерүү шилтемесин түзүү ишке ашкан жок",
    loadingVerificationLink: "Текшерүү шилтемеси жүктөлүүдө",
    openLinkOnMobile:
      "Же мобилдик браузериңизде төмөнкү шилтемени ачыңыз:",
    copy: "Көчүрүү",
    waitingForVerification: "Текшерүү күтүлүүдө...",
    verify: "Текшерүү",
    verificationSuccessful: "Текшерүү ийгиликтүү",
    accountMerged: "Ийгилик! Аккаунттарыңыз бириктирилди",
    verificationFailed: "Текшерүү аракети ишке ашкан жок. Кайра аракет кылыңыз.",
    passportAlreadyLinked:
      "Бул паспорт башка Rarimo аккаунтуна мурунтан эле байланган. Башка паспортту колдонуңуз.",
    unexpectedError:
      "Ой! Күтүлбөгөн ката — баракчаны жаңылаңыз",
    credentialAlreadyLinked:
      "Бул паспорт башка аккаунтка мурунтан эле байланган",
    copiedToClipboard: "Шилтеме алмашуу буферине көчүрүлдү",
    couldNotCopy: "Алмашуу буферине көчүрүү мүмкүн болбоду",
  },
  ru: {
    download: "Скачать",
    claimAnonymousId: "Получите анонимный ID",
    comeBackAndVerify: "Вернитесь сюда и нажмите «Подтвердить»",
    scanQrCode: "Отсканируйте QR-код с помощью Rarimo для подтверждения личности",
    failedToGenerateLink: "Не удалось сгенерировать ссылку для проверки",
    loadingVerificationLink: "Загрузка ссылки для проверки",
    openLinkOnMobile:
      "Или откройте ссылку ниже в мобильном браузере:",
    copy: "Копировать",
    waitingForVerification: "Ожидание проверки...",
    verify: "Подтвердить",
    verificationSuccessful: "Проверка успешна",
    accountMerged: "Успешно! Ваши аккаунты объединены",
    verificationFailed: "Попытка проверки не удалась. Попробуйте снова.",
    passportAlreadyLinked:
      "Этот паспорт уже привязан к другому аккаунту Rarimo. Попробуйте другой.",
    unexpectedError:
      "Ой! Непредвиденная ошибка — попробуйте обновить страницу",
    credentialAlreadyLinked:
      "Этот паспорт уже привязан к другому аккаунту",
    copiedToClipboard: "Ссылка скопирована в буфер обмена",
    couldNotCopy: "Не удалось скопировать в буфер обмена",
  },
};
