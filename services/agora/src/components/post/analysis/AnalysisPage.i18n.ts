import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface AnalysisPageTranslations {
  loadingAnalysis: string;
  retryingAnalysis: string;
  analysisErrorTitle: string;
  analysisErrorMessage: string;
  noAnalysisData: string;
  retryAnalysis: string;
  generateReport: string;
  report: string;
  analysisViewTitle: string;
  analysisViewSortingCaption: string;
  facilitatorPreference: string;
  recommendedDefault: string;
  groupsLabel: string;
  systemDefaultCaption: string;
  analysisVariantsNotAvailable: string;
  fixedGroupCountUnavailable: string;
  recommendedDefaultUnavailable: string;
  sameAsRecommendedDefault: string;
  usesGroups: string;
  recommendedOptionCaption: string;
  liveSnapshot: string;
  checkpointSnapshot: string;
  pauseAtLatestCheckpoint: string;
  returnToLiveAnalysis: string;
  previousCheckpoint: string;
  nextCheckpoint: string;
  recommendedAnalysisView: string;
  availableGroups: string;
  availableOption: string;
  discouragedOption: string;
  lockedOption: string;
  selectionScoreLabel: string;
  candidateIdLabel: string;
  resolvedGroupCountLabel: string;
  silhouetteScoreLabel: string;
  balanceScoreLabel: string;
  learnMore: string;
  goBack: string;
  analysisViewModesSection: string;
  analysisViewGroupCountsSection: string;
  analysisViewLearnMoreTitle: string;
  facilitatorPreferenceCaption: string;
  recommendedOption: string;
  recommendedOptionDescription: string;
  fixedGroupCountOption: string;
  fixedGroupCountOptionDescription: string;
  unavailableOption: string;
  unavailableOptionDescription: string;
  discouragedOptionDescription: string;
  overallScoreLabel: string;
  clarityScoreLabel: string;
  overallScoreTitle: string;
  clarityScoreTitle: string;
  balanceScoreTitle: string;
  overallScoreDescription: string;
  clarityScoreDescription: string;
  balanceScoreDescription: string;
  checkpointTimelineLabel: string;
  checkpointTimelineStart: string;
  checkpointTimelineNow: string;
  checkpointReasonsLabel: string;
  checkpointReasonFirstDisplayableAnalysis: string;
  checkpointReasonFirstGroupCountAvailable: string;
  checkpointReasonDefaultGroupCountChanged: string;
  checkpointReasonParticipationMilestone: string;
  checkpointReasonVoteMilestone: string;
  checkpointReasonParticipantCount: string;
  checkpointReasonVoteCount: string;
  checkpointReasonConversationClosed: string;
}

const analysisViewHelpFallbackTranslations = {
  learnMore: "Learn more",
  goBack: "Back",
  analysisViewModesSection: "Modes",
  analysisViewGroupCountsSection: "Group counts",
  analysisViewLearnMoreTitle: "About group counts",
  facilitatorPreferenceCaption:
    "Uses the facilitator's group count. Falls back to Auto if unavailable.",
  recommendedOption: "Recommended",
  recommendedOptionDescription:
    "Auto's highest-scoring fixed group count for the current checkpoint.",
  fixedGroupCountOption: "Specific group counts",
  fixedGroupCountOptionDescription:
    "Shows exactly that many groups for the current checkpoint, or an empty state if unavailable.",
  unavailableOption: "Unavailable",
  unavailableOptionDescription:
    "Agora could not form meaningful groups for this group count in the selected checkpoint.",
  discouragedOptionDescription:
    "This group count has an analysis result, but the result is weaker than the alternatives in the selected checkpoint.",
  overallScoreLabel: "Overall {score}/100",
  clarityScoreLabel: "Clarity {score}/100",
  balanceScoreLabel: "Balance {score}/100",
  overallScoreTitle: "Overall",
  clarityScoreTitle: "Clarity",
  balanceScoreTitle: "Balance",
  overallScoreDescription:
    "Combined 0-100 score used to compare group counts. Higher is better.",
  clarityScoreDescription:
    "0-100 score for how distinct the groups are from each other. Higher is better.",
  balanceScoreDescription:
    "0-100 score for how evenly participants are distributed across groups. Higher is better.",
} satisfies Pick<
  AnalysisPageTranslations,
  | "learnMore"
  | "goBack"
  | "analysisViewModesSection"
  | "analysisViewGroupCountsSection"
  | "analysisViewLearnMoreTitle"
  | "facilitatorPreferenceCaption"
  | "recommendedOption"
  | "recommendedOptionDescription"
  | "fixedGroupCountOption"
  | "fixedGroupCountOptionDescription"
  | "unavailableOption"
  | "unavailableOptionDescription"
  | "discouragedOptionDescription"
  | "overallScoreLabel"
  | "clarityScoreLabel"
  | "balanceScoreLabel"
  | "overallScoreTitle"
  | "clarityScoreTitle"
  | "balanceScoreTitle"
  | "overallScoreDescription"
  | "clarityScoreDescription"
  | "balanceScoreDescription"
>;

export const analysisPageTranslations: Record<
  SupportedDisplayLanguageCodes,
  AnalysisPageTranslations
