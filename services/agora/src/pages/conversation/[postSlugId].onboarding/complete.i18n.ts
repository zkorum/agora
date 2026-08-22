import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ConversationSurveyCompleteTranslations {
  title: string;
  description: string;
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
    description: "Ahora puedes votar en proposiciones en esta consulta.",
    continueLabel: "Continuar",
    reviewAnswersLabel: "Ver mis respuestas",
    emailUpdateSummaryLoadError:
      "No se pudieron cargar las opciones de actualizaciones. Puedes reintentar o continuar sin guardar una opción.",
    retryLabel: "Intentar de nuevo",
    emailUpdatePreferenceSaveError:
      "No se pudo guardar tu opción de actualizaciones. Inténtalo de nuevo.",
    continueWithoutSavingLabel:
      "Continuar sin guardar una opción de actualizaciones",
  },
  fa: {
    title: "پاسخ‌ها ذخیره شدند",
    description: "اکنون می‌توانید به گزاره‌های این مشورت رأی دهید.",
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
    continueLabel: "Continuer",
    reviewAnswersLabel: "Voir mes réponses",
    emailUpdateSummaryLoadError:
      "Les choix d’actualités par e-mail n’ont pas pu être chargés. Vous pouvez réessayer ou continuer sans enregistrer de choix.",
    retryLabel: "Réessayer",
    emailUpdatePreferenceSaveError:
      "Votre choix d’actualités par e-mail n’a pas pu être enregistré. Veuillez réessayer.",
    continueWithoutSavingLabel:
      "Continuer sans enregistrer de choix d’actualités par e-mail",
  },
  he: {
    title: "התשובות נשמרו",
    description: "אפשר עכשיו להצביע על הצהרות בהתייעצות הזו.",
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
    continueLabel: "繼續",
    reviewAnswersLabel: "查看我的回答",
    emailUpdateSummaryLoadError:
      "無法載入電子郵件更新選項。你可以重試，或繼續且不儲存選擇。",
    retryLabel: "重試",
    emailUpdatePreferenceSaveError: "無法儲存你的電子郵件更新選擇。請重試。",
    continueWithoutSavingLabel: "繼續且不儲存電子郵件更新選擇",
  },
};
