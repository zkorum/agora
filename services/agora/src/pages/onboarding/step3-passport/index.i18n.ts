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
  preferEmailLogin: string;
  verificationSuccessful: string;
  accountMerged: string;
  verificationFailed: string;
  passportAlreadyLinked: string;
  unexpectedError: string;
  credentialAlreadyLinked: string;
  copiedToClipboard: string;
  couldNotCopy: string;
}

export const passportOnboardingTranslations: Record<
  SupportedDisplayLanguageCodes,
  PassportOnboardingTranslations
> = {
  en: {
    pageTitle: "Own Your Privacy",
    description:
      "Rarimo is a ZK-powered identity wallet that converts your passport into an anonymous digital ID, stored on your device, so you can prove that you're a unique human without sharing any personal data with anyone.",
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
    preferPhoneVerification: "I'd rather verify with my phone number",
    preferEmailLogin: "I prefer to use my email address",
    verificationSuccessful: "Verification successful 🎉",
    accountMerged: "Success! Your accounts have been merged 🎉",
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
    pageTitle: "احم خصوصيتك",
    description:
      "رقمي هي محفظة هوية مدعومة بتقنية ZK تحول جواز سفرك إلى هوية رقمية مجهولة، محفوظة على جهازك، حتى تتمكن من إثبات أنك إنسان فريد دون مشاركة أي بيانات شخصية مع أي شخص.",
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
    preferPhoneVerification: "أفضل التحقق برقم الهاتف",
    preferEmailLogin: "أفضل استخدام بريدي الإلكتروني",
    verificationSuccessful: "تم التحقق بنجاح 🎉",
    accountMerged: "نجح! تم دمج حساباتك 🎉",
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
    pageTitle: "Proteja su privacidad",
    description:
      "Rarimo es una billetera de identidad con tecnología ZK que convierte su pasaporte en una ID digital anónima, almacenada en su dispositivo, para que pueda demostrar que es un humano único sin compartir datos personales con nadie.",

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
    preferPhoneVerification: "Prefiero verificar con mi número de teléfono",
    preferEmailLogin: "Prefiero usar mi correo electrónico",
    verificationSuccessful: "Verificación exitosa 🎉",
    accountMerged: "¡Éxito! Sus cuentas han sido fusionadas 🎉",
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
    pageTitle: "Maîtrisez votre Confidentialité",
    description:
      "Rarimo est un portefeuille d'identité alimenté par ZK qui convertit votre passeport en ID numérique anonyme, stockée sur votre appareil, pour que vous puissiez prouver que vous êtes un humain unique sans partager de données personnelles avec quiconque.",
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
    preferPhoneVerification: "Je préfère vérifier avec mon numéro de téléphone",
    preferEmailLogin: "Je préfère utiliser mon adresse e-mail",
    verificationSuccessful: "Vérification réussie 🎉",
    accountMerged: "Succès ! Vos comptes ont été fusionnés 🎉",
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
    pageTitle: "拥有您的隐私",
    description:
      "Rarimo 是一个 ZK 驱动的身份钱包，将您的护照转换为匿名数字 ID，存储在您的设备上，这样您就可以证明您是一个独特的、没有与任何人分享任何个人数据的人。",
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
    preferPhoneVerification: "我更喜欢使用手机号验证",
    preferEmailLogin: "我更想用邮箱",
    verificationSuccessful: "验证成功 🎉",
    accountMerged: "成功！您的账户已合并 🎉",
    verificationFailed: "验证尝试失败。请重试。",
    passportAlreadyLinked:
      "此护照已与另一个 Rarimo 账户关联。请尝试使用不同的护照。",
    unexpectedError: "哎呀！意外错误——请刷新页面",
    credentialAlreadyLinked: "此护照已关联到另一个账户",
    copiedToClipboard: "已复制链接到剪贴板",
    couldNotCopy: "无法复制到剪贴板",
  },
  "zh-Hant": {
    pageTitle: "擁有您的隱私",
    description:
      "Rarimo 是一個 ZK 驅動的身份錢包，將您的護照轉換為匿名數字 ID，存儲在您的設備上，這樣您就可以證明您是一個獨特的、沒有與任何人分享任何個人數據的人。",
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
    preferPhoneVerification: "我更喜歡使用手機號驗證",
    preferEmailLogin: "我更想用郵箱",
    verificationSuccessful: "驗證成功 🎉",
    accountMerged: "成功！您的帳戶已合併 🎉",
    verificationFailed: "驗證嘗試失敗。請重試。",
    passportAlreadyLinked:
      "此護照已與另一個 Rarimo 賬戶關聯。請嘗試使用不同的護照。",
    unexpectedError: "哎呀！意外錯誤——請刷新頁面",
    credentialAlreadyLinked: "此護照已關聯到另一個帳戶",
    copiedToClipboard: "已複製連結到剪貼簿",
    couldNotCopy: "無法複製到剪貼簿",
  },
  ja: {
    pageTitle: "プライバシーを守る",
    description:
      "Rarimo は ZK 駆動の身元ウォレットで、あなたのパスポートを匿名の数字 ID に変換し、あなたのデバイスに保存します。これにより、あなたは誰とも個人情報を共有せずに、独自の人間であることを証明できます。",
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
    preferPhoneVerification: "携帯電話で検証したい",
    preferEmailLogin: "メールアドレスを使いたい",
    verificationSuccessful: "検証成功 🎉",
    accountMerged: "成功！アカウントが統合されました 🎉",
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
    pageTitle: "Купуялыгыңызды коргоңуз",
    description:
      "Rarimo — бул ZK технологиясына негизделген инсандык капчык, ал паспортуңузду анонимдүү санариптик IDге айландырат жана түзмөгүңүздө сактайт, ошондуктан сиз жеке маалыматыңызды эч ким менен бөлүшпөстөн, уникалдуу адам экениңизди далилдей аласыз.",
    download: "Жүктөп алуу",
    claimAnonymousId: "Анонимдүү IDңизди алыңыз",
    comeBackAndVerify: "Бул жакка кайтып келип, Текшерүүнү басыңыз",
    scanQrCode: "Инсандыгыңызды текшерүү үчүн Rarimo менен QR кодду скандаңыз",
    failedToGenerateLink: "Текшерүү шилтемесин түзүү ишке ашкан жок",
    loadingVerificationLink: "Текшерүү шилтемеси жүктөлүүдө",
    openLinkOnMobile: "Же төмөнкү шилтемени мобилдик браузериңизде ачыңыз:",
    copy: "Көчүрүү",
    waitingForVerification: "Текшерүү күтүлүүдө...",
    verify: "Текшерүү",
    preferPhoneVerification: "Телефон номерим менен текшерүүнү каалайм",
    preferEmailLogin: "Электрондук почтамды колдонгум келет",
    verificationSuccessful: "Текшерүү ийгиликтүү 🎉",
    accountMerged: "Ийгилик! Каттоо эсептериңиз бириктирилди 🎉",
    verificationFailed: "Текшерүү аракети ишке ашкан жок. Кайра аракет кылыңыз.",
    passportAlreadyLinked:
      "Бул паспорт башка Rarimo каттоо эсебине байланышкан. Башкасын колдонуп көрүңүз.",
    unexpectedError: "Ой! Күтүлбөгөн ката—баракты жаңылаңыз",
    credentialAlreadyLinked:
      "Бул паспорт башка каттоо эсебине байланышкан",
    copiedToClipboard: "Шилтеме алмашуу буферине көчүрүлдү",
    couldNotCopy: "Алмашуу буферине көчүрүү мүмкүн болгон жок",
  },
  ru: {
    pageTitle: "Защитите свою приватность",
    description:
      "Rarimo — это кошелёк идентификации на основе ZK-доказательств, который преобразует ваш паспорт в анонимный цифровой ID, хранящийся на вашем устройстве, позволяя доказать свою уникальность без раскрытия персональных данных.",
    download: "Скачать",
    claimAnonymousId: "Получить анонимный ID",
    comeBackAndVerify: "Вернитесь сюда и нажмите Подтвердить",
    scanQrCode: "Отсканируйте QR-код с помощью Rarimo для подтверждения личности",
    failedToGenerateLink: "Не удалось сгенерировать ссылку для верификации",
    loadingVerificationLink: "Загрузка ссылки для верификации",
    openLinkOnMobile: "Или откройте ссылку ниже в мобильном браузере:",
    copy: "Копировать",
    waitingForVerification: "Ожидание верификации...",
    verify: "Подтвердить",
    preferPhoneVerification: "Предпочитаю верификацию по номеру телефона",
    preferEmailLogin: "Предпочитаю использовать электронную почту",
    verificationSuccessful: "Верификация прошла успешно 🎉",
    accountMerged: "Аккаунты успешно объединены 🎉",
    verificationFailed: "Попытка верификации не удалась. Попробуйте ещё раз.",
    passportAlreadyLinked:
      "Этот паспорт уже привязан к другому аккаунту Rarimo. Попробуйте другой.",
    unexpectedError: "Ой! Непредвиденная ошибка — попробуйте обновить страницу",
    credentialAlreadyLinked:
      "Этот паспорт уже привязан к другому аккаунту",
    copiedToClipboard: "Ссылка скопирована в буфер обмена",
    couldNotCopy: "Не удалось скопировать в буфер обмена",
  },
};
