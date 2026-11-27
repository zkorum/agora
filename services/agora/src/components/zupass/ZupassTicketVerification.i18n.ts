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
  de: {
    title: "Verifizieren Sie Ihr Devconnect 2025 Ticket",
    description:
      "Um an dieser Diskussion teilzunehmen, müssen Sie nachweisen, dass Sie ein Devconnect 2025 Ticket besitzen.",
    verifyButton: "Ticket mit Zupass verifizieren",
    successMessage:
      "Ticket erfolgreich verifiziert! Sie können nun an geschützten Diskussionen teilnehmen.",
    accountRestored: "Willkommen zurück! Ihr Konto wurde wiederhergestellt 🎉",
    accountMerged: "Erfolg! Ihre Konten wurden zusammengeführt 🎉",
    accountRestoredAndMerged:
      "Willkommen zurück! Ihr Konto wurde wiederhergestellt und Ihre Gastdaten zusammengeführt 🎉",
    note: "Dies öffnet ein Popup zu Zupass, wo Sie den Ticketbesitz nachweisen können, ohne persönliche Informationen preiszugeben.",
    errorDeserialization:
      "Ungültiges Nachweisformat. Bitte versuchen Sie es erneut.",
    errorInvalidProof:
      "Kryptografische Verifizierung fehlgeschlagen. Bitte versuchen Sie es erneut.",
    errorInvalidSigner: "Ticket nicht von Zupass signiert.",
    errorWrongEvent:
      "Falsches Event-Ticket. Devconnect 2025 Ticket erforderlich.",
    errorTicketAlreadyUsed:
      "Dieses Ticket wurde bereits von einem anderen Konto verifiziert.",
    errorUnknown:
      "Ein unbekannter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.",
  },
  hi: {
    title: "अपने Devconnect 2025 टिकट को सत्यापित करें",
    description:
      "इस चर्चा में भाग लेने के लिए, आपको यह सत्यापित करना होगा कि आपके पास Devconnect 2025 का टिकट है।",
    verifyButton: "Zupass से टिकट सत्यापित करें",
    successMessage:
      "टिकट सफलतापूर्वक सत्यापित हो गया! अब आप प्रतिबंधित चर्चाओं में भाग ले सकते हैं।",
    accountRestored: "आपका स्वागत है! आपका खाता बहाल कर दिया गया है 🎉",
    accountMerged: "सफलता! आपके खातों को मिला दिया गया है 🎉",
    accountRestoredAndMerged:
      "आपका स्वागत है! आपका खाता बहाल कर दिया गया है और आपका अतिथि डेटा मिला दिया गया है 🎉",
    note: "यह Zupass पर एक पॉपअप खोलेगा जहाँ आप व्यक्तिगत जानकारी बताए बिना टिकट स्वामित्व साबित कर सकते हैं।",
    errorDeserialization: "अमान्य प्रमाण प्रारूप। कृपया पुनः प्रयास करें।",
    errorInvalidProof:
      "क्रिप्टोग्राफ़िक सत्यापन विफल रहा। कृपया पुनः प्रयास करें।",
    errorInvalidSigner: "टिकट Zupass द्वारा हस्ताक्षरित नहीं है।",
    errorWrongEvent: "गलत इवेंट टिकट। Devconnect 2025 टिकट आवश्यक है।",
    errorTicketAlreadyUsed:
      "इस टिकट को पहले ही किसी अन्य खाते द्वारा सत्यापित किया जा चुका है।",
    errorUnknown: "एक अज्ञात त्रुटि हुई। कृपया पुनः प्रयास करें।",
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
    title: 'Verifique su entrada de Devconnect 2025',
    description:
      'Para participar en esta conversación, necesita verificar que posee una entrada de Devconnect 2025.',
    verifyButton: 'Verificar entrada con Zupass',
    successMessage:
      '¡Entrada verificada con éxito! Ahora puede participar en conversaciones restringidas.',
    accountRestored: '¡Bienvenido de nuevo! Su cuenta ha sido restaurada 🎉',
    accountMerged: '¡Éxito! Sus cuentas han sido fusionadas 🎉',
    accountRestoredAndMerged: '¡Bienvenido de nuevo! Su cuenta ha sido restaurada y sus datos de invitado han sido fusionados 🎉',
    note: 'Esto abrirá una ventana emergente a Zupass donde puede demostrar la propiedad de la entrada sin revelar información personal.',
    errorDeserialization: 'Formato de prueba inválido. Por favor, inténtelo de nuevo.',
    errorInvalidProof: 'Verificación criptográfica fallida. Por favor, inténtelo de nuevo.',
    errorInvalidSigner: 'Entrada no firmada por Zupass.',
    errorWrongEvent: 'Entrada de evento incorrecta. Se requiere entrada de Devconnect 2025.',
    errorTicketAlreadyUsed: 'Esta entrada ya ha sido verificada por otra cuenta.',
    errorUnknown: 'Ocurrió un error desconocido. Por favor, inténtelo de nuevo.',
  },
  fa: { title: 'تأیید بلیط Devconnect 2025 شما', description: 'برای مشارکت در این گفتگو، باید مالکیت بلیط Devconnect 2025 خود را تأیید کنید.', verifyButton: 'تأیید بلیط با Zupass', successMessage: 'بلیط با موفقیت تأیید شد! اکنون می‌توانید در گفتگوهای محدود مشارکت کنید.', accountRestored: 'خوش آمدید! حساب شما بازیابی شد', accountMerged: 'موفقیت! حساب‌های شما ادغام شدند', accountRestoredAndMerged: 'خوش آمدید! حساب شما بازیابی و داده‌های مهمان شما ادغام شدند', note: 'این یک پنجره بازشو Zupass باز می‌کند که در آن می‌توانید بدون افشای اطلاعات شخصی مالکیت بلیط را اثبات کنید.', errorDeserialization: 'قالب اثبات نامعتبر است. لطفاً دوباره تلاش کنید.', errorInvalidProof: 'تأیید رمزنگاری ناموفق بود. لطفاً دوباره تلاش کنید.', errorInvalidSigner: 'بلیط توسط Zupass امضا نشده است.', errorWrongEvent: 'بلیط رویداد اشتباه. بلیط Devconnect 2025 الزامی است.', errorTicketAlreadyUsed: 'این بلیط قبلاً توسط حساب دیگری تأیید شده است.', errorUnknown: 'خطای ناشناخته‌ای رخ داد. لطفاً دوباره تلاش کنید.' },
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
  he: { title: 'אימות כרטיס Devconnect 2025 שלך', description: 'כדי להשתתף בשיחה זו, עליך לאמת שבבעלותך כרטיס Devconnect 2025.', verifyButton: 'אימות כרטיס עם Zupass', successMessage: 'הכרטיס אומת בהצלחה! כעת ניתן להשתתף בשיחות מוגנות.', accountRestored: 'ברוכים השבים! החשבון שלך שוחזר', accountMerged: 'הצלחה! החשבונות שלך מוזגו', accountRestoredAndMerged: 'ברוכים השבים! החשבון שלך שוחזר ונתוני האורח מוזגו', note: 'פעולה זו תפתח חלון קופץ ל-Zupass שבו תוכלו להוכיח בעלות על הכרטיס מבלי לחשוף מידע אישי.', errorDeserialization: 'תבנית הוכחה לא תקינה. אנא נסו שוב.', errorInvalidProof: 'אימות קריפטוגרפי נכשל. אנא נסו שוב.', errorInvalidSigner: 'הכרטיס לא חתום על ידי Zupass.', errorWrongEvent: 'כרטיס אירוע שגוי. נדרש כרטיס Devconnect 2025.', errorTicketAlreadyUsed: 'כרטיס זה כבר אומת על ידי חשבון אחר.', errorUnknown: 'אירעה שגיאה לא ידועה. אנא נסו שוב.' },
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
  ky: {
    title: 'Devconnect 2025 билетиңизди текшериңиз',
    description:
      'Бул талкууга катышуу үчүн Devconnect 2025 билетиңизди текшерүү керек.',
    verifyButton: 'Zupass менен билетти текшерүү',
    successMessage: 'Билет ийгиликтүү текшерилди! Эми чектелген талкууларга катыша аласыз.',
    accountRestored: 'Кайтканыңыз менен! Аккаунтуңуз калыбына келтирилди 🎉',
    accountMerged: 'Ийгилик! Аккаунттарыңыз бириктирилди 🎉',
    accountRestoredAndMerged: 'Кайтканыңыз менен! Аккаунтуңуз калыбына келтирилди жана конок маалыматтарыңыз бириктирилди 🎉',
    note: 'Бул Zupass калкыма терезесин ачат, анда жеке маалыматтарды ачыкка чыгарбай билетке ээлик кылууну далилдей аласыз.',
    errorDeserialization: 'Далилдин форматы жараксыз. Кайра аракет кылыңыз.',
    errorInvalidProof: 'Криптографиялык текшерүү ишке ашкан жок. Кайра аракет кылыңыз.',
    errorInvalidSigner: 'Билет Zupass тарабынан кол коюлган эмес.',
    errorWrongEvent: 'Туура эмес иш-чара билети. Devconnect 2025 билети талап кылынат.',
    errorTicketAlreadyUsed: 'Бул билет башка аккаунт тарабынан мурунтан эле текшерилген.',
    errorUnknown: 'Белгисиз ката кетти. Кайра аракет кылыңыз.',
  },
  ru: {
    title: 'Подтвердите билет Devconnect 2025',
    description:
      'Для участия в этом обсуждении необходимо подтвердить, что у вас есть билет Devconnect 2025.',
    verifyButton: 'Подтвердить билет через Zupass',
    successMessage: 'Билет успешно подтверждён! Теперь вы можете участвовать в закрытых обсуждениях.',
    accountRestored: 'С возвращением! Ваш аккаунт восстановлен 🎉',
    accountMerged: 'Успешно! Ваши аккаунты объединены 🎉',
    accountRestoredAndMerged: 'С возвращением! Ваш аккаунт восстановлен, а гостевые данные объединены 🎉',
    note: 'Откроется всплывающее окно Zupass, где вы сможете подтвердить владение билетом без раскрытия личной информации.',
    errorDeserialization: 'Неверный формат доказательства. Пожалуйста, попробуйте снова.',
    errorInvalidProof: 'Криптографическая проверка не удалась. Пожалуйста, попробуйте снова.',
    errorInvalidSigner: 'Билет не подписан Zupass.',
    errorWrongEvent: 'Неправильный билет мероприятия. Требуется билет Devconnect 2025.',
    errorTicketAlreadyUsed: 'Этот билет уже подтверждён другим аккаунтом.',
    errorUnknown: 'Произошла неизвестная ошибка. Пожалуйста, попробуйте снова.',
  },
};
