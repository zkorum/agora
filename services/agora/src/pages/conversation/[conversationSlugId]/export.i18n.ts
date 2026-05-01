import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ExportPageTranslations {
  pageTitle: string;
  pageDescription: string;
  previousExports: string;
  conversationLoadError: string;
  exportRequestError: string;
  exportCooldownMinutes: string; // Expects {minutes} parameter
  exportCooldownSeconds: string; // Expects {seconds} parameter
  viewConversation: string;
  requestExportAriaLabel: string;
  // Export request failure reasons (i18n for discriminated union reasons)
  errorActiveExportInProgress: string;
  errorConversationNotFound: string;
  errorNoOpinions: string;
  exportFeatureDisabled: string;
}

export const exportPageTranslations: Record<
  SupportedDisplayLanguageCodes,
  ExportPageTranslations
> = {
  en: {
    pageTitle: "Export Conversation",
    pageDescription:
      "Download a CSV export of all statements and votes for this conversation.",
    previousExports: "Previous Exports",
    conversationLoadError:
      "Failed to load conversation details. Please try again.",
    exportRequestError: "Failed to create export. Please try again.",
    exportCooldownMinutes:
      "Export cooldown active. You can request another export in {minutes} minute(s).",
    exportCooldownSeconds:
      "Export cooldown active. You can request another export in {seconds} second(s).",
    viewConversation: "View conversation",
    requestExportAriaLabel: "Request export of conversation data",
    errorActiveExportInProgress:
      "An export is already in progress. Please wait for it to complete.",
    errorConversationNotFound: "Conversation not found",
    errorNoOpinions:
      "This conversation has no statements to export. Add some statements first.",
    exportFeatureDisabled: "Export feature is disabled",
  },
  ar: {
    pageTitle: "تصدير المحادثة",
    pageDescription: "قم بتنزيل ملف CSV لجميع المقترحات والأصوات لهذه المحادثة.",
    previousExports: "الصادرات السابقة",
    conversationLoadError: "فشل تحميل تفاصيل المحادثة. يرجى المحاولة مرة أخرى.",
    exportRequestError: "فشل إنشاء التصدير. يرجى المحاولة مرة أخرى.",
    exportCooldownMinutes:
      "فترة التهدئة للتصدير نشطة. يمكنك طلب تصدير آخر خلال {minutes} دقيقة.",
    exportCooldownSeconds:
      "فترة التهدئة للتصدير نشطة. يمكنك طلب تصدير آخر خلال {seconds} ثانية.",
    viewConversation: "عرض المحادثة",
    requestExportAriaLabel: "طلب تصدير بيانات المحادثة",
    errorActiveExportInProgress:
      "التصدير قيد التقدم بالفعل. يرجى الانتظار حتى يكتمل.",
    errorConversationNotFound: "المحادثة غير موجودة",
    errorNoOpinions:
      "لا توجد مقترحات في هذه المحادثة للتصدير. أضف بعض المقترحات أولاً.",
    exportFeatureDisabled: "ميزة التصدير معطلة",
  },
  es: {
    pageTitle: "Exportar Conversación",
    pageDescription:
      "Descarga una exportación CSV de todas las proposiciones y votos de esta conversación.",
    previousExports: "Exportaciones Anteriores",
    conversationLoadError:
      "Error al cargar los detalles de la conversación. Por favor, inténtalo de nuevo.",
    exportRequestError:
      "Error al crear la exportación. Por favor, inténtalo de nuevo.",
    exportCooldownMinutes:
      "Período de espera activo. Puedes solicitar otra exportación en {minutes} minuto(s).",
    exportCooldownSeconds:
      "Período de espera activo. Puedes solicitar otra exportación en {seconds} segundo(s).",
    viewConversation: "Ver conversación",
    requestExportAriaLabel: "Solicitar exportación de datos de conversación",
    errorActiveExportInProgress:
      "Ya hay una exportación en progreso. Por favor, espera a que se complete.",
    errorConversationNotFound: "Conversación no encontrada",
    errorNoOpinions:
      "Esta conversación no tiene proposiciones para exportar. Añade algunas proposiciones primero.",
    exportFeatureDisabled: "La función de exportación está deshabilitada",
  },
  fa: {
    pageTitle: "خروجی گفتگو",
    pageDescription:
      "یک خروجی CSV از تمام گزاره‌ها و آراء این گفتگو دانلود کنید.",
    previousExports: "خروجی‌های قبلی",
    conversationLoadError:
      "بارگذاری جزئیات گفتگو ناموفق بود. لطفاً دوباره تلاش کنید.",
    exportRequestError: "ایجاد خروجی ناموفق بود. لطفاً دوباره تلاش کنید.",
    exportCooldownMinutes:
      "دوره انتظار خروجی فعال است. شما می‌توانید پس از {minutes} دقیقه خروجی دیگری درخواست کنید.",
    exportCooldownSeconds:
      "دوره انتظار خروجی فعال است. شما می‌توانید پس از {seconds} ثانیه خروجی دیگری درخواست کنید.",
    viewConversation: "مشاهده گفتگو",
    requestExportAriaLabel: "درخواست خروجی داده‌های گفتگو",
    errorActiveExportInProgress:
      "یک خروجی در حال انجام است. لطفاً تا تکمیل آن صبر کنید.",
    errorConversationNotFound: "گفتگو یافت نشد",
    errorNoOpinions:
      "این گفتگو گزاره‌ای برای خروجی ندارد. ابتدا چند گزاره اضافه کنید.",
    exportFeatureDisabled: "قابلیت خروجی غیرفعال است",
  },
  he: {
    pageTitle: "ייצוא שיחה",
    pageDescription:
      "הורידו קובץ CSV של כל ההצהרות וההצבעות עבור שיחה זו.",
    previousExports: "ייצואים קודמים",
    conversationLoadError:
      "טעינת פרטי השיחה נכשלה. אנא נסו שוב.",
    exportRequestError: "יצירת הייצוא נכשלה. אנא נסו שוב.",
    exportCooldownMinutes:
      "תקופת המתנה לייצוא פעילה. תוכלו לבקש ייצוא נוסף בעוד {minutes} דקות.",
    exportCooldownSeconds:
      "תקופת המתנה לייצוא פעילה. תוכלו לבקש ייצוא נוסף בעוד {seconds} שניות.",
    viewConversation: "צפייה בשיחה",
    requestExportAriaLabel: "בקשת ייצוא נתוני שיחה",
    errorActiveExportInProgress:
      "ייצוא כבר מתבצע. אנא המתינו לסיומו.",
    errorConversationNotFound: "השיחה לא נמצאה",
    errorNoOpinions:
      "לשיחה זו אין הצהרות לייצוא. הוסיפו הצהרות תחילה.",
    exportFeatureDisabled: "תכונת הייצוא מושבתת",
  },
  fr: {
    pageTitle: "Exporter la Conversation",
    pageDescription:
      "Téléchargez un export CSV de toutes les propositions et votes pour cette conversation.",
    previousExports: "Exports Précédents",
    conversationLoadError:
      "Échec du chargement des détails de la conversation. Veuillez réessayer.",
    exportRequestError:
      "Échec de la création de l'export. Veuillez réessayer.",
    exportCooldownMinutes:
      "Période d'attente active. Vous pouvez demander un autre export dans {minutes} minute(s).",
    exportCooldownSeconds:
      "Période d'attente active. Vous pouvez demander un autre export dans {seconds} seconde(s).",
    viewConversation: "Voir la conversation",
    requestExportAriaLabel:
      "Demander l'export des données de conversation",
    errorActiveExportInProgress:
      "Un export est déjà en cours. Veuillez attendre qu'il soit terminé.",
    errorConversationNotFound: "Conversation introuvable",
    errorNoOpinions:
      "Cette conversation n'a pas de propositions à exporter. Ajoutez d'abord quelques propositions.",
    exportFeatureDisabled: "La fonction d'export est désactivée",
  },
  "zh-Hans": {
    pageTitle: "导出对话",
    pageDescription: "下载此对话的所有观点和投票的CSV导出。",
    previousExports: "以前的导出",
    conversationLoadError: "无法加载对话详情。请重试。",
    exportRequestError: "无法创建导出。请重试。",
    exportCooldownMinutes:
      "导出冷却中。您可以在{minutes}分钟后请求另一个导出。",
    exportCooldownSeconds: "导出冷却中。您可以在{seconds}秒后请求另一个导出。",
    viewConversation: "查看对话",
    requestExportAriaLabel: "请求导出对话数据",
    errorActiveExportInProgress: "导出正在进行中。请等待完成。",
    errorConversationNotFound: "未找到对话",
    errorNoOpinions: "此对话没有可导出的观点。请先添加一些观点。",
    exportFeatureDisabled: "导出功能已禁用",
  },
  "zh-Hant": {
    pageTitle: "匯出對話",
    pageDescription: "下載此對話的所有觀點和投票的CSV匯出。",
    previousExports: "先前的匯出",
    conversationLoadError: "無法載入對話詳情。請重試。",
    exportRequestError: "無法建立匯出。請重試。",
    exportCooldownMinutes:
      "匯出冷卻中。您可以在{minutes}分鐘後請求另一個匯出。",
    exportCooldownSeconds: "匯出冷卻中。您可以在{seconds}秒後請求另一個匯出。",
    viewConversation: "檢視對話",
    requestExportAriaLabel: "請求匯出對話資料",
    errorActiveExportInProgress: "匯出正在進行中。請等待完成。",
    errorConversationNotFound: "未找到對話",
    errorNoOpinions: "此對話沒有可匯出的觀點。請先新增一些觀點。",
    exportFeatureDisabled: "匯出功能已停用",
  },
  ja: {
    pageTitle: "会話をエクスポート",
    pageDescription:
      "この会話のすべての意見と投票のCSVエクスポートをダウンロードします。",
    previousExports: "以前のエクスポート",
    conversationLoadError:
      "会話の詳細を読み込めませんでした。もう一度お試しください。",
    exportRequestError:
      "エクスポートの作成に失敗しました。もう一度お試しください。",
    exportCooldownMinutes:
      "エクスポートのクールダウン中です。{minutes}分後に別のエクスポートをリクエストできます。",
    exportCooldownSeconds:
      "エクスポートのクールダウン中です。{seconds}秒後に別のエクスポートをリクエストできます。",
    viewConversation: "会話を表示",
    requestExportAriaLabel: "会話データのエクスポートをリクエスト",
    errorActiveExportInProgress:
      "エクスポートはすでに進行中です。完了するまでお待ちください。",
    errorConversationNotFound: "会話が見つかりません",
    errorNoOpinions:
      "この会話にはエクスポートする意見がありません。まず意見を追加してください。",
    exportFeatureDisabled: "エクスポート機能は無効です",
  },
  ky: {
    pageTitle: "Талкууну экспорттоо",
    pageDescription:
      "Бул талкуунун бардык пикирлери жана добуштарынын CSV экспортун жүктөп алыңыз.",
    previousExports: "Мурунку экспорттор",
    conversationLoadError:
      "Талкуу маалыматтарын жүктөө ишке ашкан жок. Кайра аракет кылыңыз.",
    exportRequestError: "Экспортту түзүү ишке ашкан жок. Кайра аракет кылыңыз.",
    exportCooldownMinutes:
      "Экспорт күтүү режиминде. {minutes} мүнөттөн кийин башка экспорт сурай аласыз.",
    exportCooldownSeconds:
      "Экспорт күтүү режиминде. {seconds} секунддан кийин башка экспорт сурай аласыз.",
    viewConversation: "Талкууну көрүү",
    requestExportAriaLabel: "Талкуу маалыматтарын экспорттоону суроо",
    errorActiveExportInProgress:
      "Экспорт мурунтан эле жүрүп жатат. Аяктаганча күтүңүз.",
    errorConversationNotFound: "Талкуу табылган жок",
    errorNoOpinions:
      "Бул талкууда экспорттоого пикирлер жок. Алгач пикирлерди кошуңуз.",
    exportFeatureDisabled: "Экспорт функциясы өчүрүлгөн",
  },
  ru: {
    pageTitle: "Экспорт обсуждения",
    pageDescription:
      "Скачайте CSV-экспорт всех высказываний и голосов этого обсуждения.",
    previousExports: "Предыдущие экспорты",
    conversationLoadError:
      "Не удалось загрузить данные обсуждения. Пожалуйста, попробуйте ещё раз.",
    exportRequestError:
      "Не удалось создать экспорт. Пожалуйста, попробуйте ещё раз.",
    exportCooldownMinutes:
      "Период ожидания экспорта. Вы сможете запросить новый экспорт через {minutes} мин.",
    exportCooldownSeconds:
      "Период ожидания экспорта. Вы сможете запросить новый экспорт через {seconds} сек.",
    viewConversation: "Просмотреть обсуждение",
    requestExportAriaLabel: "Запросить экспорт данных обсуждения",
    errorActiveExportInProgress:
      "Экспорт уже выполняется. Пожалуйста, дождитесь его завершения.",
    errorConversationNotFound: "Обсуждение не найдено",
    errorNoOpinions:
      "В этом обсуждении нет высказываний для экспорта. Сначала добавьте высказывания.",
    exportFeatureDisabled: "Функция экспорта отключена",
  },
};
