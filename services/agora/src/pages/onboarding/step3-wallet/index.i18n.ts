import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface WalletOnboardingTranslations {
  pageTitle: string;
  description: string;
  openJomhoor: string;
  scanQrCode: string;
  waitingForVerification: string;
  verificationSuccessful: string;
  accountMerged: string;
  verificationFailed: string;
  walletAlreadyLinked: string;
  unexpectedError: string;
  syncHiccup: string;
  challengeExpired: string;
  retryChallenge: string;
  downloadJomhoor: string;
  connectingWallet: string;
  failedToGenerateChallenge: string;
}

export const walletOnboardingTranslations: Record<
  SupportedDisplayLanguageCodes,
  WalletOnboardingTranslations
> = {
  en: {
    pageTitle: "Connect Jomhoor Wallet",
    description:
      "Verify your identity by connecting your Jomhoor wallet. Your passport data never leaves your device.",
    openJomhoor: "Open Jomhoor App",
    scanQrCode: "Scan the QR code with Jomhoor to verify your identity",
    waitingForVerification: "Waiting for wallet verification...",
    verificationSuccessful: "Wallet verified successfully!",
    accountMerged: "Success! Your accounts have been merged.",
    verificationFailed: "Verification failed. Please retry.",
    walletAlreadyLinked:
      "This wallet is already linked to another account. Please try a different one.",
    unexpectedError: "Oops! Unexpected error — try refreshing the page",
    syncHiccup:
      "Sync hiccup detected. We've refreshed your challenge — try again!",
    challengeExpired: "Challenge expired. Generating a new one...",
    retryChallenge: "Retry",
    downloadJomhoor: "Download the Jomhoor app first",
    connectingWallet: "Connecting wallet...",
    failedToGenerateChallenge: "Failed to generate verification challenge",
  },
  fa: {
    pageTitle: "اتصال کیف پول جمهور",
    description:
      "هویت خود را با اتصال کیف پول جمهور تأیید کنید. اطلاعات پاسپورت شما هرگز از دستگاه شما خارج نمی‌شود.",
    openJomhoor: "باز کردن جمهور",
    scanQrCode: "کد QR را با جمهور اسکن کنید تا هویت خود را تأیید کنید",
    waitingForVerification: "در انتظار تأیید کیف پول...",
    verificationSuccessful: "کیف پول با موفقیت تأیید شد!",
    accountMerged: "موفقیت! حساب‌های شما ادغام شدند.",
    verificationFailed: "تأیید ناموفق بود. لطفاً دوباره تلاش کنید.",
    walletAlreadyLinked:
      "این کیف پول قبلاً به حساب دیگری متصل شده است. لطفاً کیف پول دیگری را امتحان کنید.",
    unexpectedError: "خطای غیرمنتظره — صفحه را بازنشانی کنید",
    syncHiccup: "مشکل همگام‌سازی تشخیص داده شد. دوباره تلاش کنید!",
    challengeExpired: "چالش منقضی شد. در حال ایجاد چالش جدید...",
    retryChallenge: "تلاش مجدد",
    downloadJomhoor: "ابتدا اپ جمهور را دانلود کنید",
    connectingWallet: "در حال اتصال کیف پول...",
    failedToGenerateChallenge: "ایجاد چالش تأیید ناموفق بود",
  },
  ar: {
    pageTitle: "ربط محفظة جمهور",
    description:
      "تحقق من هويتك عن طريق ربط محفظة جمهور. بيانات جواز سفرك لا تغادر جهازك أبداً.",
    openJomhoor: "فتح تطبيق جمهور",
    scanQrCode: "امسح رمز QR باستخدام جمهور للتحقق من هويتك",
    waitingForVerification: "في انتظار التحقق من المحفظة...",
    verificationSuccessful: "تم التحقق من المحفظة بنجاح!",
    accountMerged: "نجح! تم دمج حساباتك.",
    verificationFailed: "فشل التحقق. يرجى المحاولة مرة أخرى.",
    walletAlreadyLinked:
      "هذه المحفظة مرتبطة بالفعل بحساب آخر. يرجى تجربة محفظة أخرى.",
    unexpectedError: "عفواً! خطأ غير متوقع — حاول تحديث الصفحة",
    syncHiccup: "تم اكتشاف خلل في المزامنة. حاول مرة أخرى!",
    challengeExpired: "انتهت صلاحية التحدي. جارٍ إنشاء تحدي جديد...",
    retryChallenge: "إعادة المحاولة",
    downloadJomhoor: "قم بتحميل تطبيق جمهور أولاً",
    connectingWallet: "جارٍ ربط المحفظة...",
    failedToGenerateChallenge: "فشل في إنشاء تحدي التحقق",
  },
  es: {
    pageTitle: "Conectar Billetera Jomhoor",
    description:
      "Verifique su identidad conectando su billetera Jomhoor. Sus datos de pasaporte nunca salen de su dispositivo.",
    openJomhoor: "Abrir Jomhoor",
    scanQrCode: "Escanee el código QR con Jomhoor para verificar su identidad",
    waitingForVerification: "Esperando verificación de billetera...",
    verificationSuccessful: "¡Billetera verificada exitosamente!",
    accountMerged: "¡Éxito! Sus cuentas han sido fusionadas.",
    verificationFailed:
      "La verificación falló. Por favor, inténtelo de nuevo.",
    walletAlreadyLinked:
      "Esta billetera ya está vinculada a otra cuenta. Por favor, intente con una diferente.",
    unexpectedError: "¡Ups! Error inesperado — intente refrescar la página",
    syncHiccup:
      "Problema de sincronización detectado. ¡Intente de nuevo!",
    challengeExpired: "Desafío expirado. Generando uno nuevo...",
    retryChallenge: "Reintentar",
    downloadJomhoor: "Descargue la aplicación Jomhoor primero",
    connectingWallet: "Conectando billetera...",
    failedToGenerateChallenge:
      "Error al generar el desafío de verificación",
  },
  fr: {
    pageTitle: "Connecter le Portefeuille Jomhoor",
    description:
      "Vérifiez votre identité en connectant votre portefeuille Jomhoor. Vos données de passeport ne quittent jamais votre appareil.",
    openJomhoor: "Ouvrir Jomhoor",
    scanQrCode:
      "Scannez le code QR avec Jomhoor pour vérifier votre identité",
    waitingForVerification:
      "En attente de la vérification du portefeuille...",
    verificationSuccessful: "Portefeuille vérifié avec succès !",
    accountMerged: "Succès ! Vos comptes ont été fusionnés.",
    verificationFailed:
      "La vérification a échoué. Veuillez réessayer.",
    walletAlreadyLinked:
      "Ce portefeuille est déjà lié à un autre compte. Veuillez en essayer un différent.",
    unexpectedError:
      "Oups ! Erreur inattendue — essayez de rafraîchir la page",
    syncHiccup:
      "Problème de synchronisation détecté. Réessayez !",
    challengeExpired: "Défi expiré. Génération d'un nouveau...",
    retryChallenge: "Réessayer",
    downloadJomhoor: "Téléchargez d'abord l'application Jomhoor",
    connectingWallet: "Connexion du portefeuille...",
    failedToGenerateChallenge:
      "Échec de la génération du défi de vérification",
  },
  "zh-Hans": {
    pageTitle: "连接 Jomhoor 钱包",
    description:
      "通过连接您的 Jomhoor 钱包验证您的身份。您的护照数据永远不会离开您的设备。",
    openJomhoor: "打开 Jomhoor",
    scanQrCode: "使用 Jomhoor 扫描二维码以验证您的身份",
    waitingForVerification: "等待钱包验证...",
    verificationSuccessful: "钱包验证成功！",
    accountMerged: "成功！您的账户已合并。",
    verificationFailed: "验证失败。请重试。",
    walletAlreadyLinked:
      "此钱包已与另一个账户关联。请尝试不同的钱包。",
    unexpectedError: "哎呀！意外错误 — 请刷新页面",
    syncHiccup: "检测到同步问题。请重试！",
    challengeExpired: "挑战已过期。正在生成新的...",
    retryChallenge: "重试",
    downloadJomhoor: "请先下载 Jomhoor 应用",
    connectingWallet: "正在连接钱包...",
    failedToGenerateChallenge: "生成验证挑战失败",
  },
  "zh-Hant": {
    pageTitle: "連接 Jomhoor 錢包",
    description:
      "通過連接您的 Jomhoor 錢包驗證您的身份。您的護照數據永遠不會離開您的設備。",
    openJomhoor: "打開 Jomhoor",
    scanQrCode: "使用 Jomhoor 掃描二維碼以驗證您的身份",
    waitingForVerification: "等待錢包驗證...",
    verificationSuccessful: "錢包驗證成功！",
    accountMerged: "成功！您的帳戶已合併。",
    verificationFailed: "驗證失敗。請重試。",
    walletAlreadyLinked:
      "此錢包已與另一個帳戶關聯。請嘗試不同的錢包。",
    unexpectedError: "哎呀！意外錯誤 — 請刷新頁面",
    syncHiccup: "檢測到同步問題。請重試！",
    challengeExpired: "挑戰已過期。正在生成新的...",
    retryChallenge: "重試",
    downloadJomhoor: "請先下載 Jomhoor 應用",
    connectingWallet: "正在連接錢包...",
    failedToGenerateChallenge: "生成驗證挑戰失敗",
  },
  ja: {
    pageTitle: "Jomhoor ウォレットを接続",
    description:
      "Jomhoor ウォレットを接続して本人確認を行います。パスポートデータはデバイスから離れません。",
    openJomhoor: "Jomhoor を開く",
    scanQrCode: "Jomhoor で QR コードをスキャンして本人確認",
    waitingForVerification: "ウォレット検証待ち...",
    verificationSuccessful: "ウォレット検証成功！",
    accountMerged: "成功！アカウントが統合されました。",
    verificationFailed: "検証に失敗しました。再試行してください。",
    walletAlreadyLinked:
      "このウォレットはすでに別のアカウントにリンクされています。",
    unexpectedError:
      "予期しないエラーが発生しました — ページを更新してください",
    syncHiccup: "同期の問題が検出されました。再試行してください！",
    challengeExpired: "チャレンジの有効期限が切れました。新しいものを生成中...",
    retryChallenge: "再試行",
    downloadJomhoor: "まず Jomhoor アプリをダウンロードしてください",
    connectingWallet: "ウォレットを接続中...",
    failedToGenerateChallenge: "検証チャレンジの生成に失敗しました",
  },
};
