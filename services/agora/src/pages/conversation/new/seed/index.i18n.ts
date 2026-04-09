import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ConversationReviewTranslations {
  nextButton: string;
  addSeedOpinions: string;
  addMaxDiffItems: string;
  seedOpinionsDescription: string;
  maxDiffSeedDescription: string;
  needMinimumForMaxDiff: string;
  addOpinion: string;
  addMaxDiffItem: string;
  opinionCannotBeEmpty: string;
  opinionExceedsLimit: string;
  opinionDuplicate: string;
  errorCreatingConversation: string;
  githubSyncTitle: string;
  githubSyncDescription: string;
  loadingGithubPreview: string;
  noGithubIssuesFound: string;
  githubPreviewError: string;
  githubPreviewRetry: string;
}

export const conversationReviewTranslations: Record<
  SupportedDisplayLanguageCodes,
  ConversationReviewTranslations
> = {
  en: {
    nextButton: "Next",
    addSeedOpinions: "Add Seed Statements",
    addMaxDiffItems: "Add Statements to Rank",
    seedOpinionsDescription:
      "It's recommended to seed 8 to 15 statements across a range of viewpoints. This has a powerful effect on early participation.",
    maxDiffSeedDescription:
      "Prioritization requires at least 2 statements. We recommend 10 to 25 for the best experience.",
    needMinimumForMaxDiff:
      "At least 2 statements are required for prioritization.",
    addOpinion: "Add Statement",
    addMaxDiffItem: "Add Statement",
    opinionCannotBeEmpty: "Statement cannot be empty",
    opinionExceedsLimit:
      "Statement exceeds {limit} character limit ({count}/{limit})",
    opinionDuplicate: "This statement is a duplicate",
    errorCreatingConversation:
      "Error while trying to create a new conversation",
    githubSyncTitle: "Items from GitHub",
    githubSyncDescription:
      "These items will be synced from GitHub issues. They cannot be edited here — manage them on GitHub.",
    loadingGithubPreview: "Loading issues from GitHub...",
    noGithubIssuesFound:
      "No issues found with the configured label. Items will be synced when issues are created or labeled on GitHub.",
    githubPreviewError: "Failed to load issues from GitHub",
    githubPreviewRetry: "Retry",
  },
  ar: {
    nextButton: "التالي",
    addSeedOpinions: "إضافة مقترحات أولية",
    addMaxDiffItems: "إضافة عبارات للترتيب",
    seedOpinionsDescription:
      "يُنصح ببذر 8 إلى 15 مقترحًا عبر مجموعة من وجهات النظر. هذا له تأثير قوي على المشاركة المبكرة.",
    maxDiffSeedDescription:
      "يتطلب ترتيب الأولويات 4 مقترحات على الأقل. نوصي بـ 10 إلى 25 للحصول على أفضل تجربة.",
    needMinimumForMaxDiff:
      "مطلوب 4 مقترحات على الأقل لترتيب الأولويات.",
    addOpinion: "أضف مقترحًا",
    addMaxDiffItem: "أضف عبارة",
    opinionCannotBeEmpty: "لا يمكن أن يكون المقترح فارغًا",
    opinionExceedsLimit: "المقترح يتجاوز حد الـ {limit} حرف ({count}/{limit})",
    opinionDuplicate: "هذا المقترح مكرر",
    errorCreatingConversation: "خطأ أثناء محاولة إنشاء محادثة جديدة",
    githubSyncTitle: "Items from GitHub",
    githubSyncDescription: "These items will be synced from GitHub issues. They cannot be edited here — manage them on GitHub.",
    loadingGithubPreview: "Loading issues from GitHub...",
    noGithubIssuesFound: "No issues found with the configured label. Items will be synced when issues are created or labeled on GitHub.",
    githubPreviewError: "Failed to load issues from GitHub",
    githubPreviewRetry: "Retry",
  },
  es: {
    nextButton: "Siguiente",
    addSeedOpinions: "Agregar Proposiciones Semilla",
    addMaxDiffItems: "Agregar Declaraciones a Clasificar",
    seedOpinionsDescription:
      "Se recomienda sembrar de 8 a 15 proposiciones en una gama de puntos de vista. Esto tiene un efecto poderoso en la participación temprana.",
    maxDiffSeedDescription:
      "La priorización requiere al menos 4 declaraciones. Recomendamos de 10 a 25 para la mejor experiencia.",
    needMinimumForMaxDiff:
      "Se requieren al menos 4 declaraciones para la priorización.",
    addOpinion: "Añadir Proposición",
    addMaxDiffItem: "Añadir Declaración",
    opinionCannotBeEmpty: "La proposición no puede estar vacía",
    opinionExceedsLimit:
      "La proposición excede el límite de {limit} caracteres ({count}/{limit})",
    opinionDuplicate: "Esta proposición es un duplicado",
    errorCreatingConversation: "Error al intentar crear una nueva conversación",
    githubSyncTitle: "Items from GitHub",
    githubSyncDescription: "These items will be synced from GitHub issues. They cannot be edited here — manage them on GitHub.",
    loadingGithubPreview: "Loading issues from GitHub...",
    noGithubIssuesFound: "No issues found with the configured label. Items will be synced when issues are created or labeled on GitHub.",
    githubPreviewError: "Failed to load issues from GitHub",
    githubPreviewRetry: "Retry",
  },
  fa: {
    nextButton: "بعدی",
    addSeedOpinions: "افزودن گزاره‌های اولیه",
    addMaxDiffItems: "افزودن گزاره‌ها برای رتبه‌بندی",
    seedOpinionsDescription:
      "توصیه می‌شود ۸ تا ۱۵ گزاره از دیدگاه‌های مختلف اضافه کنید. این تأثیر قدرتمندی بر مشارکت اولیه دارد.",
    maxDiffSeedDescription:
      "اولویت‌بندی حداقل به ۲ گزاره نیاز دارد. برای بهترین تجربه ۱۰ تا ۲۵ عدد توصیه می‌شود.",
    needMinimumForMaxDiff:
      "حداقل ۲ گزاره برای اولویت‌بندی لازم است.",
    addOpinion: "افزودن گزاره",
    addMaxDiffItem: "افزودن گزاره",
    opinionCannotBeEmpty: "گزاره نمی‌تواند خالی باشد",
    opinionExceedsLimit:
      "گزاره از محدودیت {limit} کاراکتر فراتر رفته است ({count}/{limit})",
    opinionDuplicate: "این گزاره تکراری است",
    errorCreatingConversation: "خطا هنگام ایجاد گفتگوی جدید",
    githubSyncTitle: "Items from GitHub",
    githubSyncDescription: "These items will be synced from GitHub issues. They cannot be edited here — manage them on GitHub.",
    loadingGithubPreview: "Loading issues from GitHub...",
    noGithubIssuesFound: "No issues found with the configured label. Items will be synced when issues are created or labeled on GitHub.",
    githubPreviewError: "Failed to load issues from GitHub",
    githubPreviewRetry: "تلاش مجدد",
  },
  he: {
    nextButton: "הבא",
    addSeedOpinions: "הוספת הצהרות ראשוניות",
    addMaxDiffItems: "הוספת הצהרות לדירוג",
    seedOpinionsDescription:
      "מומלץ להוסיף 8 עד 15 הצהרות ממגוון נקודות מבט. לכך השפעה חזקה על ההשתתפות המוקדמת.",
    maxDiffSeedDescription:
      "תיעדוף דורש לפחות 2 הצהרות. מומלץ 10 עד 25 לחוויה הטובה ביותר.",
    needMinimumForMaxDiff:
      "נדרשות לפחות 2 הצהרות לתיעדוף.",
    addOpinion: "הוספת הצהרה",
    addMaxDiffItem: "הוספת הצהרה",
    opinionCannotBeEmpty: "ההצהרה לא יכולה להיות ריקה",
    opinionExceedsLimit:
      "ההצהרה חורגת ממגבלת {limit} תווים ({count}/{limit})",
    opinionDuplicate: "הצהרה זו כפולה",
    errorCreatingConversation: "שגיאה בעת ניסיון ליצור שיחה חדשה",
    githubSyncTitle: "Items from GitHub",
    githubSyncDescription: "These items will be synced from GitHub issues. They cannot be edited here — manage them on GitHub.",
    loadingGithubPreview: "Loading issues from GitHub...",
    noGithubIssuesFound: "No issues found with the configured label. Items will be synced when issues are created or labeled on GitHub.",
    githubPreviewError: "Failed to load issues from GitHub",
    githubPreviewRetry: "נסה שוב",
  },
  fr: {
    nextButton: "Suivant",
    addSeedOpinions: "Ajouter des Propositions Initiales",
    addMaxDiffItems: "Ajouter les Propositions à Classer",
    seedOpinionsDescription:
      "Il est recommandé de semer 8 à 15 propositions à travers une gamme de points de vue. Cela a un effet puissant sur la participation précoce.",
    maxDiffSeedDescription:
      "La hiérarchisation nécessite au moins 4 propositions. Nous recommandons 10 à 25 pour une meilleure expérience.",
    needMinimumForMaxDiff:
      "Au moins 4 propositions sont requises pour la hiérarchisation.",
    addOpinion: "Ajouter une Proposition",
    addMaxDiffItem: "Ajouter une Proposition",
    opinionCannotBeEmpty: "La proposition ne peut pas être vide",
    opinionExceedsLimit:
      "La proposition dépasse la limite de {limit} caractères ({count}/{limit})",
    opinionDuplicate: "Cette proposition est un doublon",
    errorCreatingConversation:
      "Erreur lors de la tentative de création d'une nouvelle conversation",
    githubSyncTitle: "Items from GitHub",
    githubSyncDescription: "These items will be synced from GitHub issues. They cannot be edited here — manage them on GitHub.",
    loadingGithubPreview: "Loading issues from GitHub...",
    noGithubIssuesFound: "No issues found with the configured label. Items will be synced when issues are created or labeled on GitHub.",
    githubPreviewError: "Failed to load issues from GitHub",
    githubPreviewRetry: "Retry",
  },
  "zh-Hans": {
    nextButton: "下一步",
    addSeedOpinions: "添加种子观点",
    addMaxDiffItems: "添加待排名的陈述",
    seedOpinionsDescription:
      "建议在不同观点范围内播种8到15个观点。这会对早期参与产生强大的影响。",
    maxDiffSeedDescription:
      "优先排序至少需要4条陈述。我们建议10至25条以获得最佳体验。",
    needMinimumForMaxDiff:
      "优先排序至少需要4条陈述。",
    addOpinion: "添加观点",
    addMaxDiffItem: "添加陈述",
    opinionCannotBeEmpty: "观点不能为空",
    opinionExceedsLimit: "观点超过 {limit} 字符限制 ({count}/{limit})",
    opinionDuplicate: "观点重复",
    errorCreatingConversation: "创建新对话时出错",
    githubSyncTitle: "Items from GitHub",
    githubSyncDescription: "These items will be synced from GitHub issues. They cannot be edited here — manage them on GitHub.",
    loadingGithubPreview: "Loading issues from GitHub...",
    noGithubIssuesFound: "No issues found with the configured label. Items will be synced when issues are created or labeled on GitHub.",
    githubPreviewError: "Failed to load issues from GitHub",
    githubPreviewRetry: "Retry",
  },
  "zh-Hant": {
    nextButton: "下一步",
    addSeedOpinions: "添加種子觀點",
    addMaxDiffItems: "添加待排名的陳述",
    seedOpinionsDescription:
      "建議在不同觀點範圍內播種8到15個觀點。這會對早期參與產生強大的影響。",
    maxDiffSeedDescription:
      "優先排序至少需要4條陳述。我們建議10至25條以獲得最佳體驗。",
    needMinimumForMaxDiff:
      "優先排序至少需要4條陳述。",
    addOpinion: "添加觀點",
    addMaxDiffItem: "添加陳述",
    opinionCannotBeEmpty: "觀點不能為空",
    opinionExceedsLimit: "觀點超過 {limit} 字符限制 ({count}/{limit})",
    opinionDuplicate: "觀點重複",
    errorCreatingConversation: "創建新對話時出錯",
    githubSyncTitle: "Items from GitHub",
    githubSyncDescription: "These items will be synced from GitHub issues. They cannot be edited here — manage them on GitHub.",
    loadingGithubPreview: "Loading issues from GitHub...",
    noGithubIssuesFound: "No issues found with the configured label. Items will be synced when issues are created or labeled on GitHub.",
    githubPreviewError: "Failed to load issues from GitHub",
    githubPreviewRetry: "Retry",
  },
  ja: {
    nextButton: "次へ",
    addSeedOpinions: "主張の種を追加",
    addMaxDiffItems: "ランク付けするステートメントを追加",
    seedOpinionsDescription:
      "様々な視点からで8から15個の主張を投稿（種植え）することをお勧めします。これは初期段階の参加に強力な効果をもたらします。",
    maxDiffSeedDescription:
      "優先順位付けには少なくとも4つのステートメントが必要です。最良の体験のために10〜25を推奨します。",
    needMinimumForMaxDiff:
      "優先順位付けには少なくとも4つのステートメントが必要です。",
    addOpinion: "主張を追加",
    addMaxDiffItem: "ステートメントを追加",
    opinionCannotBeEmpty: "主張を入力してください",
    opinionExceedsLimit:
      "主張が {limit} 文字制限を超えています ({count}/{limit})",
    opinionDuplicate: "この主張は重複しています",
    errorCreatingConversation: "新しい会話を作成する際にエラーが発生しました",
    githubSyncTitle: "Items from GitHub",
    githubSyncDescription: "These items will be synced from GitHub issues. They cannot be edited here — manage them on GitHub.",
    loadingGithubPreview: "Loading issues from GitHub...",
    noGithubIssuesFound: "No issues found with the configured label. Items will be synced when issues are created or labeled on GitHub.",
    githubPreviewError: "Failed to load issues from GitHub",
    githubPreviewRetry: "Retry",
  },
  ky: {
    nextButton: "Кийинки",
    addSeedOpinions: "Баштапкы пикирлерди кошуу",
    addMaxDiffItems: "Рейтингге билдирүүлөрдү кошуу",
    seedOpinionsDescription:
      "Ар кандай көз караштардан 8ден 15ке чейин пикир кошуу сунушталат. Бул эрте катышууга күчтүү таасир тийгизет.",
    maxDiffSeedDescription:
      "Артыкчылыктуу кылуу үчүн кеминде 4 билдирүү керек. Эң жакшы тажрыйба үчүн 10-25 сунушталат.",
    needMinimumForMaxDiff:
      "Артыкчылыктуу кылуу үчүн кеминде 4 билдирүү керек.",
    addOpinion: "Пикир кошуу",
    addMaxDiffItem: "Билдирүү кошуу",
    opinionCannotBeEmpty: "Пикир бош болушу мүмкүн эмес",
    opinionExceedsLimit:
      "Пикир {limit} белги чегинен ашып кетти ({count}/{limit})",
    opinionDuplicate: "Бул пикир кайталанган",
    errorCreatingConversation: "Жаңы талкуу түзүүдө ката кетти",
    githubSyncTitle: "Items from GitHub",
    githubSyncDescription: "These items will be synced from GitHub issues. They cannot be edited here — manage them on GitHub.",
    loadingGithubPreview: "Loading issues from GitHub...",
    noGithubIssuesFound: "No issues found with the configured label. Items will be synced when issues are created or labeled on GitHub.",
    githubPreviewError: "Failed to load issues from GitHub",
    githubPreviewRetry: "Retry",
  },
  ru: {
    nextButton: "Далее",
    addSeedOpinions: "Добавить начальные высказывания",
    addMaxDiffItems: "Добавить утверждения для ранжирования",
    seedOpinionsDescription:
      "Рекомендуется добавить от 8 до 15 высказываний с разных точек зрения. Это значительно стимулирует раннее участие.",
    maxDiffSeedDescription:
      "Для приоритизации необходимо минимум 4 высказывания. Рекомендуем 10-25 для лучшего опыта.",
    needMinimumForMaxDiff:
      "Для приоритизации необходимо минимум 4 высказывания.",
    addOpinion: "Добавить высказывание",
    addMaxDiffItem: "Добавить утверждение",
    opinionCannotBeEmpty: "Высказывание не может быть пустым",
    opinionExceedsLimit:
      "Высказывание превышает лимит в {limit} символов ({count}/{limit})",
    opinionDuplicate: "Это высказывание дублируется",
    errorCreatingConversation: "Ошибка при создании нового обсуждения",
    githubSyncTitle: "Items from GitHub",
    githubSyncDescription: "These items will be synced from GitHub issues. They cannot be edited here — manage them on GitHub.",
    loadingGithubPreview: "Loading issues from GitHub...",
    noGithubIssuesFound: "No issues found with the configured label. Items will be synced when issues are created or labeled on GitHub.",
    githubPreviewError: "Failed to load issues from GitHub",
    githubPreviewRetry: "Retry",
  },
};
