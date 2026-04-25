import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ConversationRequirementBannerTranslations {
  requiredAccessTitle: string;
  requiredAccessMessage: string;
  surveyAvailableTitle: string;
  surveyCompleteTitle: string;
  surveyUpdateTitle: string;
  surveyWithdrawnTitle: string;
  surveyInProgressTitle: string;
  optionalSurveyTitle: string;
  requiredSurveyTitle: string;
  surveyUnavailableTitle: string;
  ticketRequiredTitle: string;
  ticketVerifiedTitle: string;
  openViaOnboardingMessage: string;
  verifyTicketMessage: string;
  ticketRequiredMessage: string;
  ticketVerifiedMessage: string;
  surveyUpToDateMessage: string;
  surveyChangedMessage: string;
  surveyWithdrawnMessage: string;
  surveyInProgressAvailableMessage: string;
  surveyInProgressRequiredMessage: string;
  optionalSurveyMessage: string;
  requiredSurveyMessage: string;
  continueLabel: string;
  reviewAnswersLabel: string;
  updateAnswersLabel: string;
  resumeSurveyLabel: string;
  continueSurveyLabel: string;
  openSurveyLabel: string;
  startSurveyLabel: string;
}

export const conversationRequirementBannerTranslations: Record<
  SupportedDisplayLanguageCodes,
  ConversationRequirementBannerTranslations