> = {
  en: {
    loadingAnalysis: "Loading analysis...",
    retryingAnalysis: "Retrying to load analysis...",
    analysisErrorTitle: "Failed to load analysis",
    analysisErrorMessage: "Unable to load the analysis data. Please try again.",
    noAnalysisData: "Analysis data is not available for this conversation",
    retryAnalysis: "Retry loading",
    generateReport: "Generate report",
    report: "Report",
    analysisViewTitle: "Group count",
    analysisViewSortingCaption:
      "Choose how opinion groups are shown. Scores are only for the selected checkpoint and may change.",
    facilitatorPreference: "Facilitator preference",
    recommendedDefault: "Auto",
    groupsLabel: "{count} groups",
    systemDefaultCaption:
      "Uses the highest-scoring available group count for each checkpoint.",
    analysisVariantsNotAvailable:
      "Premium multi-variant analysis was not enabled when this checkpoint was created.",
    fixedGroupCountUnavailable:
      "Agora could not form {count} meaningful groups in the selected checkpoint.",
    recommendedDefaultUnavailable: "Auto is not available yet.",
    sameAsRecommendedDefault: "Same as Auto",
    usesGroups: "Uses {count} groups. Falls back to Auto if unavailable.",
    recommendedOptionCaption: "Recommended",
    liveSnapshot: "Live",
    checkpointSnapshot: "Checkpoint",
    pauseAtLatestCheckpoint: "Pause at latest checkpoint",
    returnToLiveAnalysis: "Return to live analysis",
    previousCheckpoint: "Previous checkpoint",
    nextCheckpoint: "Next checkpoint",
    recommendedAnalysisView: "Recommended option",
    availableGroups: "{count} available groups",
    availableOption: "Available",
    discouragedOption: "Discouraged",
    lockedOption: "Locked",
    selectionScoreLabel: "Selection {score}/100",
    candidateIdLabel: "Candidate #{id}",
    resolvedGroupCountLabel: "Uses {count} groups",
    silhouetteScoreLabel: "Clarity {score}/100",
    learnMore: "Learn more",
    goBack: "Back",
    analysisViewModesSection: "Modes",
    analysisViewGroupCountsSection: "Group counts",
    analysisViewLearnMoreTitle: "About group counts",
    facilitatorPreferenceCaption:
      "Uses the facilitator's group count. Falls back to Auto if unavailable.",
    recommendedOption: "Recommended",
    recommendedOptionDescription:
      "Auto's highest-scoring fixed group count for the current checkpoint.",
    fixedGroupCountOption: "Specific group counts",
    fixedGroupCountOptionDescription:
      "Shows exactly that many groups for the current checkpoint, or an empty state if unavailable.",
    unavailableOption: "Unavailable",
    unavailableOptionDescription:
      "Agora could not form meaningful groups for this group count in the selected checkpoint.",
    discouragedOptionDescription:
      "This group count has an analysis result, but the result is weaker than the alternatives in the selected checkpoint.",
    overallScoreLabel: "Overall {score}/100",
    clarityScoreLabel: "Clarity {score}/100",
    balanceScoreLabel: "Balance {score}/100",
    overallScoreTitle: "Overall",
    clarityScoreTitle: "Clarity",
    balanceScoreTitle: "Balance",
    overallScoreDescription:
      "Combined 0-100 score used to compare group counts. Higher is better.",
    clarityScoreDescription:
      "0-100 score for how distinct the groups are from each other. Higher is better.",
    balanceScoreDescription:
      "0-100 score for how evenly participants are distributed across groups. Higher is better.",
    checkpointTimelineLabel: "Checkpoint timeline",
    checkpointTimelineStart: "Start",
    checkpointTimelineNow: "Now",
    checkpointReasonsLabel: "Checkpoint markers",
    checkpointReasonFirstDisplayableAnalysis: "First analysis",
    checkpointReasonFirstGroupCountAvailable: "{count} groups available",
    checkpointReasonDefaultGroupCountChanged: "Auto: {count} groups",
    checkpointReasonParticipationMilestone: "> {count} participants",
    checkpointReasonVoteMilestone: "> {count} votes",
    checkpointReasonParticipantCount: "{count} participants",
    checkpointReasonVoteCount: "{count} votes",
    checkpointReasonConversationClosed: "Closed",
  },
  ar: {
    loadingAnalysis: "جاري تحميل التحليل...",
    retryingAnalysis: "جاري إعادة محاولة تحميل التحليل...",
    analysisErrorTitle: "فشل في تحميل التحليل",
    analysisErrorMessage:
      "غير قادر على تحميل بيانات التحليل. يرجى المحاولة مرة أخرى.",
    noAnalysisData: "بيانات التحليل غير متاحة لهذه المحادثة",
    retryAnalysis: "إعادة المحاولة",
    generateReport: "إنشاء تقرير",
    report: "تقرير",
    analysisViewTitle: "عدد المجموعات",
    analysisViewSortingCaption:
      "اختر كيف تُعرض مجموعات الرأي. الدرجات تخص نقطة التحقق المحددة فقط وقد تتغير.",
    facilitatorPreference: "تفضيل الميسر",
    recommendedDefault: "Auto",
    groupsLabel: "{count} مجموعات",
    systemDefaultCaption:
      "يستخدم أعلى عدد مجموعات متاح تقييماً لكل نقطة تحقق.",
    analysisVariantsNotAvailable:
      "لم تكن ميزة التحليل متعدد المتغيرات المميزة مفعلة عند إنشاء نقطة التحقق هذه.",
    fixedGroupCountUnavailable:
      "تعذر على Agora تشكيل {count} مجموعات ذات معنى في نقطة التحقق المحددة.",
    recommendedDefaultUnavailable: "الوضع التلقائي غير متاح بعد.",
    sameAsRecommendedDefault: "مثل الوضع التلقائي",
    usesGroups: "يستخدم {count} مجموعات. يعود إلى Auto إذا لم يكن متاحاً.",
    recommendedOptionCaption: "موصى به",
    liveSnapshot: "مباشر",
    checkpointSnapshot: "نقطة تحقق",
    pauseAtLatestCheckpoint: "إيقاف عند أحدث نقطة تحقق",
    returnToLiveAnalysis: "العودة إلى التحليل المباشر",
    previousCheckpoint: "نقطة التحقق السابقة",
    nextCheckpoint: "نقطة التحقق التالية",
    recommendedAnalysisView: "الخيار الموصى به",
    availableGroups: "{count} مجموعات متاحة",
    availableOption: "متاح",
    discouragedOption: "غير مفضل",
    lockedOption: "مقفل",
    selectionScoreLabel: "الاختيار {score}/100",
    candidateIdLabel: "المرشح #{id}",
    resolvedGroupCountLabel: "يستخدم {count} مجموعات",
    silhouetteScoreLabel: "الوضوح {score}/100",
    ...analysisViewHelpFallbackTranslations,
    learnMore: "معرفة المزيد",
    goBack: "رجوع",
    analysisViewModesSection: "الأوضاع",
    analysisViewGroupCountsSection: "أعداد المجموعات",
    analysisViewLearnMoreTitle: "حول أعداد المجموعات",
    facilitatorPreferenceCaption:
      "يستخدم عدد المجموعات الذي اختاره الميسر. يعود إلى Auto إذا لم يكن متاحاً.",
    recommendedOption: "موصى به",
    recommendedOptionDescription:
      "عدد المجموعات الثابت الأعلى تقييماً في Auto لنقطة التحقق الحالية.",
    fixedGroupCountOption: "أعداد مجموعات محددة",
    fixedGroupCountOptionDescription:
      "يعرض هذا العدد بالضبط من المجموعات لنقطة التحقق الحالية، أو حالة فارغة إذا لم يكن متاحاً.",
    unavailableOption: "غير متاح",
    unavailableOptionDescription:
      "لم تستطع Agora تشكيل مجموعات ذات معنى لهذا العدد في نقطة التحقق المحددة.",
    discouragedOptionDescription:
      "لهذا العدد نتيجة تحليل، لكنها أضعف من البدائل في نقطة التحقق المحددة.",
    overallScoreLabel: "الإجمالي {score}/100",
    clarityScoreLabel: "الوضوح {score}/100",
    balanceScoreLabel: "التوازن {score}/100",
    overallScoreTitle: "الإجمالي",
    clarityScoreTitle: "الوضوح",
    balanceScoreTitle: "التوازن",
    overallScoreDescription:
      "درجة مجمعة من 0 إلى 100 تُستخدم لمقارنة أعداد المجموعات. الأعلى أفضل.",
    clarityScoreDescription:
      "درجة من 0 إلى 100 لمدى تميّز المجموعات عن بعضها. الأعلى أفضل.",
    balanceScoreDescription:
      "درجة من 0 إلى 100 لمدى توازن توزيع المشاركين بين المجموعات. الأعلى أفضل.",
    checkpointTimelineLabel: "الخط الزمني لنقاط التحقق",
    checkpointTimelineStart: "البداية",
    checkpointTimelineNow: "الآن",
    checkpointReasonsLabel: "علامات نقطة التحقق",
    checkpointReasonFirstDisplayableAnalysis: "أول تحليل",
    checkpointReasonFirstGroupCountAvailable: "{count} مجموعات متاحة",
    checkpointReasonDefaultGroupCountChanged: "تلقائي: {count} مجموعات",
    checkpointReasonParticipationMilestone: "> {count} مشاركون",
    checkpointReasonVoteMilestone: "> {count} أصوات",
    checkpointReasonParticipantCount: "{count} مشاركون",
    checkpointReasonVoteCount: "{count} أصوات",
    checkpointReasonConversationClosed: "مغلق",
  },
  es: {
    loadingAnalysis: "Cargando análisis...",
    retryingAnalysis: "Reintentando cargar análisis...",
    analysisErrorTitle: "Error al cargar el análisis",
    analysisErrorMessage:
      "No se pudieron cargar los datos del análisis. Inténtalo de nuevo.",
    noAnalysisData:
      "Los datos de análisis no están disponibles para esta conversación",
    retryAnalysis: "Reintentar carga",
    generateReport: "Generar informe",
    report: "Informe",
    analysisViewTitle: "Número de grupos",
    analysisViewSortingCaption:
      "Elige cómo se muestran los grupos de opinión. Las puntuaciones son solo para el punto de control seleccionado y pueden cambiar.",
    facilitatorPreference: "Preferencia del facilitador",
    recommendedDefault: "Auto",
    groupsLabel: "{count} grupos",
    systemDefaultCaption:
      "Usa el número de grupos disponible con mayor puntuación para cada punto de control.",
    analysisVariantsNotAvailable:
      "El análisis premium multivariante no estaba activado cuando se creó este punto de control.",
    fixedGroupCountUnavailable:
      "Agora no pudo formar {count} grupos significativos en el punto de control seleccionado.",
    recommendedDefaultUnavailable:
      "El modo automático aún no está disponible.",
    sameAsRecommendedDefault: "Igual que el modo automático",
    usesGroups: "Usa {count} grupos. Vuelve a Auto si no está disponible.",
    recommendedOptionCaption: "Recomendado",
    liveSnapshot: "Live",
    checkpointSnapshot: "Punto de control",
    pauseAtLatestCheckpoint: "Pausar en el último punto de control",
    returnToLiveAnalysis: "Volver al análisis en vivo",
    previousCheckpoint: "Punto de control anterior",
    nextCheckpoint: "Siguiente punto de control",
    recommendedAnalysisView: "Opción recomendada",
    availableGroups: "{count} grupos disponibles",
    availableOption: "Disponible",
    discouragedOption: "Desaconsejado",
    lockedOption: "Bloqueado",
    selectionScoreLabel: "Selección {score}/100",
    candidateIdLabel: "Candidato #{id}",
    resolvedGroupCountLabel: "Usa {count} grupos",
    silhouetteScoreLabel: "Claridad {score}/100",
    ...analysisViewHelpFallbackTranslations,
    learnMore: "Más información",
    goBack: "Volver",
    analysisViewModesSection: "Modos",
    analysisViewGroupCountsSection: "Números de grupos",
    analysisViewLearnMoreTitle: "Acerca de los números de grupos",
    facilitatorPreferenceCaption:
      "Usa el número de grupos del facilitador. Vuelve a Auto si no está disponible.",
    recommendedOption: "Recomendado",
    recommendedOptionDescription:
      "El número fijo de grupos con mayor puntuación de Auto para el punto de control actual.",
    fixedGroupCountOption: "Números de grupos específicos",
    fixedGroupCountOptionDescription:
      "Muestra exactamente ese número de grupos para el punto de control actual, o un estado vacío si no está disponible.",
    unavailableOption: "No disponible",
    unavailableOptionDescription:
      "Agora no pudo formar grupos significativos para este número de grupos en el punto de control seleccionado.",
    discouragedOptionDescription:
      "Este número de grupos tiene un resultado de análisis, pero es más débil que las alternativas en el punto de control seleccionado.",
    overallScoreLabel: "General {score}/100",
    clarityScoreLabel: "Claridad {score}/100",
    balanceScoreLabel: "Equilibrio {score}/100",
    overallScoreTitle: "General",
    clarityScoreTitle: "Claridad",
    balanceScoreTitle: "Equilibrio",
    overallScoreDescription:
      "Puntuación combinada de 0 a 100 usada para comparar números de grupos. Cuanto más alta, mejor.",
    clarityScoreDescription:
      "Puntuación de 0 a 100 sobre cuán distintos son los grupos entre sí. Cuanto más alta, mejor.",
    balanceScoreDescription:
      "Puntuación de 0 a 100 sobre cuán uniformemente se distribuyen los participantes entre grupos. Cuanto más alta, mejor.",
    checkpointTimelineLabel: "Cronología de puntos de control",
    checkpointTimelineStart: "Inicio",
    checkpointTimelineNow: "Ahora",
    checkpointReasonsLabel: "Marcadores del punto de control",
    checkpointReasonFirstDisplayableAnalysis: "Primer análisis",
    checkpointReasonFirstGroupCountAvailable: "{count} grupos disponibles",
    checkpointReasonDefaultGroupCountChanged: "Auto: {count} grupos",
    checkpointReasonParticipationMilestone: "> {count} participantes",
    checkpointReasonVoteMilestone: "> {count} votos",
    checkpointReasonParticipantCount: "{count} participantes",
    checkpointReasonVoteCount: "{count} votos",
    checkpointReasonConversationClosed: "Cerrado",
  },
  fa: {
    loadingAnalysis: "در حال بارگذاری تحلیل...",
    retryingAnalysis: "تلاش مجدد برای بارگذاری تحلیل...",
    analysisErrorTitle: "بارگذاری تحلیل ناموفق بود",
    analysisErrorMessage:
      "بارگذاری داده‌های تحلیل امکان‌پذیر نیست. لطفاً دوباره تلاش کنید.",
    noAnalysisData: "داده‌های تحلیل برای این گفتگو موجود نیست",
    retryAnalysis: "تلاش مجدد",
    generateReport: "تولید گزارش",
    report: "گزارش",
    analysisViewTitle: "تعداد گروه‌ها",
    analysisViewSortingCaption:
      "نحوه نمایش گروه‌های نظر را انتخاب کنید. امتیازها فقط برای نمای انتخاب‌شده هستند و ممکن است تغییر کنند.",
    facilitatorPreference: "ترجیح تسهیل‌گر",
    recommendedDefault: "Auto",
    groupsLabel: "{count} گروه",
    systemDefaultCaption:
      "برای هر نما از بالاترین تعداد گروه موجود از نظر امتیاز استفاده می‌کند.",
    analysisVariantsNotAvailable:
      "تحلیل چندمتغیره پریمیوم هنگام ایجاد این نما فعال نبود.",
    fixedGroupCountUnavailable:
      "Agora نتوانست در نمای انتخاب‌شده {count} گروه معنادار تشکیل دهد.",
    recommendedDefaultUnavailable: "حالت خودکار هنوز در دسترس نیست.",
    sameAsRecommendedDefault: "همان حالت خودکار",
    usesGroups: "از {count} گروه استفاده می‌کند. اگر در دسترس نباشد به Auto برمی‌گردد.",
    recommendedOptionCaption: "پیشنهادی",
    liveSnapshot: "زنده",
    checkpointSnapshot: "نقطه بررسی",
    pauseAtLatestCheckpoint: "توقف در آخرین نقطه بررسی",
    returnToLiveAnalysis: "بازگشت به تحلیل زنده",
    previousCheckpoint: "نقطه بررسی قبلی",
    nextCheckpoint: "نقطه بررسی بعدی",
    recommendedAnalysisView: "گزینه پیشنهادی",
    availableGroups: "{count} گروه در دسترس",
    availableOption: "در دسترس",
    discouragedOption: "توصیه‌نشده",
    lockedOption: "قفل‌شده",
    selectionScoreLabel: "انتخاب {score}/100",
    candidateIdLabel: "نامزد #{id}",
    resolvedGroupCountLabel: "از {count} گروه استفاده می‌کند",
    silhouetteScoreLabel: "وضوح {score}/100",
    ...analysisViewHelpFallbackTranslations,
    learnMore: "بیشتر بدانید",
    goBack: "بازگشت",
    analysisViewModesSection: "حالت‌ها",
    analysisViewGroupCountsSection: "تعداد گروه‌ها",
    analysisViewLearnMoreTitle: "درباره تعداد گروه‌ها",
    facilitatorPreferenceCaption:
      "از تعداد گروه انتخاب‌شده توسط تسهیل‌گر استفاده می‌کند. اگر در دسترس نباشد به Auto برمی‌گردد.",
    recommendedOption: "پیشنهادی",
    recommendedOptionDescription:
      "تعداد گروه ثابت با بالاترین امتیاز Auto برای نمای فعلی.",
    fixedGroupCountOption: "تعداد گروه مشخص",
    fixedGroupCountOptionDescription:
      "دقیقاً همین تعداد گروه را برای نمای فعلی نشان می‌دهد، یا اگر در دسترس نباشد حالت خالی نشان می‌دهد.",
    unavailableOption: "در دسترس نیست",
    unavailableOptionDescription:
      "Agora نتوانست برای این تعداد گروه در نمای انتخاب‌شده گروه‌های معنادار تشکیل دهد.",
    discouragedOptionDescription:
      "این تعداد گروه نتیجه تحلیل دارد، اما نتیجه آن در نمای انتخاب‌شده از گزینه‌های دیگر ضعیف‌تر است.",
    overallScoreLabel: "کلی {score}/100",
    clarityScoreLabel: "وضوح {score}/100",
    balanceScoreLabel: "توازن {score}/100",
    overallScoreTitle: "کلی",
    clarityScoreTitle: "وضوح",
    balanceScoreTitle: "توازن",
    overallScoreDescription:
      "امتیاز ترکیبی 0 تا 100 برای مقایسه تعداد گروه‌ها. هرچه بالاتر، بهتر.",
    clarityScoreDescription:
      "امتیاز 0 تا 100 برای میزان تمایز گروه‌ها از یکدیگر. هرچه بالاتر، بهتر.",
    balanceScoreDescription:
      "امتیاز 0 تا 100 برای میزان توزیع یکنواخت شرکت‌کنندگان بین گروه‌ها. هرچه بالاتر، بهتر.",
    checkpointTimelineLabel: "خط زمانی نقطه های بررسی",
    checkpointTimelineStart: "شروع",
    checkpointTimelineNow: "اکنون",
    checkpointReasonsLabel: "نشانگرهای نقطه بررسی",
    checkpointReasonFirstDisplayableAnalysis: "اولین تحلیل",
    checkpointReasonFirstGroupCountAvailable: "{count} گروه در دسترس",
    checkpointReasonDefaultGroupCountChanged: "خودکار: {count} گروه",
    checkpointReasonParticipationMilestone: "> {count} شرکت کننده",
    checkpointReasonVoteMilestone: "> {count} رای",
    checkpointReasonParticipantCount: "{count} شرکت کننده",
    checkpointReasonVoteCount: "{count} رای",
    checkpointReasonConversationClosed: "بسته",
  },
  fr: {
    loadingAnalysis: "Chargement de l'analyse...",
    retryingAnalysis: "Nouvelle tentative de chargement de l'analyse...",
    analysisErrorTitle: "Échec du chargement de l'analyse",
    analysisErrorMessage:
      "Impossible de charger les données d'analyse. Veuillez réessayer.",
    noAnalysisData:
      "Les données d'analyse ne sont pas disponibles pour cette conversation",
    retryAnalysis: "Réessayer le chargement",
    generateReport: "Générer le rapport",
    report: "Rapport",
    analysisViewTitle: "Nombre de groupes",
    analysisViewSortingCaption:
      "Choisissez comment afficher les groupes d'opinion. Les scores ne valent que pour le jalon sélectionné et peuvent changer.",
    facilitatorPreference: "Préférence du facilitateur",
    recommendedDefault: "Auto",
    groupsLabel: "{count} groupes",
    systemDefaultCaption:
      "Utilise le nombre de groupes disponible le mieux noté pour chaque jalon.",
    analysisVariantsNotAvailable:
      "L'analyse premium multi-variante n'était pas activée au moment de la création de ce jalon.",
    fixedGroupCountUnavailable:
      "Agora n’a pas pu former {count} groupes pertinents dans le jalon sélectionné.",
    recommendedDefaultUnavailable:
      "Le mode automatique n'est pas encore disponible.",
    sameAsRecommendedDefault: "Identique au mode automatique",
    usesGroups: "Utilise {count} groupes. Revient à Auto si indisponible.",
    recommendedOptionCaption: "Recommandé",
    liveSnapshot: "Live",
    checkpointSnapshot: "Jalon",
    pauseAtLatestCheckpoint: "Mettre en pause au dernier jalon",
    returnToLiveAnalysis: "Revenir à l'analyse en direct",
    previousCheckpoint: "Jalon précédent",
    nextCheckpoint: "Jalon suivant",
    recommendedAnalysisView: "Recommandé",
    availableGroups: "{count} groupes disponibles",
    availableOption: "Disponible",
    discouragedOption: "Déconseillé",
    lockedOption: "Verrouillé",
    selectionScoreLabel: "Sélection {score}/100",
    candidateIdLabel: "Candidat #{id}",
    resolvedGroupCountLabel: "Utilise {count} groupes",
    silhouetteScoreLabel: "Clarté {score}/100",
    ...analysisViewHelpFallbackTranslations,
    learnMore: "En savoir plus",
    goBack: "Retour",
    analysisViewModesSection: "Modes",
    analysisViewGroupCountsSection: "Nombres de groupes",
    analysisViewLearnMoreTitle: "À propos des nombres de groupes",
    facilitatorPreferenceCaption:
      "Utilise le nombre de groupes choisi par le facilitateur. Revient à Auto si indisponible.",
    recommendedOption: "Recommandé",
    recommendedOptionDescription:
      "Le nombre de groupes fixe le mieux noté par Auto pour le jalon actuel.",
    fixedGroupCountOption: "Nombres de groupes précis",
    fixedGroupCountOptionDescription:
      "Affiche exactement ce nombre de groupes pour le jalon actuel, ou un état vide s'il est indisponible.",
    unavailableOption: "Indisponible",
    unavailableOptionDescription:
      "Agora n'a pas pu former de groupes pertinents pour ce nombre de groupes dans le jalon sélectionné.",
    discouragedOptionDescription:
      "Ce nombre de groupes a un résultat d'analyse, mais ce résultat est plus faible que les autres options dans le jalon sélectionné.",
    overallScoreLabel: "Global {score}/100",
    clarityScoreLabel: "Clarté {score}/100",
    balanceScoreLabel: "Équilibre {score}/100",
    overallScoreTitle: "Global",
    clarityScoreTitle: "Clarté",
    balanceScoreTitle: "Équilibre",
    overallScoreDescription:
      "Score combiné de 0 à 100 utilisé pour comparer les nombres de groupes. Plus il est élevé, mieux c'est.",
    clarityScoreDescription:
      "Score de 0 à 100 indiquant à quel point les groupes sont distincts les uns des autres. Plus il est élevé, mieux c'est.",
    balanceScoreDescription:
      "Score de 0 à 100 indiquant à quel point les participants sont répartis équitablement entre les groupes. Plus il est élevé, mieux c'est.",
    checkpointTimelineLabel: "Chronologie des jalons",
    checkpointTimelineStart: "Début",
    checkpointTimelineNow: "Maintenant",
    checkpointReasonsLabel: "Marqueurs du jalon",
    checkpointReasonFirstDisplayableAnalysis: "Première analyse",
    checkpointReasonFirstGroupCountAvailable: "{count} groupes disponibles",
    checkpointReasonDefaultGroupCountChanged: "Auto : {count} groupes",
    checkpointReasonParticipationMilestone: "> {count} participants",
    checkpointReasonVoteMilestone: "> {count} votes",
    checkpointReasonParticipantCount: "{count} participants",
    checkpointReasonVoteCount: "{count} votes",
    checkpointReasonConversationClosed: "Fermée",
  },
  "zh-Hans": {
    loadingAnalysis: "正在加载分析...",
    retryingAnalysis: "正在重试加载分析...",
    analysisErrorTitle: "分析加载失败",
    analysisErrorMessage: "无法加载分析数据。请重试。",
    noAnalysisData: "此对话没有可用的分析数据",
    retryAnalysis: "重试加载",
    generateReport: "生成报告",
    report: "报告",
    analysisViewTitle: "群组数量",
    analysisViewSortingCaption:
      "选择意见群组的显示方式。分数仅适用于所选检查点，且可能会变化。",
    facilitatorPreference: "主持人偏好",
    recommendedDefault: "Auto",
    groupsLabel: "{count} 个群组",
    systemDefaultCaption: "为每个检查点使用评分最高的可用群组数量。",
    analysisVariantsNotAvailable:
      "创建此检查点时未启用高级多变体分析。",
    fixedGroupCountUnavailable:
      "Agora 无法在所选检查点中形成 {count} 个有意义的群组。",
    recommendedDefaultUnavailable: "自动模式尚不可用。",
    sameAsRecommendedDefault: "与自动模式相同",
    usesGroups: "使用 {count} 个群组。不可用时回退到 Auto。",
    recommendedOptionCaption: "推荐",
    liveSnapshot: "实时",
    checkpointSnapshot: "检查点",
    pauseAtLatestCheckpoint: "暂停在最新检查点",
    returnToLiveAnalysis: "返回实时分析",
    previousCheckpoint: "上一个检查点",
    nextCheckpoint: "下一个检查点",
    recommendedAnalysisView: "推荐选项",
    availableGroups: "{count} 个可用群组",
    availableOption: "可用",
    discouragedOption: "不建议",
    lockedOption: "已锁定",
    selectionScoreLabel: "选择 {score}/100",
    candidateIdLabel: "候选 #{id}",
    resolvedGroupCountLabel: "使用 {count} 个群组",
    silhouetteScoreLabel: "清晰度 {score}/100",
    ...analysisViewHelpFallbackTranslations,
    learnMore: "了解更多",
    goBack: "返回",
    analysisViewModesSection: "模式",
    analysisViewGroupCountsSection: "群组数量",
    analysisViewLearnMoreTitle: "关于群组数量",
    facilitatorPreferenceCaption:
      "使用主持人选择的群组数量。不可用时回退到 Auto。",
    recommendedOption: "推荐",
    recommendedOptionDescription:
      "当前检查点中 Auto 评分最高的固定群组数量。",
    fixedGroupCountOption: "指定群组数量",
    fixedGroupCountOptionDescription:
      "为当前检查点显示确切数量的群组；不可用时显示空状态。",
    unavailableOption: "不可用",
    unavailableOptionDescription:
      "Agora 无法在所选检查点中为此群组数量形成有意义的群组。",
    discouragedOptionDescription:
      "此群组数量有分析结果，但在所选检查点中弱于其他选项。",
    overallScoreLabel: "总体 {score}/100",
    clarityScoreLabel: "清晰度 {score}/100",
    balanceScoreLabel: "平衡 {score}/100",
    overallScoreTitle: "总体",
    clarityScoreTitle: "清晰度",
    balanceScoreTitle: "平衡",
    overallScoreDescription:
      "用于比较群组数量的 0-100 综合分数。越高越好。",
    clarityScoreDescription:
      "表示群组之间区分程度的 0-100 分数。越高越好。",
    balanceScoreDescription:
      "表示参与者在各群组之间分布均匀程度的 0-100 分数。越高越好。",
    checkpointTimelineLabel: "检查点时间线",
    checkpointTimelineStart: "开始",
    checkpointTimelineNow: "现在",
    checkpointReasonsLabel: "检查点标记",
    checkpointReasonFirstDisplayableAnalysis: "首次分析",
    checkpointReasonFirstGroupCountAvailable: "{count} 个群组可用",
    checkpointReasonDefaultGroupCountChanged: "自动：{count} 个群组",
    checkpointReasonParticipationMilestone: "> {count} 名参与者",
    checkpointReasonVoteMilestone: "> {count} 票",
    checkpointReasonParticipantCount: "{count} 名参与者",
    checkpointReasonVoteCount: "{count} 票",
    checkpointReasonConversationClosed: "已关闭",
  },
  "zh-Hant": {
    loadingAnalysis: "正在載入分析...",
    retryingAnalysis: "正在重試載入分析...",
    analysisErrorTitle: "分析載入失敗",
    analysisErrorMessage: "無法載入分析資料。請重試。",
    noAnalysisData: "此對話沒有可用的分析資料",
    retryAnalysis: "重試載入",
    generateReport: "生成報告",
    report: "報告",
    analysisViewTitle: "群組數量",
    analysisViewSortingCaption:
      "選擇意見群組的顯示方式。分數僅適用於所選檢查點，且可能會變化。",
    facilitatorPreference: "主持人偏好",
    recommendedDefault: "Auto",
    groupsLabel: "{count} 個群組",
    systemDefaultCaption: "為每個檢查點使用評分最高的可用群組數量。",
    analysisVariantsNotAvailable:
      "建立此檢查點時未啟用進階多變體分析。",
    fixedGroupCountUnavailable:
      "Agora 無法在所選檢查點中形成 {count} 個有意義的群組。",
    recommendedDefaultUnavailable: "自動模式尚不可用。",
    sameAsRecommendedDefault: "與自動模式相同",
    usesGroups: "使用 {count} 個群組。不可用時回退到 Auto。",
    recommendedOptionCaption: "推薦",
    liveSnapshot: "即時",
    checkpointSnapshot: "檢查點",
    pauseAtLatestCheckpoint: "暫停在最新檢查點",
    returnToLiveAnalysis: "返回即時分析",
    previousCheckpoint: "上一個檢查點",
    nextCheckpoint: "下一個檢查點",
    recommendedAnalysisView: "推薦選項",
    availableGroups: "{count} 個可用群組",
    availableOption: "可用",
    discouragedOption: "不建議",
    lockedOption: "已鎖定",
    selectionScoreLabel: "選擇 {score}/100",
    candidateIdLabel: "候選 #{id}",
    resolvedGroupCountLabel: "使用 {count} 個群組",
    silhouetteScoreLabel: "清晰度 {score}/100",
    ...analysisViewHelpFallbackTranslations,
    learnMore: "了解更多",
    goBack: "返回",
    analysisViewModesSection: "模式",
    analysisViewGroupCountsSection: "群組數量",
    analysisViewLearnMoreTitle: "關於群組數量",
    facilitatorPreferenceCaption:
      "使用主持人選擇的群組數量。不可用時回退到 Auto。",
    recommendedOption: "推薦",
    recommendedOptionDescription:
      "目前檢查點中 Auto 評分最高的固定群組數量。",
    fixedGroupCountOption: "指定群組數量",
    fixedGroupCountOptionDescription:
      "為目前檢查點顯示確切數量的群組；不可用時顯示空狀態。",
    unavailableOption: "不可用",
    unavailableOptionDescription:
      "Agora 無法在所選檢查點中為此群組數量形成有意義的群組。",
    discouragedOptionDescription:
      "此群組數量有分析結果，但在所選檢查點中弱於其他選項。",
    overallScoreLabel: "整體 {score}/100",
    clarityScoreLabel: "清晰度 {score}/100",
    balanceScoreLabel: "平衡 {score}/100",
    overallScoreTitle: "整體",
    clarityScoreTitle: "清晰度",
    balanceScoreTitle: "平衡",
    overallScoreDescription:
      "用於比較群組數量的 0-100 綜合分數。越高越好。",
    clarityScoreDescription:
      "表示群組之間區分程度的 0-100 分數。越高越好。",
    balanceScoreDescription:
      "表示參與者在各群組之間分布均勻程度的 0-100 分數。越高越好。",
    checkpointTimelineLabel: "檢查點時間線",
    checkpointTimelineStart: "開始",
    checkpointTimelineNow: "現在",
    checkpointReasonsLabel: "檢查點標記",
    checkpointReasonFirstDisplayableAnalysis: "首次分析",
    checkpointReasonFirstGroupCountAvailable: "{count} 個群組可用",
    checkpointReasonDefaultGroupCountChanged: "自動：{count} 個群組",
    checkpointReasonParticipationMilestone: "> {count} 名參與者",
    checkpointReasonVoteMilestone: "> {count} 票",
    checkpointReasonParticipantCount: "{count} 名參與者",
    checkpointReasonVoteCount: "{count} 票",
    checkpointReasonConversationClosed: "已關閉",
  },
  he: {
    loadingAnalysis: "...טוען ניתוח",
    retryingAnalysis: "מנסה שוב לטעון ניתוח...",
    analysisErrorTitle: "טעינת הניתוח נכשלה",
    analysisErrorMessage: "לא ניתן לטעון את נתוני הניתוח. אנא נסו שוב.",
    noAnalysisData: "נתוני ניתוח אינם זמינים לשיחה זו",
    retryAnalysis: "נסה שוב",
    generateReport: "יצירת דיווח",
    report: "דיווח",
    analysisViewTitle: "מספר קבוצות",
    analysisViewSortingCaption:
      "בחרו כיצד קבוצות הדעה מוצגות. הציונים תקפים רק לנקודת הביקורת שנבחרה ועשויים להשתנות.",
    facilitatorPreference: "העדפת המנחה",
    recommendedDefault: "Auto",
    groupsLabel: "{count} קבוצות",
    systemDefaultCaption:
      "משתמשת במספר הקבוצות הזמין בעל הציון הגבוה ביותר לכל נקודת ביקורת.",
    analysisVariantsNotAvailable:
      "ניתוח פרימיום מרובה-וריאנטים לא היה פעיל כאשר נקודת הביקורת הזו נוצרה.",
    fixedGroupCountUnavailable:
      "Agora לא הצליחה ליצור {count} קבוצות משמעותיות בנקודת הביקורת שנבחרה.",
    recommendedDefaultUnavailable: "המצב האוטומטי עדיין לא זמין.",
    sameAsRecommendedDefault: "זהה למצב אוטומטי",
    usesGroups: "משתמש ב-{count} קבוצות. חוזר ל-Auto אם לא זמין.",
    recommendedOptionCaption: "מומלץ",
    liveSnapshot: "חי",
    checkpointSnapshot: "נקודת ביקורת",
    pauseAtLatestCheckpoint: "השהיה בנקודת הביקורת האחרונה",
    returnToLiveAnalysis: "חזרה לניתוח חי",
    previousCheckpoint: "נקודת ביקורת קודמת",
    nextCheckpoint: "נקודת ביקורת הבאה",
    recommendedAnalysisView: "אפשרות מומלצת",
    availableGroups: "{count} קבוצות זמינות",
    availableOption: "זמין",
    discouragedOption: "לא מומלץ",
    lockedOption: "נעול",
    selectionScoreLabel: "בחירה {score}/100",
    candidateIdLabel: "מועמד #{id}",
    resolvedGroupCountLabel: "משתמש ב-{count} קבוצות",
    silhouetteScoreLabel: "בהירות {score}/100",
    ...analysisViewHelpFallbackTranslations,
    learnMore: "מידע נוסף",
    goBack: "חזרה",
    analysisViewModesSection: "מצבים",
    analysisViewGroupCountsSection: "מספרי קבוצות",
    analysisViewLearnMoreTitle: "על מספרי קבוצות",
    facilitatorPreferenceCaption:
      "משתמש במספר הקבוצות של המנחה. חוזר ל-Auto אם לא זמין.",
    recommendedOption: "מומלץ",
    recommendedOptionDescription:
      "מספר הקבוצות הקבוע בעל הציון הגבוה ביותר של Auto עבור נקודת הביקורת הנוכחית.",
    fixedGroupCountOption: "מספרי קבוצות מסוימים",
    fixedGroupCountOptionDescription:
      "מציג בדיוק מספר זה של קבוצות עבור נקודת הביקורת הנוכחית, או מצב ריק אם אינו זמין.",
    unavailableOption: "לא זמין",
    unavailableOptionDescription:
      "Agora לא הצליחה ליצור קבוצות משמעותיות עבור מספר קבוצות זה בנקודת הביקורת שנבחרה.",
    discouragedOptionDescription:
      "למספר קבוצות זה יש תוצאת ניתוח, אך היא חלשה מהחלופות בנקודת הביקורת שנבחרה.",
    overallScoreLabel: "כללי {score}/100",
    clarityScoreLabel: "בהירות {score}/100",
    balanceScoreLabel: "איזון {score}/100",
    overallScoreTitle: "כללי",
    clarityScoreTitle: "בהירות",
    balanceScoreTitle: "איזון",
    overallScoreDescription:
      "ציון משולב מ-0 עד 100 המשמש להשוואת מספרי קבוצות. גבוה יותר טוב יותר.",
    clarityScoreDescription:
      "ציון מ-0 עד 100 למידת ההבחנה בין הקבוצות. גבוה יותר טוב יותר.",
    balanceScoreDescription:
      "ציון מ-0 עד 100 למידת האחידות של חלוקת המשתתפים בין הקבוצות. גבוה יותר טוב יותר.",
    checkpointTimelineLabel: "ציר זמן של נקודות ביקורת",
    checkpointTimelineStart: "התחלה",
    checkpointTimelineNow: "עכשיו",
    checkpointReasonsLabel: "סימוני נקודת ביקורת",
    checkpointReasonFirstDisplayableAnalysis: "ניתוח ראשון",
    checkpointReasonFirstGroupCountAvailable: "{count} קבוצות זמינות",
    checkpointReasonDefaultGroupCountChanged: "אוטומטי: {count} קבוצות",
    checkpointReasonParticipationMilestone: "> {count} משתתפים",
    checkpointReasonVoteMilestone: "> {count} הצבעות",
    checkpointReasonParticipantCount: "{count} משתתפים",
    checkpointReasonVoteCount: "{count} הצבעות",
    checkpointReasonConversationClosed: "סגור",
  },
  ja: {
    loadingAnalysis: "分析を読み込み中...",
    retryingAnalysis: "分析の読み込みを再試行中...",
    analysisErrorTitle: "分析の読み込みに失敗しました",
    analysisErrorMessage:
      "分析データを読み込めませんでした。もう一度お試しください。",
    noAnalysisData: "この会話の分析データは利用できません",
    retryAnalysis: "読み込み再試行",
    generateReport: "レポートを生成",
    report: "レポート",
    analysisViewTitle: "グループ数",
    analysisViewSortingCaption:
      "意見グループの表示方法を選択します。スコアは選択中のチェックポイントだけのもので、変わることがあります。",
    facilitatorPreference: "ファシリテーターの設定",
    recommendedDefault: "Auto",
    groupsLabel: "{count} グループ",
    systemDefaultCaption:
      "各チェックポイントで利用可能な最高スコアのグループ数を使用します。",
    analysisVariantsNotAvailable:
      "このチェックポイントの作成時には、プレミアムのマルチバリアント分析は有効ではありませんでした。",
    fixedGroupCountUnavailable:
      "Agora は選択中のチェックポイントで意味のある {count} グループを形成できませんでした。",
    recommendedDefaultUnavailable: "自動モードはまだ利用できません。",
    sameAsRecommendedDefault: "自動モードと同じ",
    usesGroups: "{count} グループを使用します。利用できない場合は Auto に戻ります。",
    recommendedOptionCaption: "推奨",
    liveSnapshot: "ライブ",
    checkpointSnapshot: "チェックポイント",
    pauseAtLatestCheckpoint: "最新チェックポイントで一時停止",
    returnToLiveAnalysis: "ライブ分析に戻る",
    previousCheckpoint: "前のチェックポイント",
    nextCheckpoint: "次のチェックポイント",
    recommendedAnalysisView: "推奨オプション",
    availableGroups: "{count} 個の利用可能なグループ",
    availableOption: "利用可能",
    discouragedOption: "非推奨",
    lockedOption: "ロック中",
    selectionScoreLabel: "選択 {score}/100",
    candidateIdLabel: "候補 #{id}",
    resolvedGroupCountLabel: "{count} グループを使用",
    silhouetteScoreLabel: "明瞭さ {score}/100",
    ...analysisViewHelpFallbackTranslations,
    learnMore: "詳しく見る",
    goBack: "戻る",
    analysisViewModesSection: "モード",
    analysisViewGroupCountsSection: "グループ数",
    analysisViewLearnMoreTitle: "グループ数について",
    facilitatorPreferenceCaption:
      "ファシリテーターのグループ数を使用します。利用できない場合は Auto に戻ります。",
    recommendedOption: "推奨",
    recommendedOptionDescription:
      "現在のチェックポイントで Auto が選ぶ最高スコアの固定グループ数です。",
    fixedGroupCountOption: "指定グループ数",
    fixedGroupCountOptionDescription:
      "現在のチェックポイントでその数のグループを正確に表示します。利用できない場合は空の状態を表示します。",
    unavailableOption: "利用不可",
    unavailableOptionDescription:
      "Agora は選択中のチェックポイントでこのグループ数の意味のあるグループを形成できませんでした。",
    discouragedOptionDescription:
      "このグループ数には分析結果がありますが、選択中のチェックポイントでは他の候補より弱い結果です。",
    overallScoreLabel: "総合 {score}/100",
    clarityScoreLabel: "明瞭さ {score}/100",
    balanceScoreLabel: "バランス {score}/100",
    overallScoreTitle: "総合",
    clarityScoreTitle: "明瞭さ",
    balanceScoreTitle: "バランス",
    overallScoreDescription:
      "グループ数を比較するための 0-100 の総合スコアです。高いほど良いです。",
    clarityScoreDescription:
      "グループ同士がどれだけ明確に分かれているかを示す 0-100 のスコアです。高いほど良いです。",
    balanceScoreDescription:
      "参加者がグループ間でどれだけ均等に分布しているかを示す 0-100 のスコアです。高いほど良いです。",
    checkpointTimelineLabel: "チェックポイントのタイムライン",
    checkpointTimelineStart: "開始",
    checkpointTimelineNow: "今",
    checkpointReasonsLabel: "チェックポイントの目印",
    checkpointReasonFirstDisplayableAnalysis: "最初の分析",
    checkpointReasonFirstGroupCountAvailable: "{count} グループが利用可能",
    checkpointReasonDefaultGroupCountChanged: "自動: {count} グループ",
    checkpointReasonParticipationMilestone: "> {count} 人の参加者",
    checkpointReasonVoteMilestone: "> {count} 票",
    checkpointReasonParticipantCount: "{count} 人の参加者",
    checkpointReasonVoteCount: "{count} 票",
    checkpointReasonConversationClosed: "終了",
  },
  ky: {
    loadingAnalysis: "Анализ жүктөлүүдө...",
    retryingAnalysis: "Анализ кайра жүктөлүүдө...",
    analysisErrorTitle: "Анализди жүктөө ишке ашкан жок",
    analysisErrorMessage:
      "Анализ маалыматтарын жүктөө мүмкүн болбоду. Кайра аракет кылыңыз.",
    noAnalysisData: "Бул талкуу үчүн анализ маалыматтары жеткиликтүү эмес",
    retryAnalysis: "Кайра жүктөө",
    generateReport: "Отчёт түзүү",
    report: "Отчёт",
    analysisViewTitle: "Топ саны",
    analysisViewSortingCaption:
      "Пикир топтору кантип көрсөтүлөрүн тандаңыз. Упайлар тандалган текшерүү чекити үчүн гана жана өзгөрүшү мүмкүн.",
    facilitatorPreference: "Фасилитатордун тандоосу",
    recommendedDefault: "Auto",
    groupsLabel: "{count} топ",
    systemDefaultCaption:
      "Ар бир текшерүү чекити үчүн жеткиликтүү эң жогорку упай алган топ санын колдонот.",
    analysisVariantsNotAvailable:
      "Бул текшерүү чекити түзүлгөн учурда премиум көп варианттуу анализ иштетилген эмес.",
    fixedGroupCountUnavailable:
      "Agora тандалган текшерүү чекитинде {count} маанилүү топ түзө алган жок.",
    recommendedDefaultUnavailable:
      "Автоматтык режим азырынча жеткиликтүү эмес.",
    sameAsRecommendedDefault: "Автоматтык режим менен бирдей",
    usesGroups: "{count} топ колдонот. Жеткиликтүү болбосо Auto режимине кайтат.",
    recommendedOptionCaption: "Сунушталган",
    liveSnapshot: "Live",
    checkpointSnapshot: "Текшерүү чекити",
    pauseAtLatestCheckpoint: "Акыркы текшерүү чекитинде токтотуу",
    returnToLiveAnalysis: "Жандуу анализге кайтуу",
    previousCheckpoint: "Мурунку текшерүү чекити",
    nextCheckpoint: "Кийинки текшерүү чекити",
    recommendedAnalysisView: "Сунушталган вариант",
    availableGroups: "{count} жеткиликтүү топ",
    availableOption: "Жеткиликтүү",
    discouragedOption: "Сунушталбайт",
    lockedOption: "Кулпуланган",
    selectionScoreLabel: "Тандоо {score}/100",
    candidateIdLabel: "Талапкер #{id}",
    resolvedGroupCountLabel: "{count} топ колдонот",
    silhouetteScoreLabel: "Тактык {score}/100",
    ...analysisViewHelpFallbackTranslations,
    learnMore: "Көбүрөөк билүү",
    goBack: "Артка",
    analysisViewModesSection: "Режимдер",
    analysisViewGroupCountsSection: "Топ сандары",
    analysisViewLearnMoreTitle: "Топ сандары жөнүндө",
    facilitatorPreferenceCaption:
      "Фасилитатор тандаган топ санын колдонот. Жеткиликтүү болбосо Auto режимине кайтат.",
    recommendedOption: "Сунушталган",
    recommendedOptionDescription:
      "Учурдагы текшерүү чекити үчүн Auto режиминдеги эң жогорку упай алган туруктуу топ саны.",
    fixedGroupCountOption: "Так топ сандары",
    fixedGroupCountOptionDescription:
      "Учурдагы текшерүү чекити үчүн так ошол сандагы топторду көрсөтөт, же жеткиликтүү болбосо бош абалды көрсөтөт.",
    unavailableOption: "Жеткиликтүү эмес",
    unavailableOptionDescription:
      "Agora тандалган текшерүү чекитинде бул топ саны үчүн маанилүү топторду түзө алган жок.",
    discouragedOptionDescription:
      "Бул топ санынын анализ жыйынтыгы бар, бирок тандалган текшерүү чекитинде башка варианттардан алсызыраак.",
    overallScoreLabel: "Жалпы {score}/100",
    clarityScoreLabel: "Тактык {score}/100",
    balanceScoreLabel: "Тең салмак {score}/100",
    overallScoreTitle: "Жалпы",
    clarityScoreTitle: "Тактык",
    balanceScoreTitle: "Тең салмак",
    overallScoreDescription:
      "Топ сандарын салыштыруу үчүн колдонулган 0-100 бириккен упай. Жогору болгону жакшы.",
    clarityScoreDescription:
      "Топтор бири-биринен канчалык айырмаланарын көрсөткөн 0-100 упай. Жогору болгону жакшы.",
    balanceScoreDescription:
      "Катышуучулар топтор арасында канчалык тең бөлүштүрүлгөнүн көрсөткөн 0-100 упай. Жогору болгону жакшы.",
    checkpointTimelineLabel: "Текшерүү чекиттеринин убакыт сызыгы",
    checkpointTimelineStart: "Башталыш",
    checkpointTimelineNow: "Азыр",
    checkpointReasonsLabel: "Текшерүү чекитинин белгилери",
    checkpointReasonFirstDisplayableAnalysis: "Биринчи анализ",
    checkpointReasonFirstGroupCountAvailable: "{count} топ жеткиликтүү",
    checkpointReasonDefaultGroupCountChanged: "Авто: {count} топ",
    checkpointReasonParticipationMilestone: "> {count} катышуучу",
    checkpointReasonVoteMilestone: "> {count} добуш",
    checkpointReasonParticipantCount: "{count} катышуучу",
    checkpointReasonVoteCount: "{count} добуш",
    checkpointReasonConversationClosed: "Жабык",
  },
  ru: {
    loadingAnalysis: "Загрузка анализа...",
    retryingAnalysis: "Повторная загрузка анализа...",
    analysisErrorTitle: "Не удалось загрузить анализ",
    analysisErrorMessage:
      "Не удалось загрузить данные анализа. Пожалуйста, попробуйте снова.",
    noAnalysisData: "Данные анализа недоступны для этого обсуждения",
    retryAnalysis: "Повторить загрузку",
    generateReport: "Сформировать отчёт",
    report: "Отчёт",
    analysisViewTitle: "Количество групп",
    analysisViewSortingCaption:
      "Выберите, как показывать группы мнений. Оценки относятся только к выбранной контрольной точке и могут измениться.",
    facilitatorPreference: "Предпочтение фасилитатора",
    recommendedDefault: "Auto",
    groupsLabel: "{count} групп",
    systemDefaultCaption:
      "Использует доступное количество групп с наивысшей оценкой для каждой контрольной точки.",
    analysisVariantsNotAvailable:
      "Премиальный многовариантный анализ не был включён на момент создания этой контрольной точки.",
    fixedGroupCountUnavailable:
      "Agora не смогла сформировать {count} значимых групп в выбранной контрольной точке.",
    recommendedDefaultUnavailable: "Режим «Авто» пока недоступен.",
    sameAsRecommendedDefault: "Совпадает с режимом «Авто»",
    usesGroups: "Использует {count} групп. Возвращается к Auto, если недоступно.",
    recommendedOptionCaption: "Рекомендуется",
    liveSnapshot: "Live",
    checkpointSnapshot: "Контрольная точка",
    pauseAtLatestCheckpoint: "Пауза на последней контрольной точке",
    returnToLiveAnalysis: "Вернуться к анализу в реальном времени",
    previousCheckpoint: "Предыдущая контрольная точка",
    nextCheckpoint: "Следующая контрольная точка",
    recommendedAnalysisView: "Рекомендуемый вариант",
    availableGroups: "{count} доступных групп",
    availableOption: "Доступно",
    discouragedOption: "Не рекомендуется",
    lockedOption: "Заблокировано",
    selectionScoreLabel: "Выбор {score}/100",
    candidateIdLabel: "Кандидат #{id}",
    resolvedGroupCountLabel: "Использует {count} групп",
    silhouetteScoreLabel: "Ясность {score}/100",
    ...analysisViewHelpFallbackTranslations,
    learnMore: "Подробнее",
    goBack: "Назад",
    analysisViewModesSection: "Режимы",
    analysisViewGroupCountsSection: "Количество групп",
    analysisViewLearnMoreTitle: "О количестве групп",
    facilitatorPreferenceCaption:
      "Использует количество групп, выбранное фасилитатором. Возвращается к Auto, если недоступно.",
    recommendedOption: "Рекомендуется",
    recommendedOptionDescription:
      "Фиксированное количество групп с наивысшей оценкой Auto для текущей контрольной точки.",
    fixedGroupCountOption: "Конкретное количество групп",
    fixedGroupCountOptionDescription:
      "Показывает ровно это количество групп для текущей контрольной точки или пустое состояние, если оно недоступно.",
    unavailableOption: "Недоступно",
    unavailableOptionDescription:
      "Agora не смогла сформировать значимые группы для этого количества групп в выбранной контрольной точке.",
    discouragedOptionDescription:
      "Для этого количества групп есть результат анализа, но он слабее альтернатив в выбранной контрольной точке.",
    overallScoreLabel: "Общая {score}/100",
    clarityScoreLabel: "Ясность {score}/100",
    balanceScoreLabel: "Баланс {score}/100",
    overallScoreTitle: "Общая",
    clarityScoreTitle: "Ясность",
    balanceScoreTitle: "Баланс",
    overallScoreDescription:
      "Комбинированная оценка 0-100 для сравнения количества групп. Чем выше, тем лучше.",
    clarityScoreDescription:
      "Оценка 0-100 того, насколько группы отличаются друг от друга. Чем выше, тем лучше.",
    balanceScoreDescription:
      "Оценка 0-100 того, насколько равномерно участники распределены между группами. Чем выше, тем лучше.",
    checkpointTimelineLabel: "Хронология контрольных точек",
    checkpointTimelineStart: "Старт",
    checkpointTimelineNow: "Сейчас",
    checkpointReasonsLabel: "Маркеры контрольной точки",
    checkpointReasonFirstDisplayableAnalysis: "Первый анализ",
    checkpointReasonFirstGroupCountAvailable: "{count} групп доступно",
    checkpointReasonDefaultGroupCountChanged: "Авто: {count} групп",
    checkpointReasonParticipationMilestone: "> {count} участников",
    checkpointReasonVoteMilestone: "> {count} голосов",
    checkpointReasonParticipantCount: "{count} участников",
    checkpointReasonVoteCount: "{count} голосов",
    checkpointReasonConversationClosed: "Закрыто",
  },
};
