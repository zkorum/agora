import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ConversationReviewTranslations {
  nextButton: string;
  publishButton: string;
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
    publishButton: "Publish",
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
    publishButton: "نشر",
    addSeedOpinions: "إضافة مقترحات أولية",
    addMaxDiffItems: "إضافة عبارات للترتيب",
    seedOpinionsDescription:
      "يُنصح بإضافة 8 إلى 15 مقترحًا أوليًا تغطي مجموعة من وجهات النظر. هذا له تأثير قوي على المشاركة المبكرة.",
    maxDiffSeedDescription:
      "يتطلب ترتيب الأولويات 4 مقترحات على الأقل. نوصي بـ 10 إلى 25 للحصول على أفضل تجربة.",
    needMinimumForMaxDiff: "مطلوب 4 مقترحات على الأقل لترتيب الأولويات.",
    addOpinion: "أضف مقترحًا",
    addMaxDiffItem: "أضف عبارة",
    opinionCannotBeEmpty: "لا يمكن أن يكون المقترح فارغًا",
    opinionExceedsLimit: "المقترح يتجاوز حد الـ {limit} حرف ({count}/{limit})",
    opinionDuplicate: "هذا المقترح مكرر",
    errorCreatingConversation: "خطأ أثناء محاولة إنشاء محادثة جديدة",
    githubSyncTitle: "عناصر من GitHub",
    githubSyncDescription:
      "ستتم مزامنة هذه العناصر من مشكلات GitHub. لا يمكن تعديلها هنا؛ أدرها على GitHub.",
    loadingGithubPreview: "جارٍ تحميل المشكلات من GitHub...",
    noGithubIssuesFound:
      "لم يتم العثور على مشكلات بالتسمية المحددة. ستتم مزامنة العناصر عند إنشاء المشكلات أو إضافة التسمية إليها على GitHub.",
    githubPreviewError: "فشل تحميل المشكلات من GitHub",
    githubPreviewRetry: "إعادة المحاولة",
  },
  es: {
    nextButton: "Siguiente",
    publishButton: "Publicar",
    addSeedOpinions: "Agregar proposiciones iniciales",
    addMaxDiffItems: "Agregar Declaraciones a Clasificar",
    seedOpinionsDescription:
      "Se recomienda agregar de 8 a 15 proposiciones iniciales que cubran una variedad de puntos de vista. Esto tiene un efecto poderoso en la participación temprana.",
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
    githubSyncTitle: "Elementos de GitHub",
    githubSyncDescription:
      "Estos elementos se sincronizarán desde incidencias de GitHub. No se pueden editar aquí; gestiónalos en GitHub.",
    loadingGithubPreview: "Cargando incidencias de GitHub...",
    noGithubIssuesFound:
      "No se encontraron incidencias con la etiqueta configurada. Los elementos se sincronizarán cuando se creen incidencias o se etiqueten en GitHub.",
    githubPreviewError: "No se pudieron cargar las incidencias de GitHub",
    githubPreviewRetry: "Reintentar",
  },
  fa: {
    nextButton: "بعدی",
    publishButton: "انتشار",
    addSeedOpinions: "افزودن گزاره‌های اولیه",
    addMaxDiffItems: "افزودن گزاره‌ها برای رتبه‌بندی",
    seedOpinionsDescription:
      "توصیه می‌شود ۸ تا ۱۵ گزاره اولیه از دیدگاه‌های مختلف اضافه کنید. این تأثیر قدرتمندی بر مشارکت اولیه دارد.",
    maxDiffSeedDescription:
      "اولویت‌بندی حداقل به ۲ گزاره نیاز دارد. برای بهترین تجربه ۱۰ تا ۲۵ عدد توصیه می‌شود.",
    needMinimumForMaxDiff: "حداقل ۲ گزاره برای اولویت‌بندی لازم است.",
    addOpinion: "افزودن گزاره",
    addMaxDiffItem: "افزودن گزاره",
    opinionCannotBeEmpty: "گزاره نمی‌تواند خالی باشد",
    opinionExceedsLimit:
      "گزاره از محدودیت {limit} کاراکتر فراتر رفته است ({count}/{limit})",
    opinionDuplicate: "این گزاره تکراری است",
    errorCreatingConversation: "خطا هنگام ایجاد گفتگوی جدید",
    githubSyncTitle: "موارد از GitHub",
    githubSyncDescription:
      "این موارد از مسائل GitHub همگام‌سازی می‌شوند. اینجا قابل ویرایش نیستند؛ آن‌ها را در GitHub مدیریت کنید.",
    loadingGithubPreview: "در حال بارگیری مسائل از GitHub...",
    noGithubIssuesFound:
      "هیچ مسئله‌ای با برچسب تنظیم‌شده یافت نشد. موارد زمانی همگام‌سازی می‌شوند که مسئله‌ها در GitHub ایجاد یا برچسب‌گذاری شوند.",
    githubPreviewError: "بارگیری مسائل از GitHub انجام نشد",
    githubPreviewRetry: "تلاش مجدد",
  },
  he: {
    nextButton: "הבא",
    publishButton: "פרסום",
    addSeedOpinions: "הוספת הצהרות ראשוניות",
    addMaxDiffItems: "הוספת הצהרות לדירוג",
    seedOpinionsDescription:
      "מומלץ להוסיף 8 עד 15 הצהרות ראשוניות ממגוון נקודות מבט. לכך השפעה חזקה על ההשתתפות המוקדמת.",
    maxDiffSeedDescription:
      "תיעדוף דורש לפחות 2 הצהרות. מומלץ 10 עד 25 לחוויה הטובה ביותר.",
    needMinimumForMaxDiff: "נדרשות לפחות 2 הצהרות לתיעדוף.",
    addOpinion: "הוספת הצהרה",
    addMaxDiffItem: "הוספת הצהרה",
    opinionCannotBeEmpty: "ההצהרה לא יכולה להיות ריקה",
    opinionExceedsLimit: "ההצהרה חורגת ממגבלת {limit} תווים ({count}/{limit})",
    opinionDuplicate: "הצהרה זו כפולה",
    errorCreatingConversation: "שגיאה בעת ניסיון ליצור שיחה חדשה",
    githubSyncTitle: "פריטים מ-GitHub",
    githubSyncDescription:
      "הפריטים האלה יסונכרנו מבעיות GitHub. אי אפשר לערוך אותם כאן; נהלו אותם ב-GitHub.",
    loadingGithubPreview: "טוען בעיות מ-GitHub...",
    noGithubIssuesFound:
      "לא נמצאו בעיות עם התווית שהוגדרה. הפריטים יסונכרנו כשבעיות ייווצרו או יסומנו ב-GitHub.",
    githubPreviewError: "טעינת בעיות מ-GitHub נכשלה",
    githubPreviewRetry: "נסה שוב",
  },
  fr: {
    nextButton: "Suivant",
    publishButton: "Publier",
    addSeedOpinions: "Ajouter des propositions initiales",
    addMaxDiffItems: "Ajouter les Propositions à Classer",
    seedOpinionsDescription:
      "Il est recommandé d'ajouter 8 à 15 propositions initiales couvrant un éventail de points de vue. Cela a un effet puissant sur la participation précoce.",
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
    githubSyncTitle: "Éléments depuis GitHub",
    githubSyncDescription:
      "Ces éléments seront synchronisés depuis les tickets GitHub. Ils ne peuvent pas être modifiés ici; gérez-les sur GitHub.",
    loadingGithubPreview: "Chargement des tickets GitHub...",
    noGithubIssuesFound:
      "Aucun ticket trouvé avec le libellé configuré. Les éléments seront synchronisés lorsque des tickets seront créés ou étiquetés sur GitHub.",
    githubPreviewError: "Impossible de charger les tickets GitHub",
    githubPreviewRetry: "Réessayer",
  },
  "zh-Hans": {
    nextButton: "下一步",
    publishButton: "发布",
    addSeedOpinions: "添加初始观点",
    addMaxDiffItems: "添加待排名的观点",
    seedOpinionsDescription:
      "建议添加8到15个涵盖不同立场的初始观点。这会对早期参与产生强大的影响。",
    maxDiffSeedDescription:
      "优先排序至少需要2条观点。我们建议10至25条以获得最佳体验。",
    needMinimumForMaxDiff: "优先排序至少需要2条观点。",
    addOpinion: "添加观点",
    addMaxDiffItem: "添加观点",
    opinionCannotBeEmpty: "观点不能为空",
    opinionExceedsLimit: "观点超过 {limit} 字符限制 ({count}/{limit})",
    opinionDuplicate: "观点重复",
    errorCreatingConversation: "创建新对话时出错",
    githubSyncTitle: "来自 GitHub 的项目",
    githubSyncDescription:
      "这些项目将从 GitHub issue 同步。它们无法在此处编辑，请在 GitHub 上管理。",
    loadingGithubPreview: "正在从 GitHub 加载 issue...",
    noGithubIssuesFound:
      "未找到带有已配置标签的 issue。创建 issue 或在 GitHub 上添加标签后，项目将同步。",
    githubPreviewError: "无法从 GitHub 加载 issue",
    githubPreviewRetry: "重试",
  },
  "zh-Hant": {
    nextButton: "下一步",
    publishButton: "發布",
    addSeedOpinions: "添加初始觀點",
    addMaxDiffItems: "添加待排名的觀點",
    seedOpinionsDescription:
      "建議添加8到15個涵蓋不同立場的初始觀點。這會對早期參與產生強大的影響。",
    maxDiffSeedDescription:
      "優先排序至少需要2條觀點。我們建議10至25條以獲得最佳體驗。",
    needMinimumForMaxDiff: "優先排序至少需要2條觀點。",
    addOpinion: "添加觀點",
    addMaxDiffItem: "添加觀點",
    opinionCannotBeEmpty: "觀點不能為空",
    opinionExceedsLimit: "觀點超過 {limit} 字符限制 ({count}/{limit})",
    opinionDuplicate: "觀點重複",
    errorCreatingConversation: "創建新對話時出錯",
    githubSyncTitle: "來自 GitHub 的項目",
    githubSyncDescription:
      "這些項目會從 GitHub issue 同步。它們無法在此處編輯，請在 GitHub 上管理。",
    loadingGithubPreview: "正在從 GitHub 載入 issue...",
    noGithubIssuesFound:
      "未找到帶有已設定標籤的 issue。建立 issue 或在 GitHub 上新增標籤後，項目會同步。",
    githubPreviewError: "無法從 GitHub 載入 issue",
    githubPreviewRetry: "重試",
  },
  ja: {
    nextButton: "次へ",
    publishButton: "公開",
    addSeedOpinions: "初期の意見を追加",
    addMaxDiffItems: "ランク付けする意見を追加",
    seedOpinionsDescription:
      "様々な視点から8〜15個の初期の意見を追加することをお勧めします。これは初期段階の参加に大きな効果をもたらします。",
    maxDiffSeedDescription:
      "優先順位付けには少なくとも2つの意見が必要です。最良の体験のために10〜25個を推奨します。",
    needMinimumForMaxDiff: "優先順位付けには少なくとも2つの意見が必要です。",
    addOpinion: "意見を追加",
    addMaxDiffItem: "意見を追加",
    opinionCannotBeEmpty: "意見を入力してください",
    opinionExceedsLimit:
      "意見が {limit} 文字制限を超えています ({count}/{limit})",
    opinionDuplicate: "この意見は重複しています",
    errorCreatingConversation: "新しい会話を作成する際にエラーが発生しました",
    githubSyncTitle: "GitHub の項目",
    githubSyncDescription:
      "これらの項目は GitHub Issues から同期されます。ここでは編集できません。GitHub で管理してください。",
    loadingGithubPreview: "GitHub Issues を読み込み中...",
    noGithubIssuesFound:
      "設定されたラベルの Issue は見つかりませんでした。Issue が作成されるか GitHub でラベル付けされると項目が同期されます。",
    githubPreviewError: "GitHub Issues を読み込めませんでした",
    githubPreviewRetry: "再試行",
  },
  ky: {
    nextButton: "Кийинки",
    publishButton: "Жарыялоо",
    addSeedOpinions: "Баштапкы пикирлерди кошуу",
    addMaxDiffItems: "Рейтингге билдирүүлөрдү кошуу",
    seedOpinionsDescription:
      "Ар кандай көз караштардан 8ден 15ке чейин баштапкы пикир кошуу сунушталат. Бул эрте катышууга күчтүү таасир тийгизет.",
    maxDiffSeedDescription:
      "Артыкчылыктуу кылуу үчүн кеминде 4 билдирүү керек. Эң жакшы тажрыйба үчүн 10-25 сунушталат.",
    needMinimumForMaxDiff: "Артыкчылыктуу кылуу үчүн кеминде 4 билдирүү керек.",
    addOpinion: "Пикир кошуу",
    addMaxDiffItem: "Билдирүү кошуу",
    opinionCannotBeEmpty: "Пикир бош болушу мүмкүн эмес",
    opinionExceedsLimit:
      "Пикир {limit} белги чегинен ашып кетти ({count}/{limit})",
    opinionDuplicate: "Бул пикир кайталанган",
    errorCreatingConversation: "Жаңы талкуу түзүүдө ката кетти",
    githubSyncTitle: "GitHub'дан элементтер",
    githubSyncDescription:
      "Бул элементтер GitHub маселелеринен синхрондолот. Бул жерден түзөтө албайсыз; аларды GitHub'да башкарыңыз.",
    loadingGithubPreview: "GitHub маселелери жүктөлүүдө...",
    noGithubIssuesFound:
      "Көрсөтүлгөн энбелги менен маселелер табылган жок. Маселелер GitHub'да түзүлгөндө же энбелги коюлганда элементтер синхрондолот.",
    githubPreviewError: "GitHub маселелерин жүктөө ишке ашкан жок",
    githubPreviewRetry: "Кайра аракет кылуу",
  },
  ru: {
    nextButton: "Далее",
    publishButton: "Опубликовать",
    addSeedOpinions: "Добавить начальные высказывания",
    addMaxDiffItems: "Добавить утверждения для ранжирования",
    seedOpinionsDescription:
      "Рекомендуется добавить от 8 до 15 начальных высказываний с разных точек зрения. Это значительно стимулирует раннее участие.",
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
    githubSyncTitle: "Элементы из GitHub",
    githubSyncDescription:
      "Эти элементы будут синхронизироваться из задач GitHub. Здесь их нельзя редактировать; управляйте ими в GitHub.",
    loadingGithubPreview: "Загрузка задач из GitHub...",
    noGithubIssuesFound:
      "Задачи с настроенной меткой не найдены. Элементы будут синхронизированы, когда задачи будут созданы или помечены в GitHub.",
    githubPreviewError: "Не удалось загрузить задачи из GitHub",
    githubPreviewRetry: "Повторить",
  },
};
