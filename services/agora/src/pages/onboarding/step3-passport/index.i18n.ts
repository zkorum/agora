import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface PassportOnboardingTranslations {
  pageTitle: string;
  description: string;
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
  preferPhoneVerification: string;
  verificationSuccessful: string;
  verificationFailed: string;
  passportAlreadyLinked: string;
  unexpectedError: string;
  syncHiccup: string;
}

export const passportOnboardingTranslations: Record<
  SupportedDisplayLanguageCodes,
  PassportOnboardingTranslations
> = {
  en: {
    pageTitle: "Own Your Privacy",
    description:
      "RariMe is a ZK-powered identity wallet that converts your passport into an anonymous digital ID, stored on your device, so you can prove that you're a unique human without sharing any personal data with anyone.",
    download: "Download",
    claimAnonymousId: "Claim your anonymous ID",
    comeBackAndVerify: "Come back here and click Verify",
    scanQrCode: "Scan the QR code with RariMe to verify your identity",
    failedToGenerateLink: "Failed to generate verification link",
    loadingVerificationLink: "Loading verification link",
    openLinkOnMobile: "Or open the below link on your mobile browser:",
    copy: "Copy",
    waitingForVerification: "Waiting for verification...",
    verify: "Verify",
    preferPhoneVerification: "I'd rather verify with my phone number",
    verificationSuccessful: "Verification successful 🎉",
    verificationFailed: "Verification attempt failed. Please retry.",
    passportAlreadyLinked:
      "This passport is already linked to another RariMe account. Please try a different one.",
    unexpectedError: "Oops! Unexpected error—try refreshing the page",
    syncHiccup:
      "Oops! Sync hiccup detected. We've refreshed your QR code—try scanning it again!",
  },
  ar: {
    pageTitle: "ترجمة: Own Your Privacy",
    description:
      "ترجمة: RariMe is a ZK-powered identity wallet that converts your passport into an anonymous digital ID, stored on your device, so you can prove that you're a unique human without sharing any personal data with anyone.",
    download: "ترجمة: Download",
    claimAnonymousId: "ترجمة: Claim your anonymous ID",
    comeBackAndVerify: "ترجمة: Come back here and click Verify",
    scanQrCode: "ترجمة: Scan the QR code with RariMe to verify your identity",
    failedToGenerateLink: "ترجمة: Failed to generate verification link",
    loadingVerificationLink: "ترجمة: Loading verification link",
    openLinkOnMobile: "ترجمة: Or open the below link on your mobile browser:",
    copy: "ترجمة: Copy",
    waitingForVerification: "ترجمة: Waiting for verification...",
    verify: "ترجمة: Verify",
    preferPhoneVerification: "ترجمة: I'd rather verify with my phone number",
    verificationSuccessful: "ترجمة: Verification successful 🎉",
    verificationFailed: "ترجمة: Verification attempt failed. Please retry.",
    passportAlreadyLinked:
      "ترجمة: This passport is already linked to another RariMe account. Please try a different one.",
    unexpectedError: "ترجمة: Oops! Unexpected error—try refreshing the page",
    syncHiccup:
      "ترجمة: Oops! Sync hiccup detected. We've refreshed your QR code—try scanning it again!",
  },
  es: {
    pageTitle: "Proteja su privacidad",
    description:
      "RariMe es una billetera de identidad con tecnología ZK que convierte su pasaporte en una ID digital anónima, almacenada en su dispositivo, para que pueda demostrar que es un humano único sin compartir datos personales con nadie.",

    download: "Descargar",
    claimAnonymousId: "Reclame su ID anónima",
    comeBackAndVerify: "Regrese aquí y haga clic en Verificar",
    scanQrCode: "Escanee el código QR con RariMe para verificar su identidad",
    failedToGenerateLink: "Error al generar el enlace de verificación",
    loadingVerificationLink: "Cargando enlace de verificación",
    openLinkOnMobile: "O abra el siguiente enlace en su navegador móvil:",
    copy: "Copiar",
    waitingForVerification: "Esperando verificación...",
    verify: "Verificar",
    preferPhoneVerification: "Prefiero verificar con mi número de teléfono",
    verificationSuccessful: "Verificación exitosa 🎉",
    verificationFailed:
      "El intento de verificación falló. Por favor, inténtelo de nuevo.",
    passportAlreadyLinked:
      "Este pasaporte ya está vinculado a otra cuenta de RariMe. Por favor, intente con uno diferente.",
    unexpectedError: "¡Ups! Error inesperado—intente refrescar la página",
    syncHiccup:
      "¡Ups! Detectamos un problema de sincronización. Hemos actualizado su código QR—¡intente escanearlo de nuevo!",
  },
  fr: {
    pageTitle: "Maîtrisez votre Confidentialité",
    description:
      "RariMe est un portefeuille d'identité alimenté par ZK qui convertit votre passeport en ID numérique anonyme, stockée sur votre appareil, pour que vous puissiez prouver que vous êtes un humain unique sans partager de données personnelles avec quiconque.",
    download: "Télécharger",
    claimAnonymousId: "Réclamez votre ID anonyme",
    comeBackAndVerify: "Revenez ici et cliquez sur Vérifier",
    scanQrCode: "Scannez le code QR avec RariMe pour vérifier votre identité",
    failedToGenerateLink: "Échec de la génération du lien de vérification",
    loadingVerificationLink: "Chargement du lien de vérification",
    openLinkOnMobile:
      "Ou ouvrez le lien ci-dessous dans votre navigateur mobile :",
    copy: "Copier",
    waitingForVerification: "En attente de vérification...",
    verify: "Vérifier",
    preferPhoneVerification: "Je préfère vérifier avec mon numéro de téléphone",
    verificationSuccessful: "Vérification réussie 🎉",
    verificationFailed:
      "La tentative de vérification a échoué. Veuillez réessayer.",
    passportAlreadyLinked:
      "Ce passeport est déjà lié à un autre compte RariMe. Veuillez en essayer un différent.",
    unexpectedError: "Oups ! Erreur inattendue—essayez de rafraîchir la page",
    syncHiccup:
      "Oups ! Problème de synchronisation détecté. Nous avons actualisé votre code QR—essayez de le scanner à nouveau !",
  },
  "zh-Hans": {
    pageTitle: "拥有您的隐私",
    description:
      "RariMe 是一个 ZK 驱动的身份钱包，将您的护照转换为匿名数字 ID，存储在您的设备上，这样您就可以证明您是一个独特的、没有与任何人分享任何个人数据的人。",
    download: "下载",
    claimAnonymousId: "领取您的匿名 ID",
    comeBackAndVerify: "返回这里并点击验证",
    scanQrCode: "使用 RariMe 扫描二维码以验证您的身份",
    failedToGenerateLink: "生成验证链接失败",
    loadingVerificationLink: "加载验证链接",
    openLinkOnMobile: "或者在您的移动浏览器中打开以下链接：",
    copy: "复制",
    waitingForVerification: "等待验证...",
    verify: "验证",
    preferPhoneVerification: "我更喜欢使用手机号验证",
    verificationSuccessful: "验证成功 🎉",
    verificationFailed: "验证尝试失败。请重试。",
    passportAlreadyLinked:
      "此护照已与另一个 RariMe 账户关联。请尝试使用不同的护照。",
    unexpectedError: "哎呀！意外错误——请刷新页面",
    syncHiccup: "哎呀！同步问题检测到。我们已经刷新了您的二维码——请再次扫描！",
  },
  "zh-Hant": {
    pageTitle: "擁有您的隱私",
    description:
      "RariMe 是一個 ZK 驅動的身份錢包，將您的護照轉換為匿名數字 ID，存儲在您的設備上，這樣您就可以證明您是一個獨特的、沒有與任何人分享任何個人數據的人。",
    download: "下載",
    claimAnonymousId: "領取您的匿名 ID",
    comeBackAndVerify: "返回這裡並點擊驗證",
    scanQrCode: "使用 RariMe 掃描二維碼以驗證您的身份",
    failedToGenerateLink: "生成驗證鏈接失敗",
    loadingVerificationLink: "加載驗證鏈接",
    openLinkOnMobile: "或者在您的移動瀏覽器中打開以下鏈接：",
    copy: "複製",
    waitingForVerification: "等待驗證...",
    verify: "驗證",
    preferPhoneVerification: "我更喜歡使用手機號驗證",
    verificationSuccessful: "驗證成功 🎉",
    verificationFailed: "驗證嘗試失敗。請重試。",
    passportAlreadyLinked:
      "此護照已與另一個 RariMe 賬戶關聯。請嘗試使用不同的護照。",
    unexpectedError: "哎呀！意外錯誤——請刷新頁面",
    syncHiccup: "哎呀！同步問題檢測到。我們已經刷新了您的二維碼——請再次掃描！",
  },
  ja: {
    pageTitle: "プライバシーを守る",
    description:
      "RariMe は ZK 駆動の身元ウォレットで、あなたのパスポートを匿名の数字 ID に変換し、あなたのデバイスに保存します。これにより、あなたは誰とも個人情報を共有せずに、独自の人間であることを証明できます。",
    download: "ダウンロード",
    claimAnonymousId: "匿名 ID を取得",
    comeBackAndVerify: "ここに戻って Verify をクリック",
    scanQrCode: "RariMe で QR コードをスキャンして身元を確認",
    failedToGenerateLink: "検証リンクの生成に失敗",
    loadingVerificationLink: "検証リンクを読み込んでいます",
    openLinkOnMobile:
      "または、以下のリンクをモバイルブラウザで開いてください：",
    copy: "コピー",
    waitingForVerification: "検証待ち...",
    verify: "検証",
    preferPhoneVerification: "携帯電話で検証したい",
    verificationSuccessful: "検証成功 🎉",
    verificationFailed: "検証試行に失敗しました。再試行してください。",
    passportAlreadyLinked:
      "このパスポートはすでに別の RariMe アカウントにリンクされています。別のパスポートを試してください。",
    unexpectedError:
      "おっと！予期しないエラーが発生しました—ページを更新してください",
    syncHiccup:
      "おっと！同期の問題が検出されました。QR コードを更新しました—再スキャンしてください！",
  },
};
