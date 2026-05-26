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
  checkpointTimelineCheckpoint: string;
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
  analysisViewLearnMoreTitle: "About analysis views",
  facilitatorPreferenceCaption:
    "Uses the facilitator's group count. Falls back to Auto if unavailable.",
  recommendedOption: "Recommended",
  recommendedOptionDescription:
    "Auto's highest-scoring fixed group count for the current snapshot.",
  fixedGroupCountOption: "Fixed group counts",
  fixedGroupCountOptionDescription:
    "Shows exactly that many groups for the current snapshot, or an empty state if unavailable.",
  unavailableOption: "Unavailable",
  unavailableOptionDescription:
    "Agora could not form meaningful groups for this group count in the selected snapshot.",
  discouragedOptionDescription:
    "This group count has an analysis result, but the result is weaker than the alternatives in the selected snapshot.",
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
    analysisViewTitle: "Analysis view",
    analysisViewSortingCaption:
      "Choose how opinion groups are shown. Scores are only for the selected snapshot and may change.",
    facilitatorPreference: "Facilitator preference",
    recommendedDefault: "Auto",
    groupsLabel: "{count} groups",
    systemDefaultCaption:
      "Uses the highest-scoring available group count for each snapshot.",
    analysisVariantsNotAvailable: "This snapshot does not include variants.",
    fixedGroupCountUnavailable:
      "Agora could not form {count} meaningful groups in the selected snapshot.",
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
    analysisViewLearnMoreTitle: "About analysis views",
    facilitatorPreferenceCaption:
      "Uses the facilitator's group count. Falls back to Auto if unavailable.",
    recommendedOption: "Recommended",
    recommendedOptionDescription:
      "Auto's highest-scoring fixed group count for the current snapshot.",
    fixedGroupCountOption: "Fixed group counts",
    fixedGroupCountOptionDescription:
      "Shows exactly that many groups for the current snapshot, or an empty state if unavailable.",
    unavailableOption: "Unavailable",
    unavailableOptionDescription:
      "Agora could not form meaningful groups for this group count in the selected snapshot.",
    discouragedOptionDescription:
      "This group count has an analysis result, but the result is weaker than the alternatives in the selected snapshot.",
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
    checkpointTimelineCheckpoint: "Checkpoint {number}",
    checkpointTimelineNow: "Now",
    checkpointReasonsLabel: "Checkpoint markers",
    checkpointReasonFirstDisplayableAnalysis: "First analysis",
    checkpointReasonFirstGroupCountAvailable: "Group count available",
    checkpointReasonDefaultGroupCountChanged: "Default changed",
    checkpointReasonParticipationMilestone: "Participant milestone",
    checkpointReasonVoteMilestone: "Vote milestone",
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
    analysisViewTitle: "طريقة عرض التحليل",
    analysisViewSortingCaption: "يتم ترتيب أعداد المجموعات حسب جودة التحليل.",
    facilitatorPreference: "تفضيل الميسر",
    recommendedDefault: "الافتراضي الموصى به",
    groupsLabel: "{count} مجموعات",
    systemDefaultCaption: "يختار أفضل متغير لكل لقطة جديدة.",
    analysisVariantsNotAvailable: "لا تتضمن هذه اللقطة متغيرات.",
    fixedGroupCountUnavailable:
      "تعذر على Agora تشكيل {count} مجموعات ذات معنى لنقطة التحقق هذه.",
    recommendedDefaultUnavailable: "لا يوجد متغير موصى به متاح بعد.",
    sameAsRecommendedDefault: "مثل الافتراضي الموصى به",
    usesGroups: "يستخدم {count} مجموعات",
    recommendedOptionCaption: "أفضل ملاءمة إجمالية",
    liveSnapshot: "مباشر",
    checkpointSnapshot: "نقطة تحقق",
    pauseAtLatestCheckpoint: "إيقاف عند أحدث نقطة تحقق",
    returnToLiveAnalysis: "العودة إلى التحليل المباشر",
    previousCheckpoint: "نقطة التحقق السابقة",
    nextCheckpoint: "نقطة التحقق التالية",
    recommendedAnalysisView: "الخيار الموصى به",
    availableGroups: "{count} مجموعات متاحة",
    availableOption: "متاح",
    discouragedOption: "Discouraged",
    lockedOption: "Locked",
    selectionScoreLabel: "Selection {score}",
    candidateIdLabel: "Candidate #{id}",
    resolvedGroupCountLabel: "Uses {count} groups",
    silhouetteScoreLabel: "Separation {score}",
    ...analysisViewHelpFallbackTranslations,
    checkpointTimelineLabel: "الخط الزمني لنقاط التحقق",
    checkpointTimelineStart: "البداية",
    checkpointTimelineCheckpoint: "نقطة تحقق {number}",
    checkpointTimelineNow: "الآن",
    checkpointReasonsLabel: "علامات نقطة التحقق",
    checkpointReasonFirstDisplayableAnalysis: "أول تحليل",
    checkpointReasonFirstGroupCountAvailable: "عدد المجموعات متاح",
    checkpointReasonDefaultGroupCountChanged: "تغير الافتراضي",
    checkpointReasonParticipationMilestone: "مرحلة المشاركين",
    checkpointReasonVoteMilestone: "مرحلة التصويت",
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
    analysisViewTitle: "Vista de análisis",
    analysisViewSortingCaption:
      "Los recuentos de grupos se ordenan por calidad del análisis.",
    facilitatorPreference: "Preferencia del facilitador",
    recommendedDefault: "Predeterminado recomendado",
    groupsLabel: "{count} grupos",
    systemDefaultCaption:
      "Elige la variante con mejor puntuación para cada nueva instantánea.",
    analysisVariantsNotAvailable: "Esta instantánea no incluye variantes.",
    fixedGroupCountUnavailable:
      "Agora no pudo formar {count} grupos significativos para este punto de control.",
    recommendedDefaultUnavailable:
      "Aún no hay una variante recomendada disponible.",
    sameAsRecommendedDefault: "Igual que Predeterminado recomendado",
    usesGroups: "Usa {count} grupos",
    recommendedOptionCaption: "Mejor ajuste general",
    liveSnapshot: "En vivo",
    checkpointSnapshot: "Punto de control",
    pauseAtLatestCheckpoint: "Pausar en el último punto de control",
    returnToLiveAnalysis: "Volver al análisis en vivo",
    previousCheckpoint: "Punto de control anterior",
    nextCheckpoint: "Siguiente punto de control",
    recommendedAnalysisView: "Opción recomendada",
    availableGroups: "{count} grupos disponibles",
    availableOption: "Disponible",
    discouragedOption: "Discouraged",
    lockedOption: "Locked",
    selectionScoreLabel: "Selection {score}",
    candidateIdLabel: "Candidate #{id}",
    resolvedGroupCountLabel: "Uses {count} groups",
    silhouetteScoreLabel: "Separation {score}",
    ...analysisViewHelpFallbackTranslations,
    checkpointTimelineLabel: "Cronología de puntos de control",
    checkpointTimelineStart: "Inicio",
    checkpointTimelineCheckpoint: "Punto de control {number}",
    checkpointTimelineNow: "Ahora",
    checkpointReasonsLabel: "Marcadores del punto de control",
    checkpointReasonFirstDisplayableAnalysis: "Primer análisis",
    checkpointReasonFirstGroupCountAvailable: "Recuento de grupos disponible",
    checkpointReasonDefaultGroupCountChanged: "Predeterminado cambiado",
    checkpointReasonParticipationMilestone: "Hito de participantes",
    checkpointReasonVoteMilestone: "Hito de votos",
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
    analysisViewTitle: "نمای تحلیل",
    analysisViewSortingCaption:
      "تعداد گروه‌ها بر اساس کیفیت تحلیل مرتب می‌شوند.",
    facilitatorPreference: "ترجیح تسهیل‌گر",
    recommendedDefault: "پیش‌فرض پیشنهادی",
    groupsLabel: "{count} گروه",
    systemDefaultCaption: "بهترین متغیر را برای هر نمای جدید انتخاب می‌کند.",
    analysisVariantsNotAvailable: "این نما شامل حالت‌های جایگزین نیست.",
    fixedGroupCountUnavailable:
      "Agora نتوانست برای این نقطه بررسی {count} گروه معنادار تشکیل دهد.",
    recommendedDefaultUnavailable: "هنوز متغیر پیشنهادی در دسترس نیست.",
    sameAsRecommendedDefault: "همان پیش‌فرض پیشنهادی",
    usesGroups: "از {count} گروه استفاده می‌کند",
    recommendedOptionCaption: "بهترین تناسب کلی",
    liveSnapshot: "زنده",
    checkpointSnapshot: "نقطه بررسی",
    pauseAtLatestCheckpoint: "توقف در آخرین نقطه بررسی",
    returnToLiveAnalysis: "بازگشت به تحلیل زنده",
    previousCheckpoint: "نقطه بررسی قبلی",
    nextCheckpoint: "نقطه بررسی بعدی",
    recommendedAnalysisView: "گزینه پیشنهادی",
    availableGroups: "{count} گروه در دسترس",
    availableOption: "در دسترس",
    discouragedOption: "Discouraged",
    lockedOption: "Locked",
    selectionScoreLabel: "Selection {score}",
    candidateIdLabel: "Candidate #{id}",
    resolvedGroupCountLabel: "Uses {count} groups",
    silhouetteScoreLabel: "Separation {score}",
    ...analysisViewHelpFallbackTranslations,
    checkpointTimelineLabel: "خط زمانی نقطه های بررسی",
    checkpointTimelineStart: "شروع",
    checkpointTimelineCheckpoint: "نقطه بررسی {number}",
    checkpointTimelineNow: "اکنون",
    checkpointReasonsLabel: "نشانگرهای نقطه بررسی",
    checkpointReasonFirstDisplayableAnalysis: "اولین تحلیل",
    checkpointReasonFirstGroupCountAvailable: "تعداد گروه در دسترس است",
    checkpointReasonDefaultGroupCountChanged: "پیش فرض تغییر کرد",
    checkpointReasonParticipationMilestone: "نقطه عطف شرکت کنندگان",
    checkpointReasonVoteMilestone: "نقطه عطف رای ها",
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
    analysisViewTitle: "Vue d'analyse",
    analysisViewSortingCaption:
      "Les nombres de groupes sont triés par qualité d'analyse.",
    facilitatorPreference: "Préférence du facilitateur",
    recommendedDefault: "Par défaut recommandé",
    groupsLabel: "{count} groupes",
    systemDefaultCaption:
      "Choisit la variante la mieux notée pour chaque nouvel instantané.",
    analysisVariantsNotAvailable: "Cet instantané n'inclut pas de variantes.",
    fixedGroupCountUnavailable:
      "Agora n'a pas pu former {count} groupes significatifs pour ce point de contrôle.",
    recommendedDefaultUnavailable:
      "Aucune variante recommandée n'est encore disponible.",
    sameAsRecommendedDefault: "Identique au Par défaut recommandé",
    usesGroups: "Utilise {count} groupes",
    recommendedOptionCaption: "Meilleur ajustement global",
    liveSnapshot: "Direct",
    checkpointSnapshot: "Point de contrôle",
    pauseAtLatestCheckpoint: "Mettre en pause au dernier point de contrôle",
    returnToLiveAnalysis: "Revenir à l'analyse en direct",
    previousCheckpoint: "Point de contrôle précédent",
    nextCheckpoint: "Point de contrôle suivant",
    recommendedAnalysisView: "Option recommandée",
    availableGroups: "{count} groupes disponibles",
    availableOption: "Disponible",
    discouragedOption: "Discouraged",
    lockedOption: "Locked",
    selectionScoreLabel: "Selection {score}",
    candidateIdLabel: "Candidate #{id}",
    resolvedGroupCountLabel: "Uses {count} groups",
    silhouetteScoreLabel: "Separation {score}",
    ...analysisViewHelpFallbackTranslations,
    checkpointTimelineLabel: "Chronologie des points de contrôle",
    checkpointTimelineStart: "Début",
    checkpointTimelineCheckpoint: "Point de contrôle {number}",
    checkpointTimelineNow: "Maintenant",
    checkpointReasonsLabel: "Repères du point de contrôle",
    checkpointReasonFirstDisplayableAnalysis: "Première analyse",
    checkpointReasonFirstGroupCountAvailable: "Nombre de groupes disponible",
    checkpointReasonDefaultGroupCountChanged: "Choix par défaut modifié",
    checkpointReasonParticipationMilestone: "Jalon de participants",
    checkpointReasonVoteMilestone: "Jalon de votes",
    checkpointReasonParticipantCount: "{count} participants",
    checkpointReasonVoteCount: "{count} votes",
    checkpointReasonConversationClosed: "Clôturé",
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
    analysisViewTitle: "分析视图",
    analysisViewSortingCaption: "群组数量按分析质量排序。",
    facilitatorPreference: "主持人偏好",
    recommendedDefault: "推荐默认",
    groupsLabel: "{count} 个群组",
    systemDefaultCaption: "为每个新快照选择评分最高的变体。",
    analysisVariantsNotAvailable: "此快照不包含变体。",
    fixedGroupCountUnavailable:
      "Agora 无法为此检查点形成 {count} 个有意义的群组。",
    recommendedDefaultUnavailable: "尚无可用的推荐变体。",
    sameAsRecommendedDefault: "与推荐默认相同",
    usesGroups: "使用 {count} 个群组",
    recommendedOptionCaption: "整体最佳匹配",
    liveSnapshot: "实时",
    checkpointSnapshot: "检查点",
    pauseAtLatestCheckpoint: "暂停在最新检查点",
    returnToLiveAnalysis: "返回实时分析",
    previousCheckpoint: "上一个检查点",
    nextCheckpoint: "下一个检查点",
    recommendedAnalysisView: "推荐选项",
    availableGroups: "{count} 个可用群组",
    availableOption: "可用",
    discouragedOption: "Discouraged",
    lockedOption: "Locked",
    selectionScoreLabel: "Selection {score}",
    candidateIdLabel: "Candidate #{id}",
    resolvedGroupCountLabel: "Uses {count} groups",
    silhouetteScoreLabel: "Separation {score}",
    ...analysisViewHelpFallbackTranslations,
    checkpointTimelineLabel: "检查点时间线",
    checkpointTimelineStart: "开始",
    checkpointTimelineCheckpoint: "检查点 {number}",
    checkpointTimelineNow: "现在",
    checkpointReasonsLabel: "检查点标记",
    checkpointReasonFirstDisplayableAnalysis: "首次分析",
    checkpointReasonFirstGroupCountAvailable: "群组数量可用",
    checkpointReasonDefaultGroupCountChanged: "默认已更改",
    checkpointReasonParticipationMilestone: "参与者里程碑",
    checkpointReasonVoteMilestone: "投票里程碑",
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
    analysisViewTitle: "分析視圖",
    analysisViewSortingCaption: "群組數量按分析品質排序。",
    facilitatorPreference: "主持人偏好",
    recommendedDefault: "推薦預設",
    groupsLabel: "{count} 個群組",
    systemDefaultCaption: "為每個新快照選擇評分最高的變體。",
    analysisVariantsNotAvailable: "此快照不包含變體。",
    fixedGroupCountUnavailable:
      "Agora 無法為此檢查點形成 {count} 個有意義的群組。",
    recommendedDefaultUnavailable: "尚無可用的推薦變體。",
    sameAsRecommendedDefault: "與推薦預設相同",
    usesGroups: "使用 {count} 個群組",
    recommendedOptionCaption: "整體最佳匹配",
    liveSnapshot: "即時",
    checkpointSnapshot: "檢查點",
    pauseAtLatestCheckpoint: "暫停在最新檢查點",
    returnToLiveAnalysis: "返回即時分析",
    previousCheckpoint: "上一個檢查點",
    nextCheckpoint: "下一個檢查點",
    recommendedAnalysisView: "推薦選項",
    availableGroups: "{count} 個可用群組",
    availableOption: "可用",
    discouragedOption: "Discouraged",
    lockedOption: "Locked",
    selectionScoreLabel: "Selection {score}",
    candidateIdLabel: "Candidate #{id}",
    resolvedGroupCountLabel: "Uses {count} groups",
    silhouetteScoreLabel: "Separation {score}",
    ...analysisViewHelpFallbackTranslations,
    checkpointTimelineLabel: "檢查點時間線",
    checkpointTimelineStart: "開始",
    checkpointTimelineCheckpoint: "檢查點 {number}",
    checkpointTimelineNow: "現在",
    checkpointReasonsLabel: "檢查點標記",
    checkpointReasonFirstDisplayableAnalysis: "首次分析",
    checkpointReasonFirstGroupCountAvailable: "群組數量可用",
    checkpointReasonDefaultGroupCountChanged: "預設已變更",
    checkpointReasonParticipationMilestone: "參與者里程碑",
    checkpointReasonVoteMilestone: "投票里程碑",
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
    analysisViewTitle: "תצוגת ניתוח",
    analysisViewSortingCaption: "מספרי הקבוצות ממוינים לפי איכות הניתוח.",
    facilitatorPreference: "העדפת המנחה",
    recommendedDefault: "ברירת מחדל מומלצת",
    groupsLabel: "{count} קבוצות",
    systemDefaultCaption:
      "בוחרת את הווריאנט בעל הציון הגבוה ביותר לכל תמונת מצב חדשה.",
    analysisVariantsNotAvailable: "תמונת המצב הזו לא כוללת וריאנטים.",
    fixedGroupCountUnavailable:
      "Agora לא הצליחה ליצור {count} קבוצות משמעותיות עבור נקודת ביקורת זו.",
    recommendedDefaultUnavailable: "עדיין אין וריאנט מומלץ זמין.",
    sameAsRecommendedDefault: "כמו ברירת המחדל המומלצת",
    usesGroups: "משתמש ב-{count} קבוצות",
    recommendedOptionCaption: "ההתאמה הכוללת הטובה ביותר",
    liveSnapshot: "חי",
    checkpointSnapshot: "נקודת ביקורת",
    pauseAtLatestCheckpoint: "השהיה בנקודת הביקורת האחרונה",
    returnToLiveAnalysis: "חזרה לניתוח חי",
    previousCheckpoint: "נקודת ביקורת קודמת",
    nextCheckpoint: "נקודת ביקורת הבאה",
    recommendedAnalysisView: "אפשרות מומלצת",
    availableGroups: "{count} קבוצות זמינות",
    availableOption: "זמין",
    discouragedOption: "Discouraged",
    lockedOption: "Locked",
    selectionScoreLabel: "Selection {score}",
    candidateIdLabel: "Candidate #{id}",
    resolvedGroupCountLabel: "Uses {count} groups",
    silhouetteScoreLabel: "Separation {score}",
    ...analysisViewHelpFallbackTranslations,
    checkpointTimelineLabel: "ציר זמן של נקודות ביקורת",
    checkpointTimelineStart: "התחלה",
    checkpointTimelineCheckpoint: "נקודת ביקורת {number}",
    checkpointTimelineNow: "עכשיו",
    checkpointReasonsLabel: "סימוני נקודת ביקורת",
    checkpointReasonFirstDisplayableAnalysis: "ניתוח ראשון",
    checkpointReasonFirstGroupCountAvailable: "מספר קבוצות זמין",
    checkpointReasonDefaultGroupCountChanged: "ברירת המחדל השתנתה",
    checkpointReasonParticipationMilestone: "אבן דרך של משתתפים",
    checkpointReasonVoteMilestone: "אבן דרך של הצבעות",
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
    analysisViewTitle: "分析ビュー",
    analysisViewSortingCaption: "グループ数は分析品質順に並びます。",
    facilitatorPreference: "ファシリテーターの設定",
    recommendedDefault: "推奨既定",
    groupsLabel: "{count} グループ",
    systemDefaultCaption:
      "新しいスナップショットごとに最もスコアの高いバリアントを選択します。",
    analysisVariantsNotAvailable:
      "このスナップショットにはバリアントが含まれていません。",
    fixedGroupCountUnavailable:
      "Agora はこのチェックポイントで意味のある {count} グループを形成できませんでした。",
    recommendedDefaultUnavailable: "推奨バリアントはまだ利用できません。",
    sameAsRecommendedDefault: "推奨既定と同じ",
    usesGroups: "{count} グループを使用",
    recommendedOptionCaption: "全体で最も適合",
    liveSnapshot: "ライブ",
    checkpointSnapshot: "チェックポイント",
    pauseAtLatestCheckpoint: "最新チェックポイントで一時停止",
    returnToLiveAnalysis: "ライブ分析に戻る",
    previousCheckpoint: "前のチェックポイント",
    nextCheckpoint: "次のチェックポイント",
    recommendedAnalysisView: "推奨オプション",
    availableGroups: "{count} 個の利用可能なグループ",
    availableOption: "利用可能",
    discouragedOption: "Discouraged",
    lockedOption: "Locked",
    selectionScoreLabel: "Selection {score}",
    candidateIdLabel: "Candidate #{id}",
    resolvedGroupCountLabel: "Uses {count} groups",
    silhouetteScoreLabel: "Separation {score}",
    ...analysisViewHelpFallbackTranslations,
    checkpointTimelineLabel: "チェックポイントのタイムライン",
    checkpointTimelineStart: "開始",
    checkpointTimelineCheckpoint: "チェックポイント {number}",
    checkpointTimelineNow: "現在",
    checkpointReasonsLabel: "チェックポイントの目印",
    checkpointReasonFirstDisplayableAnalysis: "最初の分析",
    checkpointReasonFirstGroupCountAvailable: "グループ数が利用可能",
    checkpointReasonDefaultGroupCountChanged: "既定が変更されました",
    checkpointReasonParticipationMilestone: "参加者のマイルストーン",
    checkpointReasonVoteMilestone: "投票のマイルストーン",
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
    analysisViewTitle: "Анализ көрүнүшү",
    analysisViewSortingCaption: "Топ сандары анализ сапаты боюнча иреттелет.",
    facilitatorPreference: "Фасилитатордун тандоосу",
    recommendedDefault: "Сунушталган демейки",
    groupsLabel: "{count} топ",
    systemDefaultCaption:
      "Ар бир жаңы сүрөт үчүн эң жогорку упай алган вариантты тандайт.",
    analysisVariantsNotAvailable: "Бул сүрөттө варианттар жок.",
    fixedGroupCountUnavailable:
      "Agora бул текшерүү чекити үчүн {count} маанилүү топ түзө алган жок.",
    recommendedDefaultUnavailable:
      "Сунушталган вариант азырынча жеткиликтүү эмес.",
    sameAsRecommendedDefault: "Сунушталган демейки менен бирдей",
    usesGroups: "{count} топ колдонот",
    recommendedOptionCaption: "Жалпысынан эң ылайыктуу",
    liveSnapshot: "Жандуу",
    checkpointSnapshot: "Текшерүү чекити",
    pauseAtLatestCheckpoint: "Акыркы текшерүү чекитинде токтотуу",
    returnToLiveAnalysis: "Жандуу анализге кайтуу",
    previousCheckpoint: "Мурунку текшерүү чекити",
    nextCheckpoint: "Кийинки текшерүү чекити",
    recommendedAnalysisView: "Сунушталган вариант",
    availableGroups: "{count} жеткиликтүү топ",
    availableOption: "Жеткиликтүү",
    discouragedOption: "Discouraged",
    lockedOption: "Locked",
    selectionScoreLabel: "Selection {score}",
    candidateIdLabel: "Candidate #{id}",
    resolvedGroupCountLabel: "Uses {count} groups",
    silhouetteScoreLabel: "Separation {score}",
    ...analysisViewHelpFallbackTranslations,
    checkpointTimelineLabel: "Текшерүү чекиттеринин убакыт сызыгы",
    checkpointTimelineStart: "Башталыш",
    checkpointTimelineCheckpoint: "Текшерүү чекити {number}",
    checkpointTimelineNow: "Азыр",
    checkpointReasonsLabel: "Текшерүү чекитинин белгилери",
    checkpointReasonFirstDisplayableAnalysis: "Биринчи анализ",
    checkpointReasonFirstGroupCountAvailable: "Топтордун саны жеткиликтүү",
    checkpointReasonDefaultGroupCountChanged: "Демейки өзгөрдү",
    checkpointReasonParticipationMilestone: "Катышуучулар чеги",
    checkpointReasonVoteMilestone: "Добуштар чеги",
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
    analysisViewTitle: "Вид анализа",
    analysisViewSortingCaption:
      "Количество групп отсортировано по качеству анализа.",
    facilitatorPreference: "Предпочтение фасилитатора",
    recommendedDefault: "Рекомендуемый вариант",
    groupsLabel: "{count} групп",
    systemDefaultCaption:
      "Выбирает вариант с лучшей оценкой для каждого нового снимка.",
    analysisVariantsNotAvailable: "Этот снимок не содержит вариантов.",
    fixedGroupCountUnavailable:
      "Agora не смогла сформировать {count} значимых групп для этой контрольной точки.",
    recommendedDefaultUnavailable: "Рекомендуемый вариант пока недоступен.",
    sameAsRecommendedDefault: "Совпадает с рекомендуемым вариантом",
    usesGroups: "Использует {count} групп",
    recommendedOptionCaption: "Лучшее общее соответствие",
    liveSnapshot: "В реальном времени",
    checkpointSnapshot: "Контрольная точка",
    pauseAtLatestCheckpoint: "Пауза на последней контрольной точке",
    returnToLiveAnalysis: "Вернуться к анализу в реальном времени",
    previousCheckpoint: "Предыдущая контрольная точка",
    nextCheckpoint: "Следующая контрольная точка",
    recommendedAnalysisView: "Рекомендуемый вариант",
    availableGroups: "{count} доступных групп",
    availableOption: "Доступно",
    discouragedOption: "Discouraged",
    lockedOption: "Locked",
    selectionScoreLabel: "Selection {score}",
    candidateIdLabel: "Candidate #{id}",
    resolvedGroupCountLabel: "Uses {count} groups",
    silhouetteScoreLabel: "Separation {score}",
    ...analysisViewHelpFallbackTranslations,
    checkpointTimelineLabel: "Хронология контрольных точек",
    checkpointTimelineStart: "Старт",
    checkpointTimelineCheckpoint: "Контрольная точка {number}",
    checkpointTimelineNow: "Сейчас",
    checkpointReasonsLabel: "Маркеры контрольной точки",
    checkpointReasonFirstDisplayableAnalysis: "Первый анализ",
    checkpointReasonFirstGroupCountAvailable: "Количество групп доступно",
    checkpointReasonDefaultGroupCountChanged:
      "Значение по умолчанию изменилось",
    checkpointReasonParticipationMilestone: "Веха участников",
    checkpointReasonVoteMilestone: "Веха голосов",
    checkpointReasonParticipantCount: "{count} участников",
    checkpointReasonVoteCount: "{count} голосов",
    checkpointReasonConversationClosed: "Закрыто",
  },
};
