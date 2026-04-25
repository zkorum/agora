import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ConversationSurveyOnboardingTranslations {
  failedToLoadSurveyTitle: string;
  tryAgainLabel: string;
  currentStatusLabel: string;
  welcomeTitle: string;
  welcomeDescription: string;
  surveyStatusLoading: string;
  surveyStatusComplete: string;
  surveyStatusNeedsUpdate: string;
  surveyStatusWithdrawn: string;
  surveyStatusInProgress: string;
  surveyStatusNotStarted: string;
  surveyStatusNoSurvey: string;
  surveyUnavailableTitle: string;
  verifyAccountTitle: string;
  verifyTicketTitle: string;
  ticketVerifiedTitle: string;
  surveyCompleteTitle: string;
  surveyUpdateTitle: string;
  surveyWithdrawnTitle: string;
  surveyInProgressTitle: string;
  optionalSurveyTitle: string;
  requiredSurveyTitle: string;
  surveyUnavailableDescription: string;
  verifyAccountDescription: string;
  verifyTicketDescription: string;
  ticketVerifiedDescription: string;
  surveyCompleteDescription: string;
  surveyUpdateDescription: string;
  surveyWithdrawnDescription: string;
  surveyInProgressAvailableDescription: string;
  surveyInProgressRequiredDescription: string;
  surveyNotStartedAvailableDescription: string;
  surveyNotStartedRequiredDescription: string;
  backToConversationLabel: string;
  continueLabel: string;
  verifyTicketLabel: string;
  reviewAnswersLabel: string;
  updateAnswersLabel: string;
  resumeSurveyLabel: string;
  continueSurveyLabel: string;
  openSurveyLabel: string;
  startSurveyLabel: string;
}

export const conversationSurveyOnboardingTranslations: Record<
  SupportedDisplayLanguageCodes,
  ConversationSurveyOnboardingTranslations
