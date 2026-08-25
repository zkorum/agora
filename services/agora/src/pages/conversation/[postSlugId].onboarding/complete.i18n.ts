import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ConversationSurveyCompleteTranslations {
  title: string;
  description: string;
  emailUpdateTitle: string;
  emailUpdateDescription: string;
  continueLabel: string;
  reviewAnswersLabel: string;
  emailUpdateSummaryLoadError: string;
  retryLabel: string;
  emailUpdatePreferenceSaveError: string;
  continueWithoutSavingLabel: string;
}

export const conversationSurveyCompleteTranslations: Record<
  SupportedDisplayLanguageCodes,
  ConversationSurveyCompleteTranslations
> = {
  en: {
    title: "Answers saved",
    description: "You can now vote on statements in this consultation.",
    emailUpdateTitle: "Welcome to the conversation",
    emailUpdateDescription:
      "Choose your email update preference before continuing.",
    continueLabel: "Continue",
    reviewAnswersLabel: "View my answers",
    emailUpdateSummaryLoadError:
      "Email Update choices could not be loaded. You can retry or continue without saving a choice.",
    retryLabel: "Try again",
    emailUpdatePreferenceSaveError:
      "Your Email Update choice could not be saved. Please try again.",
    continueWithoutSavingLabel:
      "Continue without saving an Email Update choice",
  },
  ar: {
    title: "تم حفظ الإجابات",
    description: "يمكنك الآن التصويت على المقترحات في هذه الاستشارة.",
    emailUpdateTitle: "مرحبًا بك في المحادثة",
    emailUpdateDescription:
      "اختر تفضيلك لتحديثات البريد الإلكتروني قبل المتابعة.",
    continueLabel: "متابعة",
    reviewAnswersLabel: "عرض إجاباتي",
    emailUpdateSummaryLoadError:
      "تعذر تحميل خيارات تحديثات البريد الإلكتروني. يمكنك إعادة المحاولة أو المتابعة دون حفظ خيار.",
    retryLabel: "حاول مرة أخرى",
    emailUpdatePreferenceSaveError:
      "تعذر حفظ اختيار تحديثات البريد الإلكتروني. يُرجى المحاولة مرة أخرى.",
    continueWithoutSavingLabel:
      "المتابعة دون حفظ اختيار تحديثات البريد الإلكتروني",
  },
  es: {
    title: "Respuestas guardadas",
    description: "Ahora puede votar en proposiciones en esta consulta.",
    emailUpdateTitle: "Le damos la bienvenida a la conversación",
    emailUpdateDescription:
      "Elija su preferencia de seguimiento por correo antes de continuar.",
    continueLabel: "Continuar",
    reviewAnswersLabel: "Ver mis respuestas",
    emailUpdateSummaryLoadError:
      "No se pudo cargar su preferencia de seguimiento por correo. Puede reintentar o continuar sin guardarla.",
    retryLabel: "Intentar de nuevo",
    emailUpdatePreferenceSaveError:
      "No se pudo guardar su preferencia de seguimiento por correo. Inténtelo de nuevo.",
    continueWithoutSavingLabel:
      "Continuar sin guardar la preferencia de seguimiento por correo",
  },
  fa: {
    title: "پاسخ‌ها ذخیره شدند",
    description: "اکنون می‌توانید به گزاره‌های این مشورت رأی دهید.",
    emailUpdateTitle: "به گفت‌وگو خوش آمدید",
    emailUpdateDescription:
      "پیش از ادامه، ترجیح خود را برای به‌روزرسانی‌های ایمیلی انتخاب کنید.",
    continueLabel: "ادامه",
    reviewAnswersLabel: "مشاهده پاسخ‌های من",
    emailUpdateSummaryLoadError:
      "گزینه‌های به‌روزرسانی ایمیلی بارگیری نشد. می‌توانید دوباره تلاش کنید یا بدون ذخیره انتخاب ادامه دهید.",
    retryLabel: "تلاش دوباره",
    emailUpdatePreferenceSaveError:
      "انتخاب به‌روزرسانی ایمیلی شما ذخیره نشد. دوباره تلاش کنید.",
    continueWithoutSavingLabel: "ادامه بدون ذخیره انتخاب به‌روزرسانی ایمیلی",
  },
  fr: {
    title: "Réponses enregistrées",
    description:
      "Vous pouvez maintenant voter sur les propositions de la consultation.",
    emailUpdateTitle: "Bienvenue dans la conversation",
    emailUpdateDescription:
      "Choisissez votre préférence de suivi par e-mail avant de continuer.",
    continueLabel: "Continuer",
    reviewAnswersLabel: "Voir mes réponses",
    emailUpdateSummaryLoadError:
      "Votre préférence de suivi par e-mail n’a pas pu être chargée. Vous pouvez réessayer ou continuer sans l’enregistrer.",
    retryLabel: "Réessayer",
    emailUpdatePreferenceSaveError:
      "Votre préférence de suivi par e-mail n’a pas pu être enregistrée. Veuillez réessayer.",
    continueWithoutSavingLabel:
      "Continuer sans enregistrer la préférence de suivi par e-mail",
  },
  he: {
    title: "התשובות נשמרו",
    description: "אפשר עכשיו להצביע על הצהרות בהתייעצות הזו.",
    emailUpdateTitle: "ברוכים הבאים לשיחה",
    emailUpdateDescription:
      "יש לבחור את העדפת העדכונים בדוא״ל לפני שממשיכים.",
    continueLabel: "המשך",
    reviewAnswersLabel: "הצגת התשובות שלי",
    emailUpdateSummaryLoadError:
      "לא ניתן היה לטעון את אפשרויות העדכונים בדוא״ל. אפשר לנסות שוב או להמשיך בלי לשמור בחירה.",
    retryLabel: "ניסיון נוסף",
    emailUpdatePreferenceSaveError:
      "לא ניתן היה לשמור את בחירת העדכונים בדוא״ל. נא לנסות שוב.",
    continueWithoutSavingLabel: "המשך בלי לשמור בחירת עדכונים בדוא״ל",
  },
  ja: {
    title: "回答を保存しました",
    description: "この相談の意見に投票できるようになりました。",
    emailUpdateTitle: "会話へようこそ",
    emailUpdateDescription:
      "続行する前に、メール更新の受信設定を選択してください。",
    continueLabel: "続ける",
    reviewAnswersLabel: "自分の回答を見る",
    emailUpdateSummaryLoadError:
      "メール更新の選択肢を読み込めませんでした。再試行するか、選択を保存せずに続行できます。",
    retryLabel: "もう一度試す",
    emailUpdatePreferenceSaveError:
      "メール更新の選択を保存できませんでした。もう一度お試しください。",
    continueWithoutSavingLabel: "メール更新の選択を保存せずに続行",
  },
  ky: {
    title: "Жооптор сакталды",
    description: "Эми бул кеңешүүдөгү пикирлерге добуш бере аласыз.",
    emailUpdateTitle: "Талкууга кош келиңиз",
    emailUpdateDescription:
      "Улантуудан мурун электрондук кат жаңыртуулары боюнча тандооңузду белгилеңиз.",
    continueLabel: "Улантуу",
    reviewAnswersLabel: "Жоопторумду көрүү",
    emailUpdateSummaryLoadError:
      "Электрондук кат тандоолору жүктөлгөн жок. Кайра аракет кылыңыз же тандоону сактабай улантыңыз.",
    retryLabel: "Кайра аракет кылуу",
    emailUpdatePreferenceSaveError:
      "Электрондук кат тандооңуз сакталган жок. Кайра аракет кылыңыз.",
    continueWithoutSavingLabel: "Электрондук кат тандоосун сактабай улантуу",
  },
  ru: {
    title: "Ответы сохранены",
    description:
      "Теперь вы можете голосовать по высказываниям в этом обсуждении.",
    emailUpdateTitle: "Добро пожаловать в обсуждение",
    emailUpdateDescription:
      "Перед продолжением выберите настройку почтовых обновлений.",
    continueLabel: "Продолжить",
    reviewAnswersLabel: "Посмотреть мои ответы",
    emailUpdateSummaryLoadError:
      "Не удалось загрузить настройки почтовых обновлений. Повторите попытку или продолжите без сохранения выбора.",
    retryLabel: "Повторить",
    emailUpdatePreferenceSaveError:
      "Не удалось сохранить выбор почтовых обновлений. Повторите попытку.",
    continueWithoutSavingLabel:
      "Продолжить без сохранения настройки почтовых обновлений",
  },
  "zh-Hans": {
    title: "回答已保存",
    description: "你现在可以对本次咨询中的意见投票。",
    emailUpdateTitle: "欢迎加入对话",
    emailUpdateDescription: "继续前，请选择是否接收邮件动态。",
    continueLabel: "继续",
    reviewAnswersLabel: "查看我的回答",
    emailUpdateSummaryLoadError:
      "无法加载邮件更新选项。你可以重试，或继续且不保存选择。",
    retryLabel: "重试",
    emailUpdatePreferenceSaveError: "无法保存你的邮件更新选择。请重试。",
    continueWithoutSavingLabel: "继续且不保存邮件更新选择",
  },
  "zh-Hant": {
    title: "回答已儲存",
    description: "你現在可以對本次諮詢中的意見投票。",
    emailUpdateTitle: "歡迎加入對話",
    emailUpdateDescription: "繼續前，請選擇是否接收電子郵件動態。",
    continueLabel: "繼續",
    reviewAnswersLabel: "查看我的回答",
    emailUpdateSummaryLoadError:
      "無法載入電子郵件更新選項。你可以重試，或繼續且不儲存選擇。",
    retryLabel: "重試",
    emailUpdatePreferenceSaveError: "無法儲存你的電子郵件更新選擇。請重試。",
    continueWithoutSavingLabel: "繼續且不儲存電子郵件更新選擇",
  },
};
