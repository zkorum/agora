import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ConversationUpdatesPartialEmailReachDialogTranslations {
  accountPartialReach: string;
  enforceEmailVerificationOnly: string;
  guestPartialReach: string;
  keepUpdatesOn: string;
  partialReachTitle: string;
  strongVerificationPartialReach: string;
  turnUpdatesOff: string;
}

export const conversationUpdatesPartialEmailReachDialogTranslations: Record<
  SupportedDisplayLanguageCodes,
  ConversationUpdatesPartialEmailReachDialogTranslations
> = {
  en: {
    accountPartialReach:
      "An email address is not required to create an account. Only participants who add and verify one in Settings can choose to receive your email updates.",
    enforceEmailVerificationOnly: "Require only email verification",
    guestPartialReach:
      "An email address is not required to participate as a guest. Only participants who add and verify one in Settings can choose to receive your email updates.",
    keepUpdatesOn: "Keep email updates on",
    partialReachTitle: "Your email updates may not reach everyone",
    strongVerificationPartialReach:
      "Strong verification does not require an email address. Only participants who add and verify one in Settings can choose to receive your email updates.",
    turnUpdatesOff: "Turn email updates off",
  },
  de: {
    accountPartialReach:
      "Für die Erstellung eines Kontos ist keine E-Mail-Adresse erforderlich. Nur Teilnehmende, die eine in den Einstellungen hinzufügen und verifizieren, können sich für den Erhalt Ihrer E-Mail-Benachrichtigungen entscheiden.",
    enforceEmailVerificationOnly: "Nur E-Mail-Verifizierung erzwingen",
    guestPartialReach:
      "Für die Teilnahme als Gast ist keine E-Mail-Adresse erforderlich. Nur Teilnehmende, die eine in den Einstellungen hinzufügen und verifizieren, können sich für den Erhalt Ihrer E-Mail-Benachrichtigungen entscheiden.",
    keepUpdatesOn: "E-Mail-Benachrichtigungen aktivieren",
    partialReachTitle:
      "Ihre E-Mail-Benachrichtigungen erreichen möglicherweise nicht alle Teilnehmenden",
    strongVerificationPartialReach:
      "Eine starke Verifizierung erfordert keine E-Mail-Adresse. Nur Teilnehmende, die eine in den Einstellungen hinzufügen und verifizieren, können sich für den Erhalt Ihrer E-Mail-Benachrichtigungen entscheiden.",
    turnUpdatesOff: "E-Mail-Benachrichtigungen deaktivieren",
  },
  hi: {
    accountPartialReach:
      "खाता बनाने के लिए ईमेल पता आवश्यक नहीं है। केवल वे प्रतिभागी जो सेटिंग्स में एक जोड़ते और सत्यापित करते हैं, वे आपके ईमेल अपडेट प्राप्त करने का विकल्प चुन सकते हैं।",
    enforceEmailVerificationOnly: "केवल ईमेल सत्यापन अनिवार्य करें",
    guestPartialReach:
      "अतिथि के रूप में भाग लेने के लिए ईमेल पता आवश्यक नहीं है। केवल वे प्रतिभागी जो सेटिंग्स में एक जोड़ते और सत्यापित करते हैं, वे आपके ईमेल अपडेट प्राप्त करने का विकल्प चुन सकते हैं।",
    keepUpdatesOn: "ईमेल अपडेट चालू रखें",
    partialReachTitle: "आपके ईमेल अपडेट सभी तक नहीं पहुँच सकते",
    strongVerificationPartialReach:
      "मजबूत सत्यापन के लिए ईमेल पते की आवश्यकता नहीं है। केवल वे प्रतिभागी जो सेटिंग्स में एक जोड़ते और सत्यापित करते हैं, वे आपके ईमेल अपडेट प्राप्त करने का विकल्प चुन सकते हैं।",
    turnUpdatesOff: "ईमेल अपडेट बंद करें",
  },
  ar: {
    accountPartialReach:
      "لا تتطلب الحسابات بريدًا إلكترونيًا. لا تعرض عملية الإعداد الإلزامية خيار الاشتراك إلا للمشاركين الذين أضافوا بريدًا إلكترونيًا وتحققوا منه طوعًا في الإعدادات.",
    enforceEmailVerificationOnly: "فرض التحقق بالبريد الإلكتروني فقط",
    guestPartialReach:
      "لا تتطلب مشاركة الضيوف بريدًا إلكترونيًا. لا تعرض عملية الإعداد الإلزامية خيار الاشتراك إلا للمشاركين الذين أضافوا بريدًا إلكترونيًا وتحققوا منه طوعًا في الإعدادات.",
    keepUpdatesOn: "إبقاء التحديثات مفعّلة",
    partialReachTitle: "قد لا يتلقى معظم المشاركين التحديثات",
    strongVerificationPartialReach:
      "لا يتطلب التحقق القوي بريدًا إلكترونيًا. لا تعرض عملية الإعداد الإلزامية خيار الاشتراك إلا للمشاركين الذين أضافوا بريدًا إلكترونيًا وتحققوا منه طوعًا في الإعدادات.",
    turnUpdatesOff: "إيقاف التحديثات",
  },
  es: {
    accountPartialReach:
      "Las cuentas no requieren correo. La incorporación obligatoria solo muestra la opción a quienes añadieron y verificaron voluntariamente un correo en Ajustes.",
    enforceEmailVerificationOnly: "Exigir solo verificación por correo",
    guestPartialReach:
      "La participación como invitado no requiere correo. La incorporación obligatoria solo muestra la opción a quienes añadieron y verificaron voluntariamente un correo en Ajustes.",
    keepUpdatesOn: "Mantener las actualizaciones activadas",
    partialReachTitle:
      "Es posible que la mayoría no reciba las actualizaciones",
    strongVerificationPartialReach:
      "La verificación reforzada no requiere correo. La incorporación obligatoria solo muestra la opción a quienes añadieron y verificaron voluntariamente un correo en Ajustes.",
    turnUpdatesOff: "Desactivar las actualizaciones",
  },
  fa: {
    accountPartialReach:
      "حساب‌ها به ایمیل نیاز ندارند. فرایند ورود اجباری فقط به شرکت‌کنندگانی گزینه عضویت را نشان می‌دهد که داوطلبانه ایمیلی را در تنظیمات افزوده و تأیید کرده‌اند.",
    enforceEmailVerificationOnly: "فقط تأیید ایمیل را الزامی کن",
    guestPartialReach:
      "مشارکت مهمان به ایمیل نیاز ندارد. فرایند ورود اجباری فقط به شرکت‌کنندگانی گزینه عضویت را نشان می‌دهد که داوطلبانه ایمیلی را در تنظیمات افزوده و تأیید کرده‌اند.",
    keepUpdatesOn: "به‌روزرسانی‌ها روشن بمانند",
    partialReachTitle:
      "ممکن است بیشتر شرکت‌کنندگان به‌روزرسانی‌ها را دریافت نکنند",
    strongVerificationPartialReach:
      "احراز هویت قوی به ایمیل نیاز ندارد. فرایند ورود اجباری فقط به شرکت‌کنندگانی گزینه عضویت را نشان می‌دهد که داوطلبانه ایمیلی را در تنظیمات افزوده و تأیید کرده‌اند.",
    turnUpdatesOff: "به‌روزرسانی‌ها را خاموش کن",
  },
  fr: {
    accountPartialReach:
      "Une adresse e-mail n'est pas requise pour créer un compte. Seuls les participants qui en ajoutent et vérifient une dans leurs paramètres peuvent choisir de recevoir vos nouvelles par e-mail.",
    enforceEmailVerificationOnly:
      "Exiger uniquement une adresse e-mail vérifiée",
    guestPartialReach:
      "Une adresse e-mail n'est pas requise pour participer en tant qu'invité. Seuls les participants qui en ajoutent et vérifient une dans leurs paramètres peuvent choisir de recevoir vos nouvelles par e-mail.",
    keepUpdatesOn: "Garder les nouvelles par e-mail activées",
    partialReachTitle:
      "Vos nouvelles par e-mail pourraient ne pas parvenir à tout le monde",
    strongVerificationPartialReach:
      "La vérification renforcée ne nécessite pas d'adresse e-mail. Seuls les participants qui en ajoutent et vérifient une dans leurs paramètres peuvent choisir de recevoir vos nouvelles par e-mail.",
    turnUpdatesOff: "Désactiver les nouvelles par e-mail",
  },
  he: {
    accountPartialReach:
      "חשבונות אינם דורשים דוא״ל. תהליך ההצטרפות החובה מציג את אפשרות ההרשמה רק למשתתפים שהוסיפו ואימתו כתובת דוא״ל מרצונם בהגדרות.",
    enforceEmailVerificationOnly: "דרישת אימות דוא״ל בלבד",
    guestPartialReach:
      "השתתפות כאורח אינה דורשת דוא״ל. תהליך ההצטרפות החובה מציג את אפשרות ההרשמה רק למשתתפים שהוסיפו ואימתו כתובת דוא״ל מרצונם בהגדרות.",
    keepUpdatesOn: "להשאיר את העדכונים פעילים",
    partialReachTitle: "רוב המשתתפים עלולים לא לקבל עדכונים",
    strongVerificationPartialReach:
      "אימות חזק אינו דורש דוא״ל. תהליך ההצטרפות החובה מציג את אפשרות ההרשמה רק למשתתפים שהוסיפו ואימתו כתובת דוא״ל מרצונם בהגדרות.",
    turnUpdatesOff: "לכבות את העדכונים",
  },
  ja: {
    accountPartialReach:
      "アカウントにはメールが必須ではありません。必須のオンボーディングでは、設定で自発的にメールを追加して確認した参加者にのみ登録オプションが表示されます。",
    enforceEmailVerificationOnly: "メール確認のみを必須にする",
    guestPartialReach:
      "ゲスト参加にはメールが必須ではありません。必須のオンボーディングでは、設定で自発的にメールを追加して確認した参加者にのみ登録オプションが表示されます。",
    keepUpdatesOn: "更新をオンのままにする",
    partialReachTitle: "ほとんどの参加者が更新を受け取れない可能性があります",
    strongVerificationPartialReach:
      "強力な本人確認にはメールが必須ではありません。必須のオンボーディングでは、設定で自発的にメールを追加して確認した参加者にのみ登録オプションが表示されます。",
    turnUpdatesOff: "更新をオフにする",
  },
  ky: {
    accountPartialReach:
      "Аккаунттар электрондук даректи талап кылбайт. Милдеттүү катталуу Жөндөөлөрдөн дарегин өз каалоосу менен кошуп, ырастаган катышуучуларга гана жазылууну көрсөтөт.",
    enforceEmailVerificationOnly:
      "Электрондук даректи ырастоону гана талап кылуу",
    guestPartialReach:
      "Конок катары катышуу электрондук даректи талап кылбайт. Милдеттүү катталуу Жөндөөлөрдөн дарегин өз каалоосу менен кошуп, ырастаган катышуучуларга гана жазылууну көрсөтөт.",
    keepUpdatesOn: "Жаңыртууларды күйүк калтыруу",
    partialReachTitle: "Катышуучулардын көбү жаңыртууларды албай калышы мүмкүн",
    strongVerificationPartialReach:
      "Күчтүү ырастоо электрондук даректи талап кылбайт. Милдеттүү катталуу Жөндөөлөрдөн дарегин өз каалоосу менен кошуп, ырастаган катышуучуларга гана жазылууну көрсөтөт.",
    turnUpdatesOff: "Жаңыртууларды өчүрүү",
  },
  ru: {
    accountPartialReach:
      "Для аккаунта адрес электронной почты не обязателен. Обязательное подключение предлагает подписку только участникам, которые добровольно добавили и подтвердили адрес в настройках.",
    enforceEmailVerificationOnly:
      "Требовать только подтверждение электронной почты",
    guestPartialReach:
      "Гостевое участие не требует адреса электронной почты. Обязательное подключение предлагает подписку только участникам, которые добровольно добавили и подтвердили адрес в настройках.",
    keepUpdatesOn: "Оставить обновления включёнными",
    partialReachTitle: "Большинство участников могут не получить обновления",
    strongVerificationPartialReach:
      "Усиленная проверка не требует адреса электронной почты. Обязательное подключение предлагает подписку только участникам, которые добровольно добавили и подтвердили адрес в настройках.",
    turnUpdatesOff: "Отключить обновления",
  },
  "zh-Hans": {
    accountPartialReach:
      "账户不要求电子邮箱。强制引导流程只会向主动在设置中添加并验证邮箱的参与者显示订阅选项。",
    enforceEmailVerificationOnly: "仅强制电子邮件验证",
    guestPartialReach:
      "访客参与不要求电子邮箱。强制引导流程只会向主动在设置中添加并验证邮箱的参与者显示订阅选项。",
    keepUpdatesOn: "保持更新开启",
    partialReachTitle: "大多数参与者可能无法收到更新",
    strongVerificationPartialReach:
      "强验证不要求电子邮箱。强制引导流程只会向主动在设置中添加并验证邮箱的参与者显示订阅选项。",
    turnUpdatesOff: "关闭更新",
  },
  "zh-Hant": {
    accountPartialReach:
      "帳戶不要求電子信箱。強制引導流程只會向主動在設定中新增並驗證信箱的參與者顯示訂閱選項。",
    enforceEmailVerificationOnly: "僅強制電子郵件驗證",
    guestPartialReach:
      "訪客參與不要求電子信箱。強制引導流程只會向主動在設定中新增並驗證信箱的參與者顯示訂閱選項。",
    keepUpdatesOn: "保持更新開啟",
    partialReachTitle: "大多數參與者可能無法收到更新",
    strongVerificationPartialReach:
      "強驗證不要求電子信箱。強制引導流程只會向主動在設定中新增並驗證信箱的參與者顯示訂閱選項。",
    turnUpdatesOff: "關閉更新",
  },
};