> = {
  en: {
    requiredAccessTitle: "Complete required steps",
    requiredAccessMessage:
      "Complete the required access steps, then continue to the survey.",
    surveyAvailableTitle: "Survey available",
    surveyCompleteTitle: "Survey complete",
    surveyUpdateTitle: "Survey update needed",
    surveyWithdrawnTitle: "Survey response withdrawn",
    surveyInProgressTitle: "Survey in progress",
    optionalSurveyTitle: "Optional survey",
    requiredSurveyTitle: "Survey required",
    surveyUnavailableTitle: "Survey unavailable",
    ticketRequiredTitle: "Ticket verification required",
    ticketVerifiedTitle: "Ticket verified",
    openViaOnboardingMessage:
      "Continue through onboarding to open this conversation survey.",
    verifyTicketMessage:
      "Verify your event ticket first, then continue to the survey.",
    ticketRequiredMessage:
      "Verify your event ticket before participating in this conversation.",
    ticketVerifiedMessage:
      "Your event ticket is verified for this conversation.",
    surveyUpToDateMessage:
      "Your answers are up to date for this conversation.",
    surveyChangedMessage:
      "This survey changed. Update your answers to keep participating.",
    surveyWithdrawnMessage:
      "Resume the survey if you want to participate again.",
    surveyInProgressAvailableMessage:
      "You can continue or review your saved answers anytime.",
    surveyInProgressRequiredMessage:
      "Continue the survey to unlock participation in this conversation.",
    optionalSurveyMessage:
      "This conversation has a survey you can fill out anytime.",
    requiredSurveyMessage:
      "Complete the survey before you participate in this conversation.",
    continueLabel: "Continue",
    reviewAnswersLabel: "Review answers",
    updateAnswersLabel: "Update answers",
    resumeSurveyLabel: "Resume survey",
    continueSurveyLabel: "Continue survey",
    openSurveyLabel: "Open survey",
    startSurveyLabel: "Start survey",
  },
  ar: {
    requiredAccessTitle: "أكمل الخطوات المطلوبة",
    requiredAccessMessage:
      "أكمل خطوات الوصول المطلوبة ثم تابع إلى الاستبيان.",
    surveyAvailableTitle: "الاستبيان متاح",
    surveyCompleteTitle: "الاستبيان مكتمل",
    surveyUpdateTitle: "يلزم تحديث الاستبيان",
    surveyWithdrawnTitle: "تم سحب رد الاستبيان",
    surveyInProgressTitle: "الاستبيان قيد التقدم",
    optionalSurveyTitle: "استبيان اختياري",
    requiredSurveyTitle: "الاستبيان مطلوب",
    surveyUnavailableTitle: "الاستبيان غير متاح",
    ticketRequiredTitle: "يلزم التحقق من التذكرة",
    ticketVerifiedTitle: "تم التحقق من التذكرة",
    openViaOnboardingMessage:
      "تابع عبر مسار الانضمام لفتح استبيان هذه المحادثة.",
    verifyTicketMessage:
      "تحقق من تذكرة الحدث أولاً ثم تابع إلى الاستبيان.",
    ticketRequiredMessage:
      "تحقق من تذكرة الحدث قبل المشاركة في هذه المحادثة.",
    ticketVerifiedMessage:
      "تم التحقق من تذكرة الحدث الخاصة بك لهذه المحادثة.",
    surveyUpToDateMessage:
      "إجاباتك محدثة لهذه المحادثة.",
    surveyChangedMessage:
      "تغير هذا الاستبيان. حدّث إجاباتك لمواصلة المشاركة.",
    surveyWithdrawnMessage:
      "استأنف الاستبيان إذا أردت المشاركة مرة أخرى.",
    surveyInProgressAvailableMessage:
      "يمكنك المتابعة أو مراجعة إجاباتك المحفوظة في أي وقت.",
    surveyInProgressRequiredMessage:
      "تابع الاستبيان لفتح المشاركة في هذه المحادثة.",
    optionalSurveyMessage:
      "تحتوي هذه المحادثة على استبيان يمكنك تعبئته في أي وقت.",
    requiredSurveyMessage:
      "أكمل الاستبيان قبل المشاركة في هذه المحادثة.",
    continueLabel: "متابعة",
    reviewAnswersLabel: "مراجعة الإجابات",
    updateAnswersLabel: "تحديث الإجابات",
    resumeSurveyLabel: "استئناف الاستبيان",
    continueSurveyLabel: "متابعة الاستبيان",
    openSurveyLabel: "فتح الاستبيان",
    startSurveyLabel: "بدء الاستبيان",
  },
  es: {
    requiredAccessTitle: "Completa los pasos requeridos",
    requiredAccessMessage:
      "Completa los pasos de acceso requeridos y luego continúa a la encuesta.",
    surveyAvailableTitle: "Encuesta disponible",
    surveyCompleteTitle: "Encuesta completada",
    surveyUpdateTitle: "La encuesta necesita actualización",
    surveyWithdrawnTitle: "La respuesta de la encuesta fue retirada",
    surveyInProgressTitle: "Encuesta en progreso",
    optionalSurveyTitle: "Encuesta opcional",
    requiredSurveyTitle: "Encuesta obligatoria",
    surveyUnavailableTitle: "Encuesta no disponible",
    ticketRequiredTitle: "Se requiere verificación del boleto",
    ticketVerifiedTitle: "Boleto verificado",
    openViaOnboardingMessage:
      "Continúa por el flujo de acceso para abrir la encuesta de esta conversación.",
    verifyTicketMessage:
      "Verifica primero tu boleto del evento y luego continúa a la encuesta.",
    ticketRequiredMessage:
      "Verifica tu boleto del evento antes de participar en esta conversación.",
    ticketVerifiedMessage:
      "Tu boleto del evento está verificado para esta conversación.",
    surveyUpToDateMessage:
      "Tus respuestas están actualizadas para esta conversación.",
    surveyChangedMessage:
      "Esta encuesta cambió. Actualiza tus respuestas para seguir participando.",
    surveyWithdrawnMessage:
      "Reanuda la encuesta si quieres participar de nuevo.",
    surveyInProgressAvailableMessage:
      "Puedes continuar o revisar tus respuestas guardadas en cualquier momento.",
    surveyInProgressRequiredMessage:
      "Continúa la encuesta para desbloquear la participación en esta conversación.",
    optionalSurveyMessage:
      "Esta conversación tiene una encuesta que puedes completar cuando quieras.",
    requiredSurveyMessage:
      "Completa la encuesta antes de participar en esta conversación.",
    continueLabel: "Continuar",
    reviewAnswersLabel: "Revisar respuestas",
    updateAnswersLabel: "Actualizar respuestas",
    resumeSurveyLabel: "Reanudar encuesta",
    continueSurveyLabel: "Continuar encuesta",
    openSurveyLabel: "Abrir encuesta",
    startSurveyLabel: "Comenzar encuesta",
  },
  fa: {
    requiredAccessTitle: "مراحل لازم را کامل کنید",
    requiredAccessMessage:
      "مراحل لازم برای دسترسی را کامل کنید، سپس به نظرسنجی ادامه دهید.",
    surveyAvailableTitle: "نظرسنجی در دسترس است",
    surveyCompleteTitle: "نظرسنجی کامل شد",
    surveyUpdateTitle: "نظرسنجی نیاز به به‌روزرسانی دارد",
    surveyWithdrawnTitle: "پاسخ نظرسنجی پس گرفته شده است",
    surveyInProgressTitle: "نظرسنجی در حال انجام است",
    optionalSurveyTitle: "نظرسنجی اختیاری",
    requiredSurveyTitle: "نظرسنجی الزامی است",
    surveyUnavailableTitle: "نظرسنجی در دسترس نیست",
    ticketRequiredTitle: "تأیید بلیت لازم است",
    ticketVerifiedTitle: "بلیت تأیید شد",
    openViaOnboardingMessage:
      "برای باز کردن نظرسنجی این گفتگو از مسیر ورود ادامه دهید.",
    verifyTicketMessage:
      "ابتدا بلیت رویداد خود را تأیید کنید و سپس به نظرسنجی ادامه دهید.",
    ticketRequiredMessage:
      "پیش از مشارکت در این گفتگو، بلیت رویداد خود را تأیید کنید.",
    ticketVerifiedMessage:
      "بلیت رویداد شما برای این گفتگو تأیید شده است.",
    surveyUpToDateMessage:
      "پاسخ‌های شما برای این گفتگو به‌روز هستند.",
    surveyChangedMessage:
      "این نظرسنجی تغییر کرده است. برای ادامه مشارکت پاسخ‌های خود را به‌روزرسانی کنید.",
    surveyWithdrawnMessage:
      "اگر می‌خواهید دوباره مشارکت کنید، نظرسنجی را از سر بگیرید.",
    surveyInProgressAvailableMessage:
      "می‌توانید هر زمان پاسخ‌های ذخیره‌شده خود را ادامه دهید یا بازبینی کنید.",
    surveyInProgressRequiredMessage:
      "برای باز شدن امکان مشارکت در این گفتگو، نظرسنجی را ادامه دهید.",
    optionalSurveyMessage:
      "این گفتگو یک نظرسنجی دارد که هر زمان بخواهید می‌توانید آن را تکمیل کنید.",
    requiredSurveyMessage:
      "پیش از مشارکت در این گفتگو، نظرسنجی را کامل کنید.",
    continueLabel: "ادامه",
    reviewAnswersLabel: "بازبینی پاسخ‌ها",
    updateAnswersLabel: "به‌روزرسانی پاسخ‌ها",
    resumeSurveyLabel: "ادامه نظرسنجی",
    continueSurveyLabel: "ادامه نظرسنجی",
    openSurveyLabel: "باز کردن نظرسنجی",
    startSurveyLabel: "شروع نظرسنجی",
  },
  fr: {
    requiredAccessTitle: "Terminez les étapes requises",
    requiredAccessMessage:
      "Terminez les étapes d'accès requises, puis continuez vers le questionnaire.",
    surveyAvailableTitle: "Questionnaire disponible",
    surveyCompleteTitle: "Questionnaire terminé",
    surveyUpdateTitle: "Le questionnaire doit être mis à jour",
    surveyWithdrawnTitle: "La réponse au questionnaire a été retirée",
    surveyInProgressTitle: "Questionnaire en cours",
    optionalSurveyTitle: "Questionnaire facultatif",
    requiredSurveyTitle: "Questionnaire requis",
    surveyUnavailableTitle: "Questionnaire indisponible",
    ticketRequiredTitle: "Vérification du billet requise",
    ticketVerifiedTitle: "Billet vérifié",
    openViaOnboardingMessage:
      "Passez par le parcours d'accès pour ouvrir le questionnaire de cette conversation.",
    verifyTicketMessage:
      "Vérifiez d'abord votre billet d'événement, puis continuez vers le questionnaire.",
    ticketRequiredMessage:
      "Vérifiez votre billet d'événement avant de participer à cette conversation.",
    ticketVerifiedMessage:
      "Votre billet d'événement est vérifié pour cette conversation.",
    surveyUpToDateMessage:
      "Vos réponses sont à jour pour cette conversation.",
    surveyChangedMessage:
      "Ce questionnaire a changé. Mettez vos réponses à jour pour continuer à participer.",
    surveyWithdrawnMessage:
      "Reprenez le questionnaire si vous souhaitez participer à nouveau.",
    surveyInProgressAvailableMessage:
      "Vous pouvez continuer ou revoir vos réponses enregistrées à tout moment.",
    surveyInProgressRequiredMessage:
      "Continuez le questionnaire pour débloquer la participation à cette conversation.",
    optionalSurveyMessage:
      "Cette conversation comporte un questionnaire que vous pouvez remplir à tout moment.",
    requiredSurveyMessage:
      "Terminez le questionnaire avant de participer à cette conversation.",
    continueLabel: "Continuer",
    reviewAnswersLabel: "Voir les réponses",
    updateAnswersLabel: "Mettre à jour les réponses",
    resumeSurveyLabel: "Reprendre le questionnaire",
    continueSurveyLabel: "Continuer le questionnaire",
    openSurveyLabel: "Ouvrir le questionnaire",
    startSurveyLabel: "Commencer le questionnaire",
  },
  he: {
    requiredAccessTitle: "השלימו את השלבים הנדרשים",
    requiredAccessMessage:
      "השלימו את שלבי הגישה הנדרשים ואז המשיכו לסקר.",
    surveyAvailableTitle: "הסקר זמין",
    surveyCompleteTitle: "הסקר הושלם",
    surveyUpdateTitle: "צריך לעדכן את הסקר",
    surveyWithdrawnTitle: "תגובת הסקר נמשכה",
    surveyInProgressTitle: "הסקר בתהליך",
    optionalSurveyTitle: "סקר אופציונלי",
    requiredSurveyTitle: "הסקר נדרש",
    surveyUnavailableTitle: "הסקר לא זמין",
    ticketRequiredTitle: "נדרש אימות כרטיס",
    ticketVerifiedTitle: "הכרטיס אומת",
    openViaOnboardingMessage:
      "המשיכו דרך תהליך ההצטרפות כדי לפתוח את הסקר של השיחה הזו.",
    verifyTicketMessage:
      "אמתו קודם את כרטיס האירוע ואז המשיכו לסקר.",
    ticketRequiredMessage:
      "אמתו את כרטיס האירוע לפני שתשתתפו בשיחה הזו.",
    ticketVerifiedMessage:
      "כרטיס האירוע שלכם אומת עבור השיחה הזו.",
    surveyUpToDateMessage:
      "התשובות שלכם מעודכנות לשיחה הזו.",
    surveyChangedMessage:
      "הסקר הזה השתנה. עדכנו את התשובות שלכם כדי להמשיך להשתתף.",
    surveyWithdrawnMessage:
      "חזרו לסקר אם תרצו להשתתף שוב.",
    surveyInProgressAvailableMessage:
      "אפשר להמשיך או לעבור על התשובות השמורות שלכם בכל זמן.",
    surveyInProgressRequiredMessage:
      "המשיכו את הסקר כדי לפתוח השתתפות בשיחה הזו.",
    optionalSurveyMessage:
      "לשיחה הזו יש סקר שאפשר למלא בכל זמן.",
    requiredSurveyMessage:
      "השלימו את הסקר לפני שתשתתפו בשיחה הזו.",
    continueLabel: "המשך",
    reviewAnswersLabel: "עיון בתשובות",
    updateAnswersLabel: "עדכון תשובות",
    resumeSurveyLabel: "המשך הסקר",
    continueSurveyLabel: "המשך הסקר",
    openSurveyLabel: "פתיחת הסקר",
    startSurveyLabel: "התחלת הסקר",
  },
  ja: {
    requiredAccessTitle: "必要な手順を完了してください",
    requiredAccessMessage:
      "必要なアクセス手順を完了してからアンケートに進んでください。",
    surveyAvailableTitle: "アンケートがあります",
    surveyCompleteTitle: "アンケート完了",
    surveyUpdateTitle: "アンケートの更新が必要です",
    surveyWithdrawnTitle: "アンケート回答は取り下げられました",
    surveyInProgressTitle: "アンケート回答中",
    optionalSurveyTitle: "任意のアンケート",
    requiredSurveyTitle: "必須アンケート",
    surveyUnavailableTitle: "アンケートは利用できません",
    ticketRequiredTitle: "チケット確認が必要です",
    ticketVerifiedTitle: "チケット確認済み",
    openViaOnboardingMessage:
      "この会話のアンケートを開くにはオンボーディングを続けてください。",
    verifyTicketMessage:
      "先にイベントチケットを確認してからアンケートに進んでください。",
    ticketRequiredMessage:
      "この会話に参加する前にイベントチケットを確認してください。",
    ticketVerifiedMessage:
      "この会話ではイベントチケットが確認済みです。",
    surveyUpToDateMessage:
      "この会話に対するあなたの回答は最新です。",
    surveyChangedMessage:
      "このアンケートは変更されました。参加を続けるには回答を更新してください。",
    surveyWithdrawnMessage:
      "もう一度参加したい場合はアンケートを再開してください。",
    surveyInProgressAvailableMessage:
      "保存した回答はいつでも続きから再開したり見直したりできます。",
    surveyInProgressRequiredMessage:
      "この会話に参加するにはアンケートを続けてください。",
    optionalSurveyMessage:
      "この会話にはいつでも回答できるアンケートがあります。",
    requiredSurveyMessage:
      "この会話に参加する前にアンケートを完了してください。",
    continueLabel: "続ける",
    reviewAnswersLabel: "回答を確認",
    updateAnswersLabel: "回答を更新",
    resumeSurveyLabel: "アンケートを再開",
    continueSurveyLabel: "アンケートを続ける",
    openSurveyLabel: "アンケートを開く",
    startSurveyLabel: "アンケートを開始",
  },
  ky: {
    requiredAccessTitle: "Талап кылынган кадамдарды бүтүрүңүз",
    requiredAccessMessage:
      "Талап кылынган жетүү кадамдарын бүтүрүп, андан кийин сурамжылоого өтүңүз.",
    surveyAvailableTitle: "Сурамжылоо жеткиликтүү",
    surveyCompleteTitle: "Сурамжылоо аяктады",
    surveyUpdateTitle: "Сурамжылоону жаңыртуу керек",
    surveyWithdrawnTitle: "Сурамжылоо жообу кайтарылып алынды",
    surveyInProgressTitle: "Сурамжылоо жүрүп жатат",
    optionalSurveyTitle: "Ыктыярдуу сурамжылоо",
    requiredSurveyTitle: "Сурамжылоо милдеттүү",
    surveyUnavailableTitle: "Сурамжылоо жеткиликсиз",
    ticketRequiredTitle: "Билетти текшерүү талап кылынат",
    ticketVerifiedTitle: "Билет текшерилди",
    openViaOnboardingMessage:
      "Бул сүйлөшүүнүн сурамжылоосун ачуу үчүн кирүү агымын улантыңыз.",
    verifyTicketMessage:
      "Алгач иш-чара билетиңизди текшерип, андан кийин сурамжылоого өтүңүз.",
    ticketRequiredMessage:
      "Бул сүйлөшүүгө катышуудан мурун иш-чара билетиңизди текшериңиз.",
    ticketVerifiedMessage:
      "Бул сүйлөшүү үчүн иш-чара билетиңиз текшерилди.",
    surveyUpToDateMessage:
      "Бул сүйлөшүү үчүн жоопторуңуз актуалдуу.",
    surveyChangedMessage:
      "Бул сурамжылоо өзгөрдү. Катышууну улантуу үчүн жоопторуңузду жаңыртыңыз.",
    surveyWithdrawnMessage:
      "Кайра катышкыңыз келсе, сурамжылоону улантыңыз.",
    surveyInProgressAvailableMessage:
      "Сакталган жоопторуңузду каалаган убакта улантып же карап чыга аласыз.",
    surveyInProgressRequiredMessage:
      "Бул сүйлөшүүгө катышуу үчүн сурамжылоону улантыңыз.",
    optionalSurveyMessage:
      "Бул сүйлөшүүдө каалаган убакта толтура турган сурамжылоо бар.",
    requiredSurveyMessage:
      "Бул сүйлөшүүгө катышуудан мурун сурамжылоону толтуруңуз.",
    continueLabel: "Улантуу",
    reviewAnswersLabel: "Жоопторду көрүү",
    updateAnswersLabel: "Жоопторду жаңыртуу",
    resumeSurveyLabel: "Сурамжылоону улантуу",
    continueSurveyLabel: "Сурамжылоону улантуу",
    openSurveyLabel: "Сурамжылоону ачуу",
    startSurveyLabel: "Сурамжылоону баштоо",
  },
  ru: {
    requiredAccessTitle: "Выполните обязательные шаги",
    requiredAccessMessage:
      "Выполните обязательные шаги доступа, затем перейдите к опросу.",
    surveyAvailableTitle: "Опрос доступен",
    surveyCompleteTitle: "Опрос завершён",
    surveyUpdateTitle: "Опрос нужно обновить",
    surveyWithdrawnTitle: "Ответ на опрос отозван",
    surveyInProgressTitle: "Опрос в процессе",
    optionalSurveyTitle: "Необязательный опрос",
    requiredSurveyTitle: "Опрос обязателен",
    surveyUnavailableTitle: "Опрос недоступен",
    ticketRequiredTitle: "Требуется проверка билета",
    ticketVerifiedTitle: "Билет подтверждён",
    openViaOnboardingMessage:
      "Продолжите через поток доступа, чтобы открыть опрос этой беседы.",
    verifyTicketMessage:
      "Сначала подтвердите билет на событие, затем переходите к опросу.",
    ticketRequiredMessage:
      "Подтвердите билет на событие перед участием в этой беседе.",
    ticketVerifiedMessage:
      "Ваш билет на событие подтверждён для этой беседы.",
    surveyUpToDateMessage:
      "Ваши ответы для этой беседы актуальны.",
    surveyChangedMessage:
      "Этот опрос изменился. Обновите ответы, чтобы продолжить участие.",
    surveyWithdrawnMessage:
      "Возобновите опрос, если хотите снова участвовать.",
    surveyInProgressAvailableMessage:
      "Вы можете в любое время продолжить или просмотреть сохранённые ответы.",
    surveyInProgressRequiredMessage:
      "Продолжите опрос, чтобы разблокировать участие в этой беседе.",
    optionalSurveyMessage:
      "В этой беседе есть опрос, который можно заполнить в любое время.",
    requiredSurveyMessage:
      "Завершите опрос, прежде чем участвовать в этой беседе.",
    continueLabel: "Продолжить",
    reviewAnswersLabel: "Просмотреть ответы",
    updateAnswersLabel: "Обновить ответы",
    resumeSurveyLabel: "Возобновить опрос",
    continueSurveyLabel: "Продолжить опрос",
    openSurveyLabel: "Открыть опрос",
    startSurveyLabel: "Начать опрос",
  },
  "zh-Hans": {
    requiredAccessTitle: "请完成必需步骤",
    requiredAccessMessage:
      "请先完成所需的访问步骤，然后继续填写问卷。",
    surveyAvailableTitle: "问卷可用",
    surveyCompleteTitle: "问卷已完成",
    surveyUpdateTitle: "问卷需要更新",
    surveyWithdrawnTitle: "问卷回复已撤回",
    surveyInProgressTitle: "问卷进行中",
    optionalSurveyTitle: "可选问卷",
    requiredSurveyTitle: "必须完成问卷",
    surveyUnavailableTitle: "问卷不可用",
    ticketRequiredTitle: "需要验证门票",
    ticketVerifiedTitle: "门票已验证",
    openViaOnboardingMessage:
      "请先继续完成引导流程，然后打开此对话的问卷。",
    verifyTicketMessage:
      "请先验证活动门票，然后继续填写问卷。",
    ticketRequiredMessage:
      "参与这场对话前，请先验证你的活动门票。",
    ticketVerifiedMessage:
      "你的活动门票已为这场对话完成验证。",
    surveyUpToDateMessage: "你对这场对话的回答已经是最新的。",
    surveyChangedMessage:
      "此问卷已更改。请更新你的回答以继续参与。",
    surveyWithdrawnMessage: "如果你想再次参与，请恢复填写问卷。",
    surveyInProgressAvailableMessage:
      "你可以随时继续或查看已保存的回答。",
    surveyInProgressRequiredMessage:
      "继续填写问卷后，才能参与这场对话。",
    optionalSurveyMessage:
      "这场对话包含一份你可以随时填写的问卷。",
    requiredSurveyMessage: "请先完成问卷，再参与这场对话。",
    continueLabel: "继续",
    reviewAnswersLabel: "查看回答",
    updateAnswersLabel: "更新回答",
    resumeSurveyLabel: "继续问卷",
    continueSurveyLabel: "继续问卷",
    openSurveyLabel: "打开问卷",
    startSurveyLabel: "开始问卷",
  },
  "zh-Hant": {
    requiredAccessTitle: "請完成必要步驟",
    requiredAccessMessage:
      "請先完成所需的存取步驟，然後繼續填寫問卷。",
    surveyAvailableTitle: "問卷可用",
    surveyCompleteTitle: "問卷已完成",
    surveyUpdateTitle: "問卷需要更新",
    surveyWithdrawnTitle: "問卷回覆已撤回",
    surveyInProgressTitle: "問卷進行中",
    optionalSurveyTitle: "可選問卷",
    requiredSurveyTitle: "必須完成問卷",
    surveyUnavailableTitle: "問卷不可用",
    ticketRequiredTitle: "需要驗證門票",
    ticketVerifiedTitle: "門票已驗證",
    openViaOnboardingMessage:
      "請先繼續完成引導流程，然後開啟此對話的問卷。",
    verifyTicketMessage:
      "請先驗證活動門票，再繼續填寫問卷。",
    ticketRequiredMessage:
      "參與這場對話前，請先驗證你的活動門票。",
    ticketVerifiedMessage:
      "你的活動門票已為這場對話完成驗證。",
    surveyUpToDateMessage: "你對這場對話的回答已是最新。",
    surveyChangedMessage:
      "此問卷已變更。請更新你的回答以繼續參與。",
    surveyWithdrawnMessage: "如果你想再次參與，請恢復填寫問卷。",
    surveyInProgressAvailableMessage:
      "你可以隨時繼續或查看已儲存的回答。",
    surveyInProgressRequiredMessage:
      "繼續填寫問卷後，才能參與這場對話。",
    optionalSurveyMessage:
      "這場對話包含一份你可以隨時填寫的問卷。",
    requiredSurveyMessage: "請先完成問卷，再參與這場對話。",
    continueLabel: "繼續",
    reviewAnswersLabel: "查看回答",
    updateAnswersLabel: "更新回答",
    resumeSurveyLabel: "繼續問卷",
    continueSurveyLabel: "繼續問卷",
    openSurveyLabel: "開啟問卷",
    startSurveyLabel: "開始問卷",
  },
};
