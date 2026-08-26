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
      "Accounts do not require email. Mandatory onboarding only shows the opt-in to participants who voluntarily added and verified an email in Settings.",
    enforceEmailVerificationOnly: "Enforce email verification only",
    guestPartialReach:
      "Guest participation does not require email. Mandatory onboarding only shows the opt-in to participants who voluntarily added and verified an email in Settings.",
    keepUpdatesOn: "Keep updates on",
    partialReachTitle: "Most participants may not receive updates",
    strongVerificationPartialReach:
      "Strong verification does not require email. Mandatory onboarding only shows the opt-in to participants who voluntarily added and verified an email in Settings.",
    turnUpdatesOff: "Turn updates off",
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
      "Les comptes ne nécessitent pas d'adresse e-mail. L'intégration obligatoire ne propose l'inscription qu'aux participants ayant volontairement ajouté et vérifié une adresse dans les paramètres.",
    enforceEmailVerificationOnly:
      "Imposer uniquement la vérification par e-mail",
    guestPartialReach:
      "La participation en tant qu'invité ne nécessite pas d'adresse e-mail. L'intégration obligatoire ne propose l'inscription qu'aux participants ayant volontairement ajouté et vérifié une adresse dans les paramètres.",
    keepUpdatesOn: "Garder les mises à jour activées",
    partialReachTitle:
      "La plupart des participants risquent de ne pas recevoir les mises à jour",
    strongVerificationPartialReach:
      "La vérification renforcée ne nécessite pas d'adresse e-mail. L'intégration obligatoire ne propose l'inscription qu'aux participants ayant volontairement ajouté et vérifié une adresse dans les paramètres.",
    turnUpdatesOff: "Désactiver les mises à jour",
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
