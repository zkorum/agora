import type { SupportedDisplayLanguageCodes } from 'src/shared/languages';

export interface ZupassTicketVerificationTranslations {
  title: string;
  description: string;
  verifyButton: string;
  successMessage: string;
  accountRestored: string;
  accountMerged: string;
  accountRestoredAndMerged: string;
  note: string;
  errorDeserialization: string;
  errorInvalidProof: string;
  errorInvalidSigner: string;
  errorWrongEvent: string;
  errorTicketAlreadyUsed: string;
  errorUnknown: string;
}

export const zupassTicketVerificationTranslations: Record<
  SupportedDisplayLanguageCodes,
  ZupassTicketVerificationTranslations
> = {
  en: {
    title: 'Verify Your Devconnect 2025 Ticket',
    description:
      'To participate in this conversation, you need to verify that you own a Devconnect 2025 ticket.',
    verifyButton: 'Verify Ticket with Zupass',
    successMessage: 'Ticket verified successfully! You can now participate in gated conversations.',
    accountRestored: 'Welcome back! Your account has been restored 🎉',
    accountMerged: 'Success! Your accounts have been merged 🎉',
    accountRestoredAndMerged: 'Welcome back! Your account has been restored and your guest data has been merged 🎉',
    note: 'This will open a popup to Zupass where you can prove ticket ownership without revealing personal information.',
    errorDeserialization: 'Invalid proof format. Please try again.',
    errorInvalidProof: 'Cryptographic verification failed. Please try again.',
    errorInvalidSigner: 'Ticket not signed by Zupass.',
    errorWrongEvent: 'Wrong event ticket. Devconnect 2025 ticket required.',
    errorTicketAlreadyUsed: 'This ticket has already been verified by another account.',
    errorUnknown: 'An unknown error occurred. Please try again.',
  },
  ar: {
    title: 'تحقق من تذكرة Devconnect 2025 الخاصة بك',
    description: 'للمشاركة في هذه المحادثة، تحتاج إلى التحقق من أنك تمتلك تذكرة Devconnect 2025.',
    verifyButton: 'التحقق من التذكرة باستخدام Zupass',
    successMessage: 'تم التحقق من التذكرة بنجاح! يمكنك الآن المشاركة في المحادثات المقيدة.',
    accountRestored: 'مرحباً بعودتك! تمت استعادة حسابك 🎉',
    accountMerged: 'نجح! تم دمج حساباتك 🎉',
    accountRestoredAndMerged: 'مرحباً بعودتك! تمت استعادة حسابك وتم دمج بياناتك المؤقتة 🎉',
    note: 'سيؤدي هذا إلى فتح نافذة منبثقة إلى Zupass حيث يمكنك إثبات ملكية التذكرة دون الكشف عن معلومات شخصية.',
    errorDeserialization: 'تنسيق دليل غير صالح. يرجى المحاولة مرة أخرى.',
    errorInvalidProof: 'فشل التحقق التشفيري. يرجى المحاولة مرة أخرى.',
    errorInvalidSigner: 'التذكرة غير موقعة من قبل Zupass.',
    errorWrongEvent: 'تذكرة حدث خاطئة. مطلوب تذكرة Devconnect 2025.',
    errorTicketAlreadyUsed: 'تم التحقق من هذه التذكرة بالفعل بواسطة حساب آخر.',
    errorUnknown: 'حدث خطأ غير معروف. يرجى المحاولة مرة أخرى.',
  },
  es: {
    title: 'Verifica tu entrada de Devconnect 2025',
    description:
      'Para participar en esta conversación, necesitas verificar que posees una entrada de Devconnect 2025.',
    verifyButton: 'Verificar entrada con Zupass',
    successMessage:
      '¡Entrada verificada con éxito! Ahora puedes participar en conversaciones restringidas.',
    accountRestored: '¡Bienvenido de nuevo! Su cuenta ha sido restaurada 🎉',
    accountMerged: '¡Éxito! Sus cuentas han sido fusionadas 🎉',
    accountRestoredAndMerged: '¡Bienvenido de nuevo! Su cuenta ha sido restaurada y sus datos de invitado han sido fusionados 🎉',
    note: 'Esto abrirá una ventana emergente a Zupass donde puedes demostrar la propiedad de la entrada sin revelar información personal.',
    errorDeserialization: 'Formato de prueba inválido. Por favor, inténtalo de nuevo.',
    errorInvalidProof: 'Verificación criptográfica fallida. Por favor, inténtalo de nuevo.',
    errorInvalidSigner: 'Entrada no firmada por Zupass.',
    errorWrongEvent: 'Entrada de evento incorrecta. Se requiere entrada de Devconnect 2025.',
    errorTicketAlreadyUsed: 'Esta entrada ya ha sido verificada por otra cuenta.',
    errorUnknown: 'Ocurrió un error desconocido. Por favor, inténtalo de nuevo.',
  },
  fr: {
    title: 'Vérifiez votre billet Devconnect 2025',
    description:
      'Pour participer à cette conversation, vous devez vérifier que vous possédez un billet Devconnect 2025.',
    verifyButton: 'Vérifier le billet avec Zupass',
    successMessage:
      'Billet vérifié avec succès ! Vous pouvez maintenant participer aux conversations restreintes.',
    accountRestored: 'Bon retour ! Votre compte a été restauré 🎉',
    accountMerged: 'Succès ! Vos comptes ont été fusionnés 🎉',
    accountRestoredAndMerged: 'Bon retour ! Votre compte a été restauré et vos données invité ont été fusionnées 🎉',
    note: "Cela ouvrira une fenêtre contextuelle vers Zupass où vous pourrez prouver la propriété du billet sans révéler d'informations personnelles.",
    errorDeserialization: 'Format de preuve invalide. Veuillez réessayer.',
    errorInvalidProof: 'Vérification cryptographique échouée. Veuillez réessayer.',
    errorInvalidSigner: 'Billet non signé par Zupass.',
    errorWrongEvent: 'Mauvais billet d événement. Billet Devconnect 2025 requis.',
    errorTicketAlreadyUsed: 'Ce billet a déjà été vérifié par un autre compte.',
    errorUnknown: 'Une erreur inconnue s est produite. Veuillez réessayer.',
  },
  'zh-Hans': {
    title: '验证您的 Devconnect 2025 门票',
    description: '要参与此对话，您需要验证您拥有 Devconnect 2025 门票。',
    verifyButton: '使用 Zupass 验证门票',
    successMessage: '门票验证成功！您现在可以参与受限对话。',
    accountRestored: '欢迎回来！您的账户已恢复 🎉',
    accountMerged: '成功！您的账户已合并 🎉',
    accountRestoredAndMerged: '欢迎回来！您的账户已恢复，访客数据已合并 🎉',
    note: '这将打开一个 Zupass 弹出窗口，您可以在不透露个人信息的情况下证明门票所有权。',
    errorDeserialization: '无效的证明格式。请重试。',
    errorInvalidProof: '加密验证失败。请重试。',
    errorInvalidSigner: '门票未由 Zupass 签名。',
    errorWrongEvent: '错误的活动门票。需要 Devconnect 2025 门票。',
    errorTicketAlreadyUsed: '此门票已被另一个账户验证。',
    errorUnknown: '发生未知错误。请重试。',
  },
  'zh-Hant': {
    title: '驗證您的 Devconnect 2025 門票',
    description: '要參與此對話，您需要驗證您擁有 Devconnect 2025 門票。',
    verifyButton: '使用 Zupass 驗證門票',
    successMessage: '門票驗證成功！您現在可以參與受限對話。',
    accountRestored: '歡迎回來！您的帳戶已恢復 🎉',
    accountMerged: '成功！您的帳戶已合併 🎉',
    accountRestoredAndMerged: '歡迎回來！您的帳戶已恢復，訪客數據已合併 🎉',
    note: '這將打開一個 Zupass 彈出視窗，您可以在不透露個人資訊的情況下證明門票所有權。',
    errorDeserialization: '無效的證明格式。請重試。',
    errorInvalidProof: '加密驗證失敗。請重試。',
    errorInvalidSigner: '門票未由 Zupass 簽署。',
    errorWrongEvent: '錯誤的活動門票。需要 Devconnect 2025 門票。',
    errorTicketAlreadyUsed: '此門票已被另一個帳戶驗證。',
    errorUnknown: '發生未知錯誤。請重試。',
  },
  ja: {
    title: 'Devconnect 2025 チケットを確認',
    description:
      'この会話に参加するには、Devconnect 2025 チケットを所有していることを確認する必要があります。',
    verifyButton: 'Zupass でチケットを確認',
    successMessage: 'チケットの確認に成功しました！制限付き会話に参加できるようになりました。',
    accountRestored: 'おかえりなさい！アカウントが復元されました 🎉',
    accountMerged: '成功！アカウントが統合されました 🎉',
    accountRestoredAndMerged: 'おかえりなさい！アカウントが復元され、ゲストデータが統合されました 🎉',
    note: 'これにより、Zupass へのポップアップが開き、個人情報を明かすことなくチケットの所有権を証明できます。',
    errorDeserialization: '無効な証明形式です。もう一度お試しください。',
    errorInvalidProof: '暗号検証に失敗しました。もう一度お試しください。',
    errorInvalidSigner: 'チケットが Zupass によって署名されていません。',
    errorWrongEvent: '間違ったイベントチケットです。Devconnect 2025 チケットが必要です。',
    errorTicketAlreadyUsed: 'このチケットは既に別のアカウントで確認されています。',
    errorUnknown: '不明なエラーが発生しました。もう一度お試しください。',
  },
};
