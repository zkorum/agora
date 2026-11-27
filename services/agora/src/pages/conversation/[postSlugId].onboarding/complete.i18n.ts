import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ConversationEmailUpdateOnboardingTranslations {
  emailUpdateTitle: string;
  emailUpdateDescription: string;
  emailUpdateSummaryLoadError: string;
  retryLabel: string;
  emailUpdatePreferenceSaveError: string;
  continueWithoutSavingLabel: string;
}

export const conversationEmailUpdateOnboardingTranslations: Record<
  SupportedDisplayLanguageCodes,
  ConversationEmailUpdateOnboardingTranslations
> = {
  en: {
    emailUpdateTitle: "Stay up to date",
    emailUpdateDescription:
      "Get updates on new statements, progress, and consultation results.",
    emailUpdateSummaryLoadError:
      "Email Update choices could not be loaded. You can retry or continue without saving a choice.",
    retryLabel: "Try again",
    emailUpdatePreferenceSaveError:
      "Your Email Update choice could not be saved. Please try again.",
    continueWithoutSavingLabel:
      "Continue without saving an Email Update choice",
  },
  de: {
    emailUpdateTitle: "Bleiben Sie auf dem Laufenden",
    emailUpdateDescription:
      "Erhalten Sie Updates zu neuen Aussagen, dem Fortschritt und den Ergebnissen der Konsultation.",
    emailUpdateSummaryLoadError:
      "Die Auswahlmöglichkeiten für den E-Mail-Update konnten nicht geladen werden. Sie können es erneut versuchen oder ohne Speichern einer Auswahl fortfahren.",
    retryLabel: "Erneut versuchen",
    emailUpdatePreferenceSaveError:
      "Ihre Auswahl für den E-Mail-Update konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.",
    continueWithoutSavingLabel:
      "Ohne Speichern der E-Mail-Update-Auswahl fortfahren",
  },
  hi: {
    emailUpdateTitle: "अपडेट से जुड़े रहें",
    emailUpdateDescription:
      "नए कथनों, प्रगति और परामर्श परिणामों पर अपडेट प्राप्त करें।",
    emailUpdateSummaryLoadError:
      "ईमेल अपडेट विकल्प लोड नहीं हो सके। आप पुनः प्रयास कर सकते हैं या विकल्प सहेजे बिना जारी रख सकते हैं।",
    retryLabel: "फिर से प्रयास करें",
    emailUpdatePreferenceSaveError:
      "आपके ईमेल अपडेट विकल्प को सहेजा नहीं जा सका। कृपया पुनः प्रयास करें।",
    continueWithoutSavingLabel: "ईमेल अपडेट विकल्प सहेजे बिना जारी रखें",
  },
  ar: {
    emailUpdateTitle: "مرحبًا بك في المحادثة",
    emailUpdateDescription:
      "اختر تفضيلك لتحديثات البريد الإلكتروني قبل المتابعة.",
    emailUpdateSummaryLoadError:
      "تعذر تحميل خيارات تحديثات البريد الإلكتروني. يمكنك إعادة المحاولة أو المتابعة دون حفظ خيار.",
    retryLabel: "حاول مرة أخرى",
    emailUpdatePreferenceSaveError:
      "تعذر حفظ اختيار تحديثات البريد الإلكتروني. يُرجى المحاولة مرة أخرى.",
    continueWithoutSavingLabel:
      "المتابعة دون حفظ اختيار تحديثات البريد الإلكتروني",
  },
  es: {
    emailUpdateTitle: "Le damos la bienvenida a la conversación",
    emailUpdateDescription:
      "Elija su preferencia de seguimiento por correo antes de continuar.",
    emailUpdateSummaryLoadError:
      "No se pudo cargar su preferencia de seguimiento por correo. Puede reintentar o continuar sin guardarla.",
    retryLabel: "Intentar de nuevo",
    emailUpdatePreferenceSaveError:
      "No se pudo guardar su preferencia de seguimiento por correo. Inténtelo de nuevo.",
    continueWithoutSavingLabel:
      "Continuar sin guardar la preferencia de seguimiento por correo",
  },
  fa: {
    emailUpdateTitle: "به گفت‌وگو خوش آمدید",
    emailUpdateDescription:
      "پیش از ادامه، ترجیح خود را برای به‌روزرسانی‌های ایمیلی انتخاب کنید.",
    emailUpdateSummaryLoadError:
      "گزینه‌های به‌روزرسانی ایمیلی بارگیری نشد. می‌توانید دوباره تلاش کنید یا بدون ذخیره انتخاب ادامه دهید.",
    retryLabel: "تلاش دوباره",
    emailUpdatePreferenceSaveError:
      "انتخاب به‌روزرسانی ایمیلی شما ذخیره نشد. دوباره تلاش کنید.",
    continueWithoutSavingLabel: "ادامه بدون ذخیره انتخاب به‌روزرسانی ایمیلی",
  },
  fr: {
    emailUpdateTitle: "Gardez le fil de la consultation",
    emailUpdateDescription:
      "Recevez les nouvelles propositions, les avancées et le bilan de la consultation.",
    emailUpdateSummaryLoadError:
      "Votre préférence de suivi par e-mail n’a pas pu être chargée. Vous pouvez réessayer ou continuer sans l’enregistrer.",
    retryLabel: "Réessayer",
    emailUpdatePreferenceSaveError:
      "Votre préférence de suivi par e-mail n’a pas pu être enregistrée. Veuillez réessayer.",
    continueWithoutSavingLabel:
      "Continuer sans enregistrer la préférence de suivi par e-mail",
  },
  he: {
    emailUpdateTitle: "ברוכים הבאים לשיחה",
    emailUpdateDescription: "יש לבחור את העדפת העדכונים בדוא״ל לפני שממשיכים.",
    emailUpdateSummaryLoadError:
      "לא ניתן היה לטעון את אפשרויות העדכונים בדוא״ל. אפשר לנסות שוב או להמשיך בלי לשמור בחירה.",
    retryLabel: "ניסיון נוסף",
    emailUpdatePreferenceSaveError:
      "לא ניתן היה לשמור את בחירת העדכונים בדוא״ל. נא לנסות שוב.",
    continueWithoutSavingLabel: "המשך בלי לשמור בחירת עדכונים בדוא״ל",
  },
  ja: {
    emailUpdateTitle: "会話へようこそ",
    emailUpdateDescription:
      "続行する前に、メール更新の受信設定を選択してください。",
    emailUpdateSummaryLoadError:
      "メール更新の選択肢を読み込めませんでした。再試行するか、選択を保存せずに続行できます。",
    retryLabel: "もう一度試す",
    emailUpdatePreferenceSaveError:
      "メール更新の選択を保存できませんでした。もう一度お試しください。",
    continueWithoutSavingLabel: "メール更新の選択を保存せずに続行",
  },
  ky: {
    emailUpdateTitle: "Талкууга кош келиңиз",
    emailUpdateDescription:
      "Улантуудан мурун электрондук кат жаңыртуулары боюнча тандооңузду белгилеңиз.",
    emailUpdateSummaryLoadError:
      "Электрондук кат тандоолору жүктөлгөн жок. Кайра аракет кылыңыз же тандоону сактабай улантыңыз.",
    retryLabel: "Кайра аракет кылуу",
    emailUpdatePreferenceSaveError:
      "Электрондук кат тандооңуз сакталган жок. Кайра аракет кылыңыз.",
    continueWithoutSavingLabel: "Электрондук кат тандоосун сактабай улантуу",
  },
  ru: {
    emailUpdateTitle: "Добро пожаловать в обсуждение",
    emailUpdateDescription:
      "Перед продолжением выберите настройку почтовых обновлений.",
    emailUpdateSummaryLoadError:
      "Не удалось загрузить настройки почтовых обновлений. Повторите попытку или продолжите без сохранения выбора.",
    retryLabel: "Повторить",
    emailUpdatePreferenceSaveError:
      "Не удалось сохранить выбор почтовых обновлений. Повторите попытку.",
    continueWithoutSavingLabel:
      "Продолжить без сохранения настройки почтовых обновлений",
  },
  "zh-Hans": {
    emailUpdateTitle: "欢迎加入对话",
    emailUpdateDescription: "继续前，请选择是否接收邮件动态。",
    emailUpdateSummaryLoadError:
      "无法加载邮件更新选项。你可以重试，或继续且不保存选择。",
    retryLabel: "重试",
    emailUpdatePreferenceSaveError: "无法保存你的邮件更新选择。请重试。",
    continueWithoutSavingLabel: "继续且不保存邮件更新选择",
  },
  "zh-Hant": {
    emailUpdateTitle: "歡迎加入對話",
    emailUpdateDescription: "繼續前，請選擇是否接收電子郵件動態。",
    emailUpdateSummaryLoadError:
      "無法載入電子郵件更新選項。你可以重試，或繼續且不儲存選擇。",
    retryLabel: "重試",
    emailUpdatePreferenceSaveError: "無法儲存你的電子郵件更新選擇。請重試。",
    continueWithoutSavingLabel: "繼續且不儲存電子郵件更新選擇",
  },
};
