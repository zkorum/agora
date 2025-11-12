import type { SupportedDisplayLanguageCodes } from 'src/shared/languages';

export interface EventTicketRequirementBannerTranslations {
  verifyButton: string;
  verifyButtonRequirement: string;
  verifyingButton: string;
  ticketVerified: string;
  accountRestored: string;
  accountMerged: string;
  accountRestoredAndMerged: string;
  errorDeserialization: string;
  errorInvalidProof: string;
  errorInvalidSigner: string;
  errorWrongEvent: string;
  errorTicketAlreadyUsed: string;
  errorUnknown: string;
}

export const eventTicketRequirementBannerTranslations: Record<
  SupportedDisplayLanguageCodes,
  EventTicketRequirementBannerTranslations
> = {
  en: {
    verifyButton: 'Verify',
    verifyButtonRequirement: '{eventName} ticket required',
    verifyingButton: 'Verifying...',
    ticketVerified: '{eventName} ticket verified',
    accountRestored: 'Welcome back! Your account has been restored 🎉',
    accountMerged: 'Success! Your accounts have been merged 🎉',
    accountRestoredAndMerged: 'Welcome back! Your account has been restored and your guest data has been merged 🎉',
    errorDeserialization: 'Invalid proof format. Please try again.',
    errorInvalidProof: 'Cryptographic verification failed. Please try again.',
    errorInvalidSigner: 'Ticket not signed by Zupass.',
    errorWrongEvent: 'Wrong event ticket. {eventName} ticket required.',
    errorTicketAlreadyUsed: 'This ticket has already been verified by another account.',
    errorUnknown: 'An unknown error occurred. Please try again.',
  },
  ar: {
    verifyButton: 'التحقق',
    verifyButtonRequirement: 'تذكرة {eventName} مطلوبة',
    verifyingButton: 'جاري التحقق...',
    ticketVerified: 'تم التحقق من تذكرة {eventName}',
    accountRestored: 'مرحباً بعودتك! تمت استعادة حسابك 🎉',
    accountMerged: 'نجح! تم دمج حساباتك 🎉',
    accountRestoredAndMerged: 'مرحباً بعودتك! تمت استعادة حسابك وتم دمج بياناتك المؤقتة 🎉',
    errorDeserialization: 'تنسيق دليل غير صالح. يرجى المحاولة مرة أخرى.',
    errorInvalidProof: 'فشل التحقق التشفيري. يرجى المحاولة مرة أخرى.',
    errorInvalidSigner: 'التذكرة غير موقعة من قبل Zupass.',
    errorWrongEvent: 'تذكرة حدث خاطئة. مطلوب تذكرة {eventName}.',
    errorTicketAlreadyUsed: 'تم التحقق من هذه التذكرة بالفعل بواسطة حساب آخر.',
    errorUnknown: 'حدث خطأ غير معروف. يرجى المحاولة مرة أخرى.',
  },
  es: {
    verifyButton: 'Verificar',
    verifyButtonRequirement: 'Entrada de {eventName} requerida',
    verifyingButton: 'Verificando...',
    ticketVerified: 'Entrada de {eventName} verificada',
    accountRestored: '¡Bienvenido de nuevo! Su cuenta ha sido restaurada 🎉',
    accountMerged: '¡Éxito! Sus cuentas han sido fusionadas 🎉',
    accountRestoredAndMerged: '¡Bienvenido de nuevo! Su cuenta ha sido restaurada y sus datos de invitado han sido fusionados 🎉',
    errorDeserialization: 'Formato de prueba inválido. Por favor, inténtalo de nuevo.',
    errorInvalidProof: 'Verificación criptográfica fallida. Por favor, inténtalo de nuevo.',
    errorInvalidSigner: 'Entrada no firmada por Zupass.',
    errorWrongEvent: 'Entrada de evento incorrecta. Se requiere entrada de {eventName}.',
    errorTicketAlreadyUsed: 'Esta entrada ya ha sido verificada por otra cuenta.',
    errorUnknown: 'Ocurrió un error desconocido. Por favor, inténtalo de nuevo.',
  },
  fr: {
    verifyButton: 'Vérifier',
    verifyButtonRequirement: 'Billet {eventName} requis',
    verifyingButton: 'Vérification...',
    ticketVerified: 'Billet {eventName} vérifié',
    accountRestored: 'Bon retour ! Votre compte a été restauré 🎉',
    accountMerged: 'Succès ! Vos comptes ont été fusionnés 🎉',
    accountRestoredAndMerged: 'Bon retour ! Votre compte a été restauré et vos données invité ont été fusionnées 🎉',
    errorDeserialization: 'Format de preuve invalide. Veuillez réessayer.',
    errorInvalidProof: 'Vérification cryptographique échouée. Veuillez réessayer.',
    errorInvalidSigner: 'Billet non signé par Zupass.',
    errorWrongEvent: 'Mauvais billet d événement. Billet {eventName} requis.',
    errorTicketAlreadyUsed: 'Ce billet a déjà été vérifié par un autre compte.',
    errorUnknown: 'Une erreur inconnue s est produite. Veuillez réessayer.',
  },
  'zh-Hans': {
    verifyButton: '验证',
    verifyButtonRequirement: '需要 {eventName} 门票',
    verifyingButton: '验证中...',
    ticketVerified: '{eventName} 门票已验证',
    accountRestored: '欢迎回来！您的账户已恢复 🎉',
    accountMerged: '成功！您的账户已合并 🎉',
    accountRestoredAndMerged: '欢迎回来！您的账户已恢复，访客数据已合并 🎉',
    errorDeserialization: '无效的证明格式。请重试。',
    errorInvalidProof: '加密验证失败。请重试。',
    errorInvalidSigner: '门票未由 Zupass 签名。',
    errorWrongEvent: '错误的活动门票。需要 {eventName} 门票。',
    errorTicketAlreadyUsed: '此门票已被另一个账户验证。',
    errorUnknown: '发生未知错误。请重试。',
  },
  'zh-Hant': {
    verifyButton: '驗證',
    verifyButtonRequirement: '需要 {eventName} 門票',
    verifyingButton: '驗證中...',
    ticketVerified: '{eventName} 門票已驗證',
    accountRestored: '歡迎回來！您的帳戶已恢復 🎉',
    accountMerged: '成功！您的帳戶已合併 🎉',
    accountRestoredAndMerged: '歡迎回來！您的帳戶已恢復，訪客數據已合併 🎉',
    errorDeserialization: '無效的證明格式。請重試。',
    errorInvalidProof: '加密驗證失敗。請重試。',
    errorInvalidSigner: '門票未由 Zupass 簽署。',
    errorWrongEvent: '錯誤的活動門票。需要 {eventName} 門票。',
    errorTicketAlreadyUsed: '此門票已被另一個帳戶驗證。',
    errorUnknown: '發生未知錯誤。請重試。',
  },
  ja: {
    verifyButton: '確認',
    verifyButtonRequirement: '{eventName} チケットが必要',
    verifyingButton: '確認中...',
    ticketVerified: '{eventName} チケット確認済み',
    accountRestored: 'おかえりなさい！アカウントが復元されました 🎉',
    accountMerged: '成功！アカウントが統合されました 🎉',
    accountRestoredAndMerged: 'おかえりなさい！アカウントが復元され、ゲストデータが統合されました 🎉',
    errorDeserialization: '無効な証明形式です。もう一度お試しください。',
    errorInvalidProof: '暗号検証に失敗しました。もう一度お試しください。',
    errorInvalidSigner: 'チケットが Zupass によって署名されていません。',
    errorWrongEvent: '間違ったイベントチケットです。{eventName} チケットが必要です。',
    errorTicketAlreadyUsed: 'このチケットは既に別のアカウントで確認されています。',
    errorUnknown: '不明なエラーが発生しました。もう一度お試しください。',
  },
};