> = {
  en: {
    failedToLoadSurveyTitle: "Failed to load survey",
    tryAgainLabel: "Try again",
    currentStatusLabel: "Current status",
    welcomeTitle: "Welcome",
    welcomeDescription:
      "Continue through this conversation's onboarding before you participate.",
    surveyStatusLoading: "Loading",
    surveyStatusComplete: "Complete",
    surveyStatusNeedsUpdate: "Needs update",
    surveyStatusWithdrawn: "Withdrawn",
    surveyStatusInProgress: "In progress",
    surveyStatusNotStarted: "Not started",
    surveyStatusNoSurvey: "No survey",
    surveyUnavailableTitle: "Survey unavailable",
    verifyAccountTitle: "Verify your account first",
    verifyTicketTitle: "Verify your ticket first",
    ticketVerifiedTitle: "Ticket verified",
    surveyCompleteTitle: "Survey complete",
    surveyUpdateTitle: "Update your survey",
    surveyWithdrawnTitle: "Resume your survey",
    surveyInProgressTitle: "Continue your survey",
    optionalSurveyTitle: "Optional survey",
    requiredSurveyTitle: "Survey required",
    surveyUnavailableDescription:
      "This conversation does not currently have a survey.",
    verifyAccountDescription:
      "Complete the required sign-in or verification step before opening the survey.",
    verifyTicketDescription:
      "Verify your event ticket before continuing into the survey.",
    ticketVerifiedDescription:
      "Your event ticket is verified for this conversation.",
    surveyCompleteDescription:
      "Your saved answers are valid for this conversation.",
    surveyUpdateDescription:
      "This survey changed since your last saved answers.",
    surveyWithdrawnDescription:
      "You can reopen the survey and answer again at any time.",
    surveyInProgressAvailableDescription:
      "You can continue or review your saved answers.",
    surveyInProgressRequiredDescription:
      "Finish the survey to unlock participation in this conversation.",
    surveyNotStartedAvailableDescription:
      "This conversation has an optional survey you can open anytime.",
    surveyNotStartedRequiredDescription:
      "Complete the survey before you participate in this conversation.",
    backToConversationLabel: "Back to conversation",
    continueLabel: "Continue",
    verifyTicketLabel: "Verify ticket",
    reviewAnswersLabel: "Review answers",
    updateAnswersLabel: "Update answers",
    resumeSurveyLabel: "Resume survey",
    continueSurveyLabel: "Continue survey",
    openSurveyLabel: "Open survey",
    startSurveyLabel: "Start survey",
  },
  ar: {
    failedToLoadSurveyTitle: "فشل تحميل الاستبيان",
    tryAgainLabel: "حاول مرة أخرى",
    currentStatusLabel: "الحالة الحالية",
    welcomeTitle: "مرحباً",
    welcomeDescription:
      "تابع خطوات الانضمام لهذه المحادثة قبل المشاركة.",
    surveyStatusLoading: "جارٍ التحميل",
    surveyStatusComplete: "مكتمل",
    surveyStatusNeedsUpdate: "يحتاج إلى تحديث",
    surveyStatusWithdrawn: "تم سحبه",
    surveyStatusInProgress: "قيد التقدم",
    surveyStatusNotStarted: "لم يبدأ",
    surveyStatusNoSurvey: "لا يوجد استبيان",
    surveyUnavailableTitle: "الاستبيان غير متاح",
    verifyAccountTitle: "تحقق من حسابك أولاً",
    verifyTicketTitle: "تحقق من تذكرتك أولاً",
    ticketVerifiedTitle: "تم التحقق من التذكرة",
    surveyCompleteTitle: "الاستبيان مكتمل",
    surveyUpdateTitle: "حدّث استبيانك",
    surveyWithdrawnTitle: "استأنف استبيانك",
    surveyInProgressTitle: "واصل استبيانك",
    optionalSurveyTitle: "استبيان اختياري",
    requiredSurveyTitle: "الاستبيان مطلوب",
    surveyUnavailableDescription: "لا يوجد حالياً استبيان لهذه المحادثة.",
    verifyAccountDescription:
      "أكمِل خطوة تسجيل الدخول أو التحقق المطلوبة قبل فتح الاستبيان.",
    verifyTicketDescription:
      "تحقق من تذكرة الحدث قبل متابعة الاستبيان.",
    ticketVerifiedDescription:
      "تم التحقق من تذكرة الحدث الخاصة بك لهذه المحادثة.",
    surveyCompleteDescription:
      "إجاباتك المحفوظة صالحة لهذه المحادثة.",
    surveyUpdateDescription:
      "تغير هذا الاستبيان منذ آخر إجابات محفوظة لك.",
    surveyWithdrawnDescription:
      "يمكنك إعادة فتح الاستبيان والإجابة مرة أخرى في أي وقت.",
    surveyInProgressAvailableDescription:
      "يمكنك متابعة إجاباتك المحفوظة أو مراجعتها.",
    surveyInProgressRequiredDescription:
      "أكمِل الاستبيان لفتح المشاركة في هذه المحادثة.",
    surveyNotStartedAvailableDescription:
      "تحتوي هذه المحادثة على استبيان اختياري يمكنك فتحه في أي وقت.",
    surveyNotStartedRequiredDescription:
      "أكمِل الاستبيان قبل أن تشارك في هذه المحادثة.",
    backToConversationLabel: "العودة إلى المحادثة",
    continueLabel: "متابعة",
    verifyTicketLabel: "تحقق من التذكرة",
    reviewAnswersLabel: "مراجعة الإجابات",
    updateAnswersLabel: "تحديث الإجابات",
    resumeSurveyLabel: "استئناف الاستبيان",
    continueSurveyLabel: "متابعة الاستبيان",
    openSurveyLabel: "فتح الاستبيان",
    startSurveyLabel: "بدء الاستبيان",
  },
  es: {
    failedToLoadSurveyTitle: "No se pudo cargar la encuesta",
    tryAgainLabel: "Intentar de nuevo",
    currentStatusLabel: "Estado actual",
    welcomeTitle: "Bienvenido",
    welcomeDescription:
      "Completa el flujo de acceso de esta conversación antes de participar.",
    surveyStatusLoading: "Cargando",
    surveyStatusComplete: "Completa",
    surveyStatusNeedsUpdate: "Necesita actualización",
    surveyStatusWithdrawn: "Retirada",
    surveyStatusInProgress: "En progreso",
    surveyStatusNotStarted: "No iniciada",
    surveyStatusNoSurvey: "Sin encuesta",
    surveyUnavailableTitle: "Encuesta no disponible",
    verifyAccountTitle: "Verifica tu cuenta primero",
    verifyTicketTitle: "Verifica tu boleto primero",
    ticketVerifiedTitle: "Boleto verificado",
    surveyCompleteTitle: "Encuesta completada",
    surveyUpdateTitle: "Actualiza tu encuesta",
    surveyWithdrawnTitle: "Reanuda tu encuesta",
    surveyInProgressTitle: "Continúa tu encuesta",
    optionalSurveyTitle: "Encuesta opcional",
    requiredSurveyTitle: "Encuesta obligatoria",
    surveyUnavailableDescription:
      "Esta conversación no tiene actualmente una encuesta.",
    verifyAccountDescription:
      "Completa el inicio de sesión o la verificación requerida antes de abrir la encuesta.",
    verifyTicketDescription:
      "Verifica tu boleto del evento antes de continuar a la encuesta.",
    ticketVerifiedDescription:
      "Tu boleto del evento está verificado para esta conversación.",
    surveyCompleteDescription:
      "Tus respuestas guardadas son válidas para esta conversación.",
    surveyUpdateDescription:
      "Esta encuesta cambió desde tus últimas respuestas guardadas.",
    surveyWithdrawnDescription:
      "Puedes reabrir la encuesta y volver a responder en cualquier momento.",
    surveyInProgressAvailableDescription:
      "Puedes continuar o revisar tus respuestas guardadas.",
    surveyInProgressRequiredDescription:
      "Termina la encuesta para desbloquear la participación en esta conversación.",
    surveyNotStartedAvailableDescription:
      "Esta conversación tiene una encuesta opcional que puedes abrir cuando quieras.",
    surveyNotStartedRequiredDescription:
      "Completa la encuesta antes de participar en esta conversación.",
    backToConversationLabel: "Volver a la conversación",
    continueLabel: "Continuar",
    verifyTicketLabel: "Verificar boleto",
    reviewAnswersLabel: "Revisar respuestas",
    updateAnswersLabel: "Actualizar respuestas",
    resumeSurveyLabel: "Reanudar encuesta",
    continueSurveyLabel: "Continuar encuesta",
    openSurveyLabel: "Abrir encuesta",
    startSurveyLabel: "Comenzar encuesta",
  },
  fa: {
    failedToLoadSurveyTitle: "بارگیری نظرسنجی انجام نشد",
    tryAgainLabel: "تلاش دوباره",
    currentStatusLabel: "وضعیت فعلی",
    welcomeTitle: "خوش آمدید",
    welcomeDescription:
      "پیش از مشارکت، مراحل ورود این گفتگو را کامل کنید.",
    surveyStatusLoading: "در حال بارگیری",
    surveyStatusComplete: "کامل",
    surveyStatusNeedsUpdate: "نیاز به به‌روزرسانی دارد",
    surveyStatusWithdrawn: "پس گرفته شده",
    surveyStatusInProgress: "در حال انجام",
    surveyStatusNotStarted: "شروع نشده",
    surveyStatusNoSurvey: "بدون نظرسنجی",
    surveyUnavailableTitle: "نظرسنجی در دسترس نیست",
    verifyAccountTitle: "ابتدا حساب خود را تأیید کنید",
    verifyTicketTitle: "ابتدا بلیت خود را تأیید کنید",
    ticketVerifiedTitle: "بلیت تأیید شد",
    surveyCompleteTitle: "نظرسنجی کامل شد",
    surveyUpdateTitle: "نظرسنجی خود را به‌روزرسانی کنید",
    surveyWithdrawnTitle: "نظرسنجی خود را از سر بگیرید",
    surveyInProgressTitle: "نظرسنجی خود را ادامه دهید",
    optionalSurveyTitle: "نظرسنجی اختیاری",
    requiredSurveyTitle: "نظرسنجی الزامی است",
    surveyUnavailableDescription:
      "این گفتگو در حال حاضر نظرسنجی ندارد.",
    verifyAccountDescription:
      "پیش از باز کردن نظرسنجی، مرحله ورود یا تأیید لازم را کامل کنید.",
    verifyTicketDescription:
      "پیش از ادامه به نظرسنجی، بلیت رویداد خود را تأیید کنید.",
    ticketVerifiedDescription:
      "بلیت رویداد شما برای این گفتگو تأیید شده است.",
    surveyCompleteDescription:
      "پاسخ‌های ذخیره‌شده شما برای این گفتگو معتبر هستند.",
    surveyUpdateDescription:
      "این نظرسنجی از زمان آخرین پاسخ‌های ذخیره‌شده شما تغییر کرده است.",
    surveyWithdrawnDescription:
      "می‌توانید هر زمان نظرسنجی را دوباره باز کنید و پاسخ دهید.",
    surveyInProgressAvailableDescription:
      "می‌توانید پاسخ‌های ذخیره‌شده خود را ادامه دهید یا مرور کنید.",
    surveyInProgressRequiredDescription:
      "برای باز شدن امکان مشارکت در این گفتگو، نظرسنجی را تمام کنید.",
    surveyNotStartedAvailableDescription:
      "این گفتگو یک نظرسنجی اختیاری دارد که هر زمان بخواهید می‌توانید آن را باز کنید.",
    surveyNotStartedRequiredDescription:
      "پیش از مشارکت در این گفتگو، نظرسنجی را کامل کنید.",
    backToConversationLabel: "بازگشت به گفتگو",
    continueLabel: "ادامه",
    verifyTicketLabel: "تأیید بلیت",
    reviewAnswersLabel: "مرور پاسخ‌ها",
    updateAnswersLabel: "به‌روزرسانی پاسخ‌ها",
    resumeSurveyLabel: "ادامه نظرسنجی",
    continueSurveyLabel: "ادامه نظرسنجی",
    openSurveyLabel: "باز کردن نظرسنجی",
    startSurveyLabel: "شروع نظرسنجی",
  },
  fr: {
    failedToLoadSurveyTitle: "Impossible de charger le questionnaire",
    tryAgainLabel: "Réessayer",
    currentStatusLabel: "Statut actuel",
    welcomeTitle: "Bienvenue",
    welcomeDescription:
      "Terminez le parcours d'accès de cette conversation avant de participer.",
    surveyStatusLoading: "Chargement",
    surveyStatusComplete: "Terminé",
    surveyStatusNeedsUpdate: "À mettre à jour",
    surveyStatusWithdrawn: "Retiré",
    surveyStatusInProgress: "En cours",
    surveyStatusNotStarted: "Non commencé",
    surveyStatusNoSurvey: "Aucun questionnaire",
    surveyUnavailableTitle: "Questionnaire indisponible",
    verifyAccountTitle: "Vérifiez d'abord votre compte",
    verifyTicketTitle: "Vérifiez d'abord votre billet",
    ticketVerifiedTitle: "Billet vérifié",
    surveyCompleteTitle: "Questionnaire terminé",
    surveyUpdateTitle: "Mettez votre questionnaire à jour",
    surveyWithdrawnTitle: "Reprenez votre questionnaire",
    surveyInProgressTitle: "Continuez votre questionnaire",
    optionalSurveyTitle: "Questionnaire facultatif",
    requiredSurveyTitle: "Questionnaire requis",
    surveyUnavailableDescription:
      "Cette conversation n'a actuellement pas de questionnaire.",
    verifyAccountDescription:
      "Terminez la connexion ou la vérification requise avant d'ouvrir le questionnaire.",
    verifyTicketDescription:
      "Vérifiez votre billet d'événement avant de continuer vers le questionnaire.",
    ticketVerifiedDescription:
      "Votre billet d'événement est vérifié pour cette conversation.",
    surveyCompleteDescription:
      "Vos réponses enregistrées sont valides pour cette conversation.",
    surveyUpdateDescription:
      "Ce questionnaire a changé depuis vos dernières réponses enregistrées.",
    surveyWithdrawnDescription:
      "Vous pouvez rouvrir le questionnaire et répondre de nouveau à tout moment.",
    surveyInProgressAvailableDescription:
      "Vous pouvez continuer ou revoir vos réponses enregistrées.",
    surveyInProgressRequiredDescription:
      "Terminez le questionnaire pour débloquer la participation à cette conversation.",
    surveyNotStartedAvailableDescription:
      "Cette conversation comporte un questionnaire facultatif que vous pouvez ouvrir à tout moment.",
    surveyNotStartedRequiredDescription:
      "Terminez le questionnaire avant de participer à cette conversation.",
    backToConversationLabel: "Retour à la conversation",
    continueLabel: "Continuer",
    verifyTicketLabel: "Vérifier le billet",
    reviewAnswersLabel: "Voir les réponses",
    updateAnswersLabel: "Mettre à jour les réponses",
    resumeSurveyLabel: "Reprendre le questionnaire",
    continueSurveyLabel: "Continuer le questionnaire",
    openSurveyLabel: "Ouvrir le questionnaire",
    startSurveyLabel: "Commencer le questionnaire",
  },
  he: {
    failedToLoadSurveyTitle: "טעינת הסקר נכשלה",
    tryAgainLabel: "לנסות שוב",
    currentStatusLabel: "מצב נוכחי",
    welcomeTitle: "ברוכים הבאים",
    welcomeDescription:
      "השלימו את תהליך הכניסה לשיחה הזו לפני ההשתתפות.",
    surveyStatusLoading: "טוען",
    surveyStatusComplete: "הושלם",
    surveyStatusNeedsUpdate: "דורש עדכון",
    surveyStatusWithdrawn: "נמשך",
    surveyStatusInProgress: "בתהליך",
    surveyStatusNotStarted: "לא התחיל",
    surveyStatusNoSurvey: "אין סקר",
    surveyUnavailableTitle: "הסקר לא זמין",
    verifyAccountTitle: "אמתו קודם את החשבון שלכם",
    verifyTicketTitle: "אמתו קודם את הכרטיס שלכם",
    ticketVerifiedTitle: "הכרטיס אומת",
    surveyCompleteTitle: "הסקר הושלם",
    surveyUpdateTitle: "עדכנו את הסקר שלכם",
    surveyWithdrawnTitle: "חזרו לסקר שלכם",
    surveyInProgressTitle: "המשיכו את הסקר שלכם",
    optionalSurveyTitle: "סקר אופציונלי",
    requiredSurveyTitle: "הסקר נדרש",
    surveyUnavailableDescription: "לשיחה הזו אין כרגע סקר.",
    verifyAccountDescription:
      "השלימו את שלב ההתחברות או האימות הנדרש לפני פתיחת הסקר.",
    verifyTicketDescription:
      "אמתו את כרטיס האירוע לפני שתמשיכו לסקר.",
    ticketVerifiedDescription:
      "כרטיס האירוע שלכם אומת עבור השיחה הזו.",
    surveyCompleteDescription:
      "התשובות השמורות שלכם תקפות לשיחה הזו.",
    surveyUpdateDescription:
      "הסקר הזה השתנה מאז התשובות השמורות האחרונות שלכם.",
    surveyWithdrawnDescription:
      "אפשר לפתוח מחדש את הסקר ולענות שוב בכל זמן.",
    surveyInProgressAvailableDescription:
      "אפשר להמשיך או לעיין בתשובות השמורות שלכם.",
    surveyInProgressRequiredDescription:
      "סיימו את הסקר כדי לפתוח השתתפות בשיחה הזו.",
    surveyNotStartedAvailableDescription:
      "לשיחה הזו יש סקר אופציונלי שאפשר לפתוח בכל זמן.",
    surveyNotStartedRequiredDescription:
      "השלימו את הסקר לפני שתשתתפו בשיחה הזו.",
    backToConversationLabel: "חזרה לשיחה",
    continueLabel: "המשך",
    verifyTicketLabel: "אימות כרטיס",
    reviewAnswersLabel: "עיון בתשובות",
    updateAnswersLabel: "עדכון תשובות",
    resumeSurveyLabel: "המשך הסקר",
    continueSurveyLabel: "המשך הסקר",
    openSurveyLabel: "פתיחת הסקר",
    startSurveyLabel: "התחלת הסקר",
  },
  ja: {
    failedToLoadSurveyTitle: "アンケートを読み込めませんでした",
    tryAgainLabel: "もう一度試す",
    currentStatusLabel: "現在の状態",
    welcomeTitle: "ようこそ",
    welcomeDescription:
      "参加する前に、この会話のオンボーディングを完了してください。",
    surveyStatusLoading: "読み込み中",
    surveyStatusComplete: "完了",
    surveyStatusNeedsUpdate: "更新が必要",
    surveyStatusWithdrawn: "取り下げ済み",
    surveyStatusInProgress: "進行中",
    surveyStatusNotStarted: "未開始",
    surveyStatusNoSurvey: "アンケートなし",
    surveyUnavailableTitle: "アンケートは利用できません",
    verifyAccountTitle: "先にアカウントを確認してください",
    verifyTicketTitle: "先にチケットを確認してください",
    ticketVerifiedTitle: "チケット確認済み",
    surveyCompleteTitle: "アンケート完了",
    surveyUpdateTitle: "アンケートを更新してください",
    surveyWithdrawnTitle: "アンケートを再開してください",
    surveyInProgressTitle: "アンケートを続けてください",
    optionalSurveyTitle: "任意のアンケート",
    requiredSurveyTitle: "必須アンケート",
    surveyUnavailableDescription:
      "この会話には現在アンケートがありません。",
    verifyAccountDescription:
      "アンケートを開く前に、必要なログインまたは認証を完了してください。",
    verifyTicketDescription:
      "アンケートに進む前にイベントチケットを確認してください。",
    ticketVerifiedDescription:
      "この会話ではイベントチケットが確認済みです。",
    surveyCompleteDescription:
      "保存された回答はこの会話に対して有効です。",
    surveyUpdateDescription:
      "このアンケートは、あなたの最後の保存済み回答以降に変更されました。",
    surveyWithdrawnDescription:
      "アンケートを再度開いて、いつでも回答し直せます。",
    surveyInProgressAvailableDescription:
      "保存した回答を続けたり見直したりできます。",
    surveyInProgressRequiredDescription:
      "この会話に参加するにはアンケートを完了してください。",
    surveyNotStartedAvailableDescription:
      "この会話には、いつでも開ける任意のアンケートがあります。",
    surveyNotStartedRequiredDescription:
      "この会話に参加する前にアンケートを完了してください。",
    backToConversationLabel: "会話に戻る",
    continueLabel: "続ける",
    verifyTicketLabel: "チケットを確認",
    reviewAnswersLabel: "回答を確認",
    updateAnswersLabel: "回答を更新",
    resumeSurveyLabel: "アンケートを再開",
    continueSurveyLabel: "アンケートを続ける",
    openSurveyLabel: "アンケートを開く",
    startSurveyLabel: "アンケートを開始",
  },
  ky: {
    failedToLoadSurveyTitle: "Сурамжылоону жүктөө ишке ашкан жок",
    tryAgainLabel: "Кайра аракет кылуу",
    currentStatusLabel: "Учурдагы абал",
    welcomeTitle: "Кош келиңиз",
    welcomeDescription:
      "Катышуудан мурун бул сүйлөшүүнүн кирүү кадамдарын бүтүрүңүз.",
    surveyStatusLoading: "Жүктөлүүдө",
    surveyStatusComplete: "Аяктаган",
    surveyStatusNeedsUpdate: "Жаңыртуу керек",
    surveyStatusWithdrawn: "Кайтарылып алынган",
    surveyStatusInProgress: "Жүрүп жатат",
    surveyStatusNotStarted: "Баштала элек",
    surveyStatusNoSurvey: "Сурамжылоо жок",
    surveyUnavailableTitle: "Сурамжылоо жеткиликсиз",
    verifyAccountTitle: "Адегенде аккаунтуңузду текшериңиз",
    verifyTicketTitle: "Адегенде билетиңизди текшериңиз",
    ticketVerifiedTitle: "Билет текшерилди",
    surveyCompleteTitle: "Сурамжылоо аяктады",
    surveyUpdateTitle: "Сурамжылоону жаңыртыңыз",
    surveyWithdrawnTitle: "Сурамжылоону кайра улантыңыз",
    surveyInProgressTitle: "Сурамжылоону улантыңыз",
    optionalSurveyTitle: "Ыктыярдуу сурамжылоо",
    requiredSurveyTitle: "Сурамжылоо милдеттүү",
    surveyUnavailableDescription:
      "Бул сүйлөшүүдө азырынча сурамжылоо жок.",
    verifyAccountDescription:
      "Сурамжылоону ачардан мурун талап кылынган кирүү же текшерүү кадамын бүтүрүңүз.",
    verifyTicketDescription:
      "Сурамжылоого өтүүдөн мурун иш-чара билетиңизди текшериңиз.",
    ticketVerifiedDescription:
      "Бул сүйлөшүү үчүн иш-чара билетиңиз текшерилди.",
    surveyCompleteDescription:
      "Сакталган жоопторуңуз бул сүйлөшүү үчүн жарактуу.",
    surveyUpdateDescription:
      "Бул сурамжылоо акыркы сакталган жоопторуңуздан бери өзгөрдү.",
    surveyWithdrawnDescription:
      "Сурамжылоону кайра ачып, каалаган убакта дагы жооп бере аласыз.",
    surveyInProgressAvailableDescription:
      "Сакталган жоопторуңузду улантып же карап чыга аласыз.",
    surveyInProgressRequiredDescription:
      "Бул сүйлөшүүгө катышуу үчүн сурамжылоону бүтүрүңүз.",
    surveyNotStartedAvailableDescription:
      "Бул сүйлөшүүдө каалаган убакта ачууга боло турган ыктыярдуу сурамжылоо бар.",
    surveyNotStartedRequiredDescription:
      "Бул сүйлөшүүгө катышардан мурун сурамжылоону бүтүрүңүз.",
    backToConversationLabel: "Сүйлөшүүгө кайтуу",
    continueLabel: "Улантуу",
    verifyTicketLabel: "Билетти текшерүү",
    reviewAnswersLabel: "Жоопторду көрүү",
    updateAnswersLabel: "Жоопторду жаңыртуу",
    resumeSurveyLabel: "Сурамжылоону улантуу",
    continueSurveyLabel: "Сурамжылоону улантуу",
    openSurveyLabel: "Сурамжылоону ачуу",
    startSurveyLabel: "Сурамжылоону баштоо",
  },
  ru: {
    failedToLoadSurveyTitle: "Не удалось загрузить опрос",
    tryAgainLabel: "Попробовать снова",
    currentStatusLabel: "Текущий статус",
    welcomeTitle: "Добро пожаловать",
    welcomeDescription:
      "Перед участием пройдите вводные шаги этой беседы.",
    surveyStatusLoading: "Загрузка",
    surveyStatusComplete: "Завершён",
    surveyStatusNeedsUpdate: "Требует обновления",
    surveyStatusWithdrawn: "Отозван",
    surveyStatusInProgress: "В процессе",
    surveyStatusNotStarted: "Не начат",
    surveyStatusNoSurvey: "Нет опроса",
    surveyUnavailableTitle: "Опрос недоступен",
    verifyAccountTitle: "Сначала подтвердите аккаунт",
    verifyTicketTitle: "Сначала подтвердите билет",
    ticketVerifiedTitle: "Билет подтверждён",
    surveyCompleteTitle: "Опрос завершён",
    surveyUpdateTitle: "Обновите опрос",
    surveyWithdrawnTitle: "Возобновите опрос",
    surveyInProgressTitle: "Продолжите опрос",
    optionalSurveyTitle: "Необязательный опрос",
    requiredSurveyTitle: "Опрос обязателен",
    surveyUnavailableDescription:
      "У этой беседы сейчас нет опроса.",
    verifyAccountDescription:
      "Завершите необходимый вход или проверку перед открытием опроса.",
    verifyTicketDescription:
      "Подтвердите билет на событие перед переходом к опросу.",
    ticketVerifiedDescription:
      "Ваш билет на событие подтверждён для этой беседы.",
    surveyCompleteDescription:
      "Ваши сохранённые ответы действительны для этой беседы.",
    surveyUpdateDescription:
      "Этот опрос изменился с момента ваших последних сохранённых ответов.",
    surveyWithdrawnDescription:
      "Вы можете снова открыть опрос и ответить заново в любое время.",
    surveyInProgressAvailableDescription:
      "Вы можете продолжить или просмотреть сохранённые ответы.",
    surveyInProgressRequiredDescription:
      "Завершите опрос, чтобы разблокировать участие в этой беседе.",
    surveyNotStartedAvailableDescription:
      "В этой беседе есть необязательный опрос, который можно открыть в любое время.",
    surveyNotStartedRequiredDescription:
      "Завершите опрос перед участием в этой беседе.",
    backToConversationLabel: "Вернуться к беседе",
    continueLabel: "Продолжить",
    verifyTicketLabel: "Проверить билет",
    reviewAnswersLabel: "Просмотреть ответы",
    updateAnswersLabel: "Обновить ответы",
    resumeSurveyLabel: "Возобновить опрос",
    continueSurveyLabel: "Продолжить опрос",
    openSurveyLabel: "Открыть опрос",
    startSurveyLabel: "Начать опрос",
  },
  "zh-Hans": {
    failedToLoadSurveyTitle: "无法加载问卷",
    tryAgainLabel: "重试",
    currentStatusLabel: "当前状态",
    welcomeTitle: "欢迎",
    welcomeDescription:
      "参与前，请先完成这场对话的引导流程。",
    surveyStatusLoading: "加载中",
    surveyStatusComplete: "已完成",
    surveyStatusNeedsUpdate: "需要更新",
    surveyStatusWithdrawn: "已撤回",
    surveyStatusInProgress: "进行中",
    surveyStatusNotStarted: "未开始",
    surveyStatusNoSurvey: "没有问卷",
    surveyUnavailableTitle: "问卷不可用",
    verifyAccountTitle: "请先验证你的账户",
    verifyTicketTitle: "请先验证你的门票",
    ticketVerifiedTitle: "门票已验证",
    surveyCompleteTitle: "问卷已完成",
    surveyUpdateTitle: "更新你的问卷",
    surveyWithdrawnTitle: "恢复你的问卷",
    surveyInProgressTitle: "继续你的问卷",
    optionalSurveyTitle: "可选问卷",
    requiredSurveyTitle: "必须完成问卷",
    surveyUnavailableDescription: "这场对话当前没有问卷。",
    verifyAccountDescription:
      "打开问卷前，请先完成所需的登录或验证步骤。",
    verifyTicketDescription:
      "继续进入问卷前，请先验证你的活动门票。",
    ticketVerifiedDescription:
      "你的活动门票已为这场对话完成验证。",
    surveyCompleteDescription: "你保存的回答对这场对话仍然有效。",
    surveyUpdateDescription:
      "此问卷在你上次保存回答之后已经发生变化。",
    surveyWithdrawnDescription:
      "你可以随时重新打开问卷并再次作答。",
    surveyInProgressAvailableDescription:
      "你可以继续或查看已保存的回答。",
    surveyInProgressRequiredDescription:
      "完成问卷后才能解锁这场对话的参与资格。",
    surveyNotStartedAvailableDescription:
      "这场对话有一份你可以随时打开的可选问卷。",
    surveyNotStartedRequiredDescription:
      "请先完成问卷，再参与这场对话。",
    backToConversationLabel: "返回对话",
    continueLabel: "继续",
    verifyTicketLabel: "验证门票",
    reviewAnswersLabel: "查看回答",
    updateAnswersLabel: "更新回答",
    resumeSurveyLabel: "继续问卷",
    continueSurveyLabel: "继续问卷",
    openSurveyLabel: "打开问卷",
    startSurveyLabel: "开始问卷",
  },
  "zh-Hant": {
    failedToLoadSurveyTitle: "無法載入問卷",
    tryAgainLabel: "重試",
    currentStatusLabel: "目前狀態",
    welcomeTitle: "歡迎",
    welcomeDescription:
      "參與前，請先完成這場對話的引導流程。",
    surveyStatusLoading: "載入中",
    surveyStatusComplete: "已完成",
    surveyStatusNeedsUpdate: "需要更新",
    surveyStatusWithdrawn: "已撤回",
    surveyStatusInProgress: "進行中",
    surveyStatusNotStarted: "未開始",
    surveyStatusNoSurvey: "沒有問卷",
    surveyUnavailableTitle: "問卷不可用",
    verifyAccountTitle: "請先驗證你的帳戶",
    verifyTicketTitle: "請先驗證你的門票",
    ticketVerifiedTitle: "門票已驗證",
    surveyCompleteTitle: "問卷已完成",
    surveyUpdateTitle: "更新你的問卷",
    surveyWithdrawnTitle: "恢復你的問卷",
    surveyInProgressTitle: "繼續你的問卷",
    optionalSurveyTitle: "可選問卷",
    requiredSurveyTitle: "必須完成問卷",
    surveyUnavailableDescription: "這場對話目前沒有問卷。",
    verifyAccountDescription:
      "開啟問卷前，請先完成所需的登入或驗證步驟。",
    verifyTicketDescription:
      "繼續進入問卷前，請先驗證你的活動門票。",
    ticketVerifiedDescription:
      "你的活動門票已為這場對話完成驗證。",
    surveyCompleteDescription: "你儲存的回答對這場對話仍然有效。",
    surveyUpdateDescription:
      "此問卷在你上次儲存回答之後已經發生變更。",
    surveyWithdrawnDescription:
      "你可以隨時重新開啟問卷並再次作答。",
    surveyInProgressAvailableDescription:
      "你可以繼續或查看已儲存的回答。",
    surveyInProgressRequiredDescription:
      "完成問卷後才能解鎖這場對話的參與資格。",
    surveyNotStartedAvailableDescription:
      "這場對話有一份你可以隨時開啟的可選問卷。",
    surveyNotStartedRequiredDescription:
      "請先完成問卷，再參與這場對話。",
    backToConversationLabel: "返回對話",
    continueLabel: "繼續",
    verifyTicketLabel: "驗證門票",
    reviewAnswersLabel: "查看回答",
    updateAnswersLabel: "更新回答",
    resumeSurveyLabel: "繼續問卷",
    continueSurveyLabel: "繼續問卷",
    openSurveyLabel: "開啟問卷",
    startSurveyLabel: "開始問卷",
  },
};
