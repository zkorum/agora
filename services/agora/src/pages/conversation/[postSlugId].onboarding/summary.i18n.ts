import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ConversationSurveySummaryTranslations {
  failedToLoadSurveyTitle: string;
  tryAgainLabel: string;
  reviewAnswersTitle: string;
  continueSurveyTitle: string;
  summaryDescriptionComplete: string;
  summaryDescriptionPending: string;
  questionStatusSaved: string;
  questionStatusPassed: string;
  questionStatusNeedsUpdate: string;
  questionStatusRequiredMissing: string;
  questionStatusNotAnswered: string;
  editAnswerLabel: string;
  withdrawResponseLabel: string;
  withdrawDialogCancelLabel: string;
  confirmWithdrawMessage: string;
  confirmRequiredWithdrawMessage: string;
  failedToWithdrawMessage: string;
}

export const conversationSurveySummaryTranslations: Record<
  SupportedDisplayLanguageCodes,
  ConversationSurveySummaryTranslations
> = {
  en: {
    failedToLoadSurveyTitle: "Failed to load survey",
    tryAgainLabel: "Try again",
    reviewAnswersTitle: "Review your answers",
    continueSurveyTitle: "Continue your survey",
    summaryDescriptionComplete:
      "Review or edit your survey answers before going back to the conversation.",
    summaryDescriptionPending:
      "Some questions still need attention before participation is fully unlocked.",
    questionStatusSaved: "Saved",
    questionStatusPassed: "Passed",
    questionStatusNeedsUpdate: "Needs update",
    questionStatusRequiredMissing: "Required",
    questionStatusNotAnswered: "Not answered",
    editAnswerLabel: "Edit",
    withdrawResponseLabel: "Withdraw response",
    withdrawDialogCancelLabel: "Cancel",
    confirmWithdrawMessage:
      "Withdraw your answers to this optional survey? Your votes will still count if otherwise eligible.",
    confirmRequiredWithdrawMessage:
      "Withdraw your answers to this required survey? Your votes will be excluded from new calculations that use currently eligible votes. This does not erase saved results.",
    failedToWithdrawMessage: "Failed to withdraw your survey response.",
  },
  ar: {
    failedToLoadSurveyTitle: "فشل تحميل الاستبيان",
    tryAgainLabel: "حاول مرة أخرى",
    reviewAnswersTitle: "راجع إجاباتك",
    continueSurveyTitle: "واصل استبيانك",
    summaryDescriptionComplete: "إجابات الاستبيان الخاصة بك محفوظة ومحدّثة.",
    summaryDescriptionPending:
      "لا تزال بعض الأسئلة تحتاج إلى انتباه قبل فتح المشاركة بالكامل.",
    questionStatusSaved: "محفوظ",
    questionStatusPassed: "تم التخطي",
    questionStatusNeedsUpdate: "يحتاج إلى تحديث",
    questionStatusRequiredMissing: "مطلوب",
    questionStatusNotAnswered: "غير مُجاب عليه",
    editAnswerLabel: "تعديل",
    withdrawResponseLabel: "سحب الرد",
    withdrawDialogCancelLabel: "إلغاء",
    confirmWithdrawMessage:
      "هل تريد سحب إجاباتك من هذا الاستبيان الاختياري؟ سيستمر احتساب أصواتك إذا استوفت الشروط الأخرى.",
    confirmRequiredWithdrawMessage:
      "هل تريد سحب إجاباتك من هذا الاستبيان الإلزامي؟ ستُستبعد أصواتك من الحسابات الجديدة القائمة على الأصوات المؤهلة حاليًا. لن تُمحى النتائج المحفوظة.",
    failedToWithdrawMessage: "فشل سحب رد الاستبيان الخاص بك.",
  },
  es: {
    failedToLoadSurveyTitle: "No se pudo cargar la encuesta",
    tryAgainLabel: "Intentar de nuevo",
    reviewAnswersTitle: "Revise sus respuestas",
    continueSurveyTitle: "Continúe su encuesta",
    summaryDescriptionComplete:
      "Sus respuestas a la encuesta están guardadas y actualizadas.",
    summaryDescriptionPending:
      "Algunas preguntas aún requieren atención antes de desbloquear totalmente la participación.",
    questionStatusSaved: "Guardada",
    questionStatusPassed: "Omitida",
    questionStatusNeedsUpdate: "Necesita actualización",
    questionStatusRequiredMissing: "Obligatoria",
    questionStatusNotAnswered: "Sin responder",
    editAnswerLabel: "Editar",
    withdrawResponseLabel: "Retirar respuesta",
    withdrawDialogCancelLabel: "Cancelar",
    confirmWithdrawMessage:
      "¿Retirar tus respuestas a esta encuesta opcional? Tus votos seguirán contando si cumplen los demás requisitos.",
    confirmRequiredWithdrawMessage:
      "¿Retirar tus respuestas a esta encuesta obligatoria? Tus votos quedarán fuera de los nuevos cálculos que usen votos actualmente válidos. Los resultados guardados no se borrarán.",
    failedToWithdrawMessage: "No se pudo retirar su respuesta de la encuesta.",
  },
  fa: {
    failedToLoadSurveyTitle: "بارگیری نظرسنجی انجام نشد",
    tryAgainLabel: "تلاش دوباره",
    reviewAnswersTitle: "پاسخ‌های خود را مرور کنید",
    continueSurveyTitle: "نظرسنجی خود را ادامه دهید",
    summaryDescriptionComplete:
      "پاسخ‌های نظرسنجی شما ذخیره شده و به‌روز هستند.",
    summaryDescriptionPending:
      "پیش از باز شدن کامل مشارکت، بعضی پرسش‌ها هنوز نیاز به توجه دارند.",
    questionStatusSaved: "ذخیره شده",
    questionStatusPassed: "صرف‌نظر شده",
    questionStatusNeedsUpdate: "نیاز به به‌روزرسانی دارد",
    questionStatusRequiredMissing: "الزامی",
    questionStatusNotAnswered: "پاسخ داده نشده",
    editAnswerLabel: "ویرایش",
    withdrawResponseLabel: "پس گرفتن پاسخ",
    withdrawDialogCancelLabel: "لغو",
    confirmWithdrawMessage:
      "پاسخ‌هایتان را از این نظرسنجی اختیاری پس می‌گیرید؟ اگر رأی‌هایتان سایر شرایط را داشته باشند، همچنان شمرده می‌شوند.",
    confirmRequiredWithdrawMessage:
      "پاسخ‌هایتان را از این نظرسنجی اجباری پس می‌گیرید؟ رأی‌هایتان از محاسبات جدید مبتنی بر رأی‌های واجد شرایط فعلی کنار گذاشته می‌شوند. نتایج ذخیره‌شده پاک نمی‌شوند.",
    failedToWithdrawMessage: "پس گرفتن پاسخ نظرسنجی شما انجام نشد.",
  },
  fr: {
    failedToLoadSurveyTitle: "Impossible de charger le questionnaire",
    tryAgainLabel: "Réessayer",
    reviewAnswersTitle: "Vérifiez vos réponses",
    continueSurveyTitle: "Continuez votre questionnaire",
    summaryDescriptionComplete:
      "Vos réponses au questionnaire sont enregistrées et à jour.",
    summaryDescriptionPending:
      "Certaines questions demandent encore votre attention avant de débloquer complètement la participation.",
    questionStatusSaved: "Enregistré",
    questionStatusPassed: "Ignorée",
    questionStatusNeedsUpdate: "À mettre à jour",
    questionStatusRequiredMissing: "Requis",
    questionStatusNotAnswered: "Sans réponse",
    editAnswerLabel: "Modifier",
    withdrawResponseLabel: "Retirer la réponse",
    withdrawDialogCancelLabel: "Annuler",
    confirmWithdrawMessage:
      "Retirer vos réponses à ce questionnaire facultatif ? Vos votes resteront pris en compte s’ils remplissent les autres conditions.",
    confirmRequiredWithdrawMessage:
      "Retirer vos réponses à ce questionnaire obligatoire ? Vos votes seront exclus des nouveaux calculs fondés sur les votes actuellement admissibles. Les résultats enregistrés ne seront pas effacés.",
    failedToWithdrawMessage:
      "Impossible de retirer votre réponse au questionnaire.",
  },
  he: {
    failedToLoadSurveyTitle: "טעינת הסקר נכשלה",
    tryAgainLabel: "לנסות שוב",
    reviewAnswersTitle: "עברו על התשובות שלכם",
    continueSurveyTitle: "המשיכו את הסקר שלכם",
    summaryDescriptionComplete: "תשובות הסקר שלכם שמורות ומעודכנות.",
    summaryDescriptionPending:
      "כמה שאלות עדיין דורשות תשומת לב לפני שההשתתפות תיפתח במלואה.",
    questionStatusSaved: "נשמר",
    questionStatusPassed: "דולג",
    questionStatusNeedsUpdate: "דורש עדכון",
    questionStatusRequiredMissing: "נדרש",
    questionStatusNotAnswered: "לא נענה",
    editAnswerLabel: "עריכה",
    withdrawResponseLabel: "משיכת התגובה",
    withdrawDialogCancelLabel: "ביטול",
    confirmWithdrawMessage:
      "למשוך את התשובות שלך לסקר הרשות? ההצבעות שלך עדיין ייספרו אם הן עומדות בשאר התנאים.",
    confirmRequiredWithdrawMessage:
      "למשוך את התשובות שלך לסקר החובה? ההצבעות שלך לא ייכללו בחישובים חדשים המבוססים על ההצבעות הכשירות כעת. תוצאות שמורות לא יימחקו.",
    failedToWithdrawMessage: "משיכת תגובת הסקר נכשלה.",
  },
  ja: {
    failedToLoadSurveyTitle: "アンケートを読み込めませんでした",
    tryAgainLabel: "もう一度試す",
    reviewAnswersTitle: "回答を確認してください",
    continueSurveyTitle: "アンケートを続けてください",
    summaryDescriptionComplete: "アンケートの回答は保存され、最新の状態です。",
    summaryDescriptionPending:
      "参加が完全に解放される前に、まだ確認が必要な質問があります。",
    questionStatusSaved: "保存済み",
    questionStatusPassed: "スキップ済み",
    questionStatusNeedsUpdate: "更新が必要",
    questionStatusRequiredMissing: "必須",
    questionStatusNotAnswered: "未回答",
    editAnswerLabel: "編集",
    withdrawResponseLabel: "回答を取り下げる",
    withdrawDialogCancelLabel: "キャンセル",
    confirmWithdrawMessage:
      "この任意アンケートへの回答を取り下げますか？ 他の条件を満たしていれば、投票は引き続き集計されます。",
    confirmRequiredWithdrawMessage:
      "この必須アンケートへの回答を取り下げますか？ 現在有効な票を使う今後の集計から、あなたの投票が除外されます。保存済みの結果は消去されません。",
    failedToWithdrawMessage: "アンケート回答を取り下げられませんでした。",
  },
  ky: {
    failedToLoadSurveyTitle: "Сурамжылоону жүктөө ишке ашкан жок",
    tryAgainLabel: "Кайра аракет кылуу",
    reviewAnswersTitle: "Жоопторуңузду карап чыгыңыз",
    continueSurveyTitle: "Сурамжылоону улантыңыз",
    summaryDescriptionComplete:
      "Талкууга кайтардан мурун сурамжылоодогу жоопторуңузду карап чыгыңыз же түзөтүңүз.",
    summaryDescriptionPending:
      "Катышуу толук ачылышы үчүн айрым суроолор дагы эле көңүл бурууну талап кылат.",
    questionStatusSaved: "Сакталган",
    questionStatusPassed: "Өткөрүп жиберилген",
    questionStatusNeedsUpdate: "Жаңыртуу керек",
    questionStatusRequiredMissing: "Милдеттүү",
    questionStatusNotAnswered: "Жооп берилген эмес",
    editAnswerLabel: "Түзөтүү",
    withdrawResponseLabel: "Жоопту кайтарып алуу",
    withdrawDialogCancelLabel: "Жокко чыгаруу",
    confirmWithdrawMessage:
      "Бул ыктыярдуу сурамжылоодогу жоопторуңузду кайтарып аласызбы? Башка шарттар аткарылса, добуштарыңыз эсептеле берет.",
    confirmRequiredWithdrawMessage:
      "Бул милдеттүү сурамжылоодогу жоопторуңузду кайтарып аласызбы? Добуштарыңыз учурда жарактуу добуштар боюнча жаңы эсептөөлөргө кирбей калат. Сакталган жыйынтыктар өчүрүлбөйт.",
    failedToWithdrawMessage:
      "Сурамжылоо жообуңузду кайтарып алуу ишке ашкан жок.",
  },
  ru: {
    failedToLoadSurveyTitle: "Не удалось загрузить опрос",
    tryAgainLabel: "Попробовать снова",
    reviewAnswersTitle: "Проверьте свои ответы",
    continueSurveyTitle: "Продолжите опрос",
    summaryDescriptionComplete:
      "Просмотрите или измените свои ответы на опрос, прежде чем вернуться к обсуждению.",
    summaryDescriptionPending:
      "Некоторые вопросы всё ещё требуют внимания, прежде чем участие будет полностью открыто.",
    questionStatusSaved: "Сохранено",
    questionStatusPassed: "Пропущено",
    questionStatusNeedsUpdate: "Требует обновления",
    questionStatusRequiredMissing: "Обязательно",
    questionStatusNotAnswered: "Без ответа",
    editAnswerLabel: "Изменить",
    withdrawResponseLabel: "Отозвать ответ",
    withdrawDialogCancelLabel: "Отмена",
    confirmWithdrawMessage:
      "Отозвать ответы на этот необязательный опрос? Ваши голоса по-прежнему будут учитываться, если выполнены остальные условия.",
    confirmRequiredWithdrawMessage:
      "Отозвать ответы на этот обязательный опрос? Ваши голоса будут исключены из новых расчётов по голосам, действительным на момент расчёта. Сохранённые результаты не удалятся.",
    failedToWithdrawMessage: "Не удалось отозвать ваш ответ на опрос.",
  },
  "zh-Hans": {
    failedToLoadSurveyTitle: "无法加载问卷",
    tryAgainLabel: "重试",
    reviewAnswersTitle: "查看你的回答",
    continueSurveyTitle: "继续你的问卷",
    summaryDescriptionComplete: "你的问卷回答已保存并保持最新。",
    summaryDescriptionPending: "在完全解锁参与之前，仍有一些问题需要处理。",
    questionStatusSaved: "已保存",
    questionStatusPassed: "已跳过",
    questionStatusNeedsUpdate: "需要更新",
    questionStatusRequiredMissing: "必答",
    questionStatusNotAnswered: "未回答",
    editAnswerLabel: "编辑",
    withdrawResponseLabel: "撤回回答",
    withdrawDialogCancelLabel: "取消",
    confirmWithdrawMessage:
      "要撤回这份选填问卷的回答吗？只要符合其他条件，您的投票仍会计入结果。",
    confirmRequiredWithdrawMessage:
      "要撤回这份必填问卷的回答吗？以当前有效票数为依据的新计算将不再计入您的投票。已保存的结果不会被删除。",
    failedToWithdrawMessage: "无法撤回你的问卷回答。",
  },
  "zh-Hant": {
    failedToLoadSurveyTitle: "無法載入問卷",
    tryAgainLabel: "重試",
    reviewAnswersTitle: "查看你的回答",
    continueSurveyTitle: "繼續你的問卷",
    summaryDescriptionComplete: "你的問卷回答已儲存並保持最新。",
    summaryDescriptionPending: "在完全解鎖參與之前，仍有一些問題需要處理。",
    questionStatusSaved: "已儲存",
    questionStatusPassed: "已略過",
    questionStatusNeedsUpdate: "需要更新",
    questionStatusRequiredMissing: "必答",
    questionStatusNotAnswered: "未回答",
    editAnswerLabel: "編輯",
    withdrawResponseLabel: "撤回回答",
    withdrawDialogCancelLabel: "取消",
    confirmWithdrawMessage:
      "要撤回這份選填問卷的回答嗎？只要符合其他條件，您的投票仍會計入結果。",
    confirmRequiredWithdrawMessage:
      "要撤回這份必填問卷的回答嗎？以目前有效票數為依據的新計算將不再計入您的投票。已儲存的結果不會被刪除。",
    failedToWithdrawMessage: "無法撤回你的問卷回答。",
  },
};
