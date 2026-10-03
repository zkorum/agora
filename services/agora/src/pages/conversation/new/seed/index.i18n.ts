import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ConversationReviewTranslations {
  nextButton: string;
  publishButton: string;
  addSeedOpinions: string;
  addMaxDiffItems: string;
  seedOpinionsDescription: string;
  maxDiffSeedDescription: string;
  addStatementShortcut: string;
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
  aiSuggestionsButton: string;
  aiSuggestionsGenerating: string;
  aiSuggestionsGenerateMore: string;
  aiSuggestionsNote: string;
  aiSuggestionsNotClear: string;
  aiSuggestionAdd: string;
  aiSuggestionDiscard: string;
  aiSuggestionsEditConversation: string;
  aiSuggestionsFailed: string;
  aiSuggestionsNotAvailable: string;
  aiSuggestionsRateLimited: string;
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
    addStatementShortcut:
      "Press Shift + Enter while writing to start a new statement.",
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
    aiSuggestionsButton: "AI Suggestions",
    aiSuggestionsGenerating: "Generating",
    aiSuggestionsGenerateMore: "Generate more",
    aiSuggestionsNote:
      "Drawn from your title and description. Links and documents aren't taken into account.",
    aiSuggestionsNotClear:
      "Your title and description are not clear enough yet for AI suggestions.",
    aiSuggestionAdd: "Add",
    aiSuggestionDiscard: "Discard",
    aiSuggestionsEditConversation: "Edit conversation",
    aiSuggestionsFailed:
      "Suggestions could not be generated. You can add statements yourself or try again.",
    aiSuggestionsNotAvailable:
      "AI suggestions are not available for this account.",
    aiSuggestionsRateLimited:
      "Too many requests. Please wait a minute before trying again.",
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
    addStatementShortcut:
      "اضغط على Shift + Enter أثناء الكتابة لبدء مقترح جديد.",
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
    aiSuggestionsButton: "اقتراحات الذكاء الاصطناعي",
    aiSuggestionsGenerating: "جارٍ التوليد",
    aiSuggestionsGenerateMore: "توليد المزيد",
    aiSuggestionsNote:
      "مستخلصة من العنوان والوصف. الروابط والمستندات لا تؤخذ في الاعتبار.",
    aiSuggestionsNotClear:
      "العنوان والوصف ليسا واضحين بما يكفي بعد لتقديم اقتراحات الذكاء الاصطناعي.",
    aiSuggestionAdd: "إضافة",
    aiSuggestionDiscard: "تجاهل",
    aiSuggestionsEditConversation: "تعديل المحادثة",
    aiSuggestionsFailed:
      "تعذّر توليد الاقتراحات. يمكنك إضافة المقترحات بنفسك أو المحاولة مرة أخرى.",
    aiSuggestionsNotAvailable:
      "اقتراحات الذكاء الاصطناعي غير متاحة لهذا الحساب.",
    aiSuggestionsRateLimited:
      "طلبات كثيرة جدًا. يُرجى الانتظار دقيقة قبل المحاولة مرة أخرى.",
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
    addStatementShortcut:
      "Pulse Mayús + Intro mientras escribe para iniciar otra proposición.",
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
      "Estos elementos se sincronizarán desde incidencias de GitHub. No se pueden editar aquí; gestiónelos en GitHub.",
    loadingGithubPreview: "Cargando incidencias de GitHub...",
    noGithubIssuesFound:
      "No se encontraron incidencias con la etiqueta configurada. Los elementos se sincronizarán cuando se creen incidencias o se etiqueten en GitHub.",
    githubPreviewError: "No se pudieron cargar las incidencias de GitHub",
    githubPreviewRetry: "Reintentar",
    aiSuggestionsButton: "Sugerencias de IA",
    aiSuggestionsGenerating: "Generando",
    aiSuggestionsGenerateMore: "Generar más",
    aiSuggestionsNote:
      "Elaboradas a partir de tu título y descripción. Los enlaces y documentos no se tienen en cuenta.",
    aiSuggestionsNotClear:
      "El título y la descripción aún no son lo bastante claros para generar sugerencias con IA.",
    aiSuggestionAdd: "Añadir",
    aiSuggestionDiscard: "Descartar",
    aiSuggestionsEditConversation: "Editar la conversación",
    aiSuggestionsFailed:
      "No se pudieron generar sugerencias. Puedes añadir proposiciones tú mismo o intentarlo de nuevo.",
    aiSuggestionsNotAvailable:
      "Las sugerencias de IA no están disponibles para esta cuenta.",
    aiSuggestionsRateLimited:
      "Demasiadas solicitudes. Espera un minuto antes de volver a intentarlo.",
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
    addStatementShortcut:
      "هنگام نوشتن، Shift + Enter را فشار دهید تا گزاره جدیدی شروع کنید.",
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
    aiSuggestionsButton: "پیشنهادهای هوش مصنوعی",
    aiSuggestionsGenerating: "در حال تولید",
    aiSuggestionsGenerateMore: "تولید بیشتر",
    aiSuggestionsNote:
      "برگرفته از عنوان و توضیحات شما. پیوندها و اسناد در نظر گرفته نمی‌شوند.",
    aiSuggestionsNotClear:
      "عنوان و توضیحات شما هنوز برای پیشنهادهای هوش مصنوعی به اندازه کافی روشن نیست.",
    aiSuggestionAdd: "افزودن",
    aiSuggestionDiscard: "رد کردن",
    aiSuggestionsEditConversation: "ویرایش گفتگو",
    aiSuggestionsFailed:
      "تولید پیشنهادها ممکن نشد. می‌توانید خودتان گزاره اضافه کنید یا دوباره تلاش کنید.",
    aiSuggestionsNotAvailable:
      "پیشنهادهای هوش مصنوعی برای این حساب در دسترس نیست.",
    aiSuggestionsRateLimited:
      "درخواست‌ها بیش از حد است. لطفاً یک دقیقه صبر کنید و دوباره تلاش کنید.",
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
    addStatementShortcut:
      "בזמן הכתיבה, לחצו על Shift + Enter כדי להתחיל הצהרה חדשה.",
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
    aiSuggestionsButton: "הצעות AI",
    aiSuggestionsGenerating: "יוצר",
    aiSuggestionsGenerateMore: "יצירת הצעות נוספות",
    aiSuggestionsNote:
      "מבוסס על הכותרת והתיאור שלך. קישורים ומסמכים אינם נלקחים בחשבון.",
    aiSuggestionsNotClear:
      "הכותרת והתיאור עדיין אינם ברורים מספיק להצעות בינה מלאכותית.",
    aiSuggestionAdd: "הוספה",
    aiSuggestionDiscard: "דחייה",
    aiSuggestionsEditConversation: "עריכת השיחה",
    aiSuggestionsFailed:
      "לא ניתן היה ליצור הצעות. אפשר להוסיף הצהרות בעצמך או לנסות שוב.",
    aiSuggestionsNotAvailable: "הצעות AI אינן זמינות לחשבון זה.",
    aiSuggestionsRateLimited: "יותר מדי בקשות. יש להמתין דקה לפני ניסיון נוסף.",
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
    addStatementShortcut:
      "Pendant la saisie, appuyez sur Maj + Entrée pour commencer une nouvelle proposition.",
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
    aiSuggestionsButton: "Suggestions IA",
    aiSuggestionsGenerating: "Génération",
    aiSuggestionsGenerateMore: "En générer d'autres",
    aiSuggestionsNote:
      "Élaborées à partir de votre titre et de votre description. Les liens et les documents ne sont pas pris en compte.",
    aiSuggestionsNotClear:
      "Le titre et la description ne sont pas encore assez clairs pour proposer des suggestions IA.",
    aiSuggestionAdd: "Ajouter",
    aiSuggestionDiscard: "Écarter",
    aiSuggestionsEditConversation: "Modifier la conversation",
    aiSuggestionsFailed:
      "Les suggestions n'ont pas pu être générées. Vous pouvez ajouter des propositions vous-même ou réessayer.",
    aiSuggestionsNotAvailable:
      "Les suggestions IA ne sont pas disponibles pour ce compte.",
    aiSuggestionsRateLimited:
      "Trop de demandes. Veuillez patienter une minute avant de réessayer.",
  },
  "zh-Hans": {
    nextButton: "下一步",
    publishButton: "发布",
    addSeedOpinions: "添加初始意见",
    addMaxDiffItems: "添加待排名的意见",
    seedOpinionsDescription:
      "建议添加8到15个涵盖不同立场的初始意见。这会对早期参与产生强大的影响。",
    maxDiffSeedDescription:
      "优先排序至少需要2条意见。我们建议10至25条以获得最佳体验。",
    addStatementShortcut: "输入时按 Shift + Enter 可开始一条新意见。",
    needMinimumForMaxDiff: "优先排序至少需要2条意见。",
    addOpinion: "添加意见",
    addMaxDiffItem: "添加意见",
    opinionCannotBeEmpty: "意见不能为空",
    opinionExceedsLimit: "意见超过 {limit} 字符限制 ({count}/{limit})",
    opinionDuplicate: "意见重复",
    errorCreatingConversation: "创建新对话时出错",
    githubSyncTitle: "来自 GitHub 的项目",
    githubSyncDescription:
      "这些项目将从 GitHub issue 同步。它们无法在此处编辑，请在 GitHub 上管理。",
    loadingGithubPreview: "正在从 GitHub 加载 issue...",
    noGithubIssuesFound:
      "未找到带有已配置标签的 issue。创建 issue 或在 GitHub 上添加标签后，项目将同步。",
    githubPreviewError: "无法从 GitHub 加载 issue",
    githubPreviewRetry: "重试",
    aiSuggestionsButton: "AI 建议",
    aiSuggestionsGenerating: "正在生成",
    aiSuggestionsGenerateMore: "生成更多",
    aiSuggestionsNote: "根据您的标题和描述生成。不包含链接和文档的内容。",
    aiSuggestionsNotClear: "您的标题和描述还不够清晰，暂时无法生成 AI 建议。",
    aiSuggestionAdd: "添加",
    aiSuggestionDiscard: "放弃",
    aiSuggestionsEditConversation: "编辑对话",
    aiSuggestionsFailed: "无法生成建议。您可以自行添加意见，或重试。",
    aiSuggestionsNotAvailable: "此账户无法使用 AI 建议。",
    aiSuggestionsRateLimited: "请求过多。请等待一分钟后重试。",
  },
  "zh-Hant": {
    nextButton: "下一步",
    publishButton: "發布",
    addSeedOpinions: "添加初始意見",
    addMaxDiffItems: "添加待排名的意見",
    seedOpinionsDescription:
      "建議添加8到15個涵蓋不同立場的初始意見。這會對早期參與產生強大的影響。",
    maxDiffSeedDescription:
      "優先排序至少需要2條意見。我們建議10至25條以獲得最佳體驗。",
    addStatementShortcut: "輸入時按 Shift + Enter 可開始一條新意見。",
    needMinimumForMaxDiff: "優先排序至少需要2條意見。",
    addOpinion: "添加意見",
    addMaxDiffItem: "添加意見",
    opinionCannotBeEmpty: "意見不能為空",
    opinionExceedsLimit: "意見超過 {limit} 字符限制 ({count}/{limit})",
    opinionDuplicate: "意見重複",
    errorCreatingConversation: "創建新對話時出錯",
    githubSyncTitle: "來自 GitHub 的項目",
    githubSyncDescription:
      "這些項目會從 GitHub issue 同步。它們無法在此處編輯，請在 GitHub 上管理。",
    loadingGithubPreview: "正在從 GitHub 載入 issue...",
    noGithubIssuesFound:
      "未找到帶有已設定標籤的 issue。建立 issue 或在 GitHub 上新增標籤後，項目會同步。",
    githubPreviewError: "無法從 GitHub 載入 issue",
    githubPreviewRetry: "重試",
    aiSuggestionsButton: "AI 建議",
    aiSuggestionsGenerating: "正在生成",
    aiSuggestionsGenerateMore: "生成更多",
    aiSuggestionsNote: "根據您的標題和描述生成。不包含連結和文件的內容。",
    aiSuggestionsNotClear: "您的標題和描述還不夠清楚，暫時無法產生 AI 建議。",
    aiSuggestionAdd: "添加",
    aiSuggestionDiscard: "放棄",
    aiSuggestionsEditConversation: "編輯對話",
    aiSuggestionsFailed: "無法生成建議。您可以自行添加意見，或重試。",
    aiSuggestionsNotAvailable: "此帳戶無法使用 AI 建議。",
    aiSuggestionsRateLimited: "請求過多。請等待一分鐘後重試。",
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
    addStatementShortcut:
      "入力中に Shift + Enter を押すと、新しい意見を始められます。",
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
    aiSuggestionsButton: "AI の提案",
    aiSuggestionsGenerating: "生成中",
    aiSuggestionsGenerateMore: "さらに生成",
    aiSuggestionsNote:
      "タイトルと説明をもとに作成しています。リンクやドキュメントの内容は反映されません。",
    aiSuggestionsNotClear:
      "タイトルと説明がまだ十分に明確ではないため、AI による提案を作成できません。",
    aiSuggestionAdd: "追加",
    aiSuggestionDiscard: "破棄",
    aiSuggestionsEditConversation: "会話を編集",
    aiSuggestionsFailed:
      "提案を生成できませんでした。ご自身で意見を追加するか、もう一度お試しください。",
    aiSuggestionsNotAvailable: "このアカウントでは AI の提案を利用できません。",
    aiSuggestionsRateLimited:
      "リクエストが多すぎます。1 分ほど待ってからもう一度お試しください。",
  },
  ky: {
    nextButton: "Кийинки",
    publishButton: "Жарыялоо",
    addSeedOpinions: "Баштапкы пикирлерди кошуу",
    addMaxDiffItems: "Рейтингге пикирлерди кошуу",
    seedOpinionsDescription:
      "Ар кандай көз караштардан 8ден 15ке чейин баштапкы пикир кошуу сунушталат. Бул эрте катышууга күчтүү таасир тийгизет.",
    maxDiffSeedDescription:
      "Артыкчылык берүү үчүн кеминде 2 пикир керек. Ыңгайлуу колдонуу үчүн 10дон 25ке чейин пикир сунушталат.",
    addStatementShortcut:
      "Жазып жатканда жаңы пикирди баштоо үчүн Shift + Enter басыңыз.",
    needMinimumForMaxDiff: "Артыкчылык берүү үчүн кеминде 2 пикир керек.",
    addOpinion: "Пикир кошуу",
    addMaxDiffItem: "Пикир кошуу",
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
    aiSuggestionsButton: "AI сунуштары",
    aiSuggestionsGenerating: "Түзүлүүдө",
    aiSuggestionsGenerateMore: "Дагы түзүү",
    aiSuggestionsNote:
      "Аталышыңыз менен сүрөттөмөңүздүн негизинде түзүлдү. Шилтемелер менен документтер эске алынбайт.",
    aiSuggestionsNotClear:
      "Аталышыңыз жана сүрөттөмөңүз AI сунуштары үчүн азырынча жетиштүү түшүнүктүү эмес.",
    aiSuggestionAdd: "Кошуу",
    aiSuggestionDiscard: "Четке кагуу",
    aiSuggestionsEditConversation: "Талкууну түзөтүү",
    aiSuggestionsFailed:
      "Сунуштарды түзүү мүмкүн болгон жок. Пикирлерди өзүңүз кошсоңуз же кайра аракет кылсаңыз болот.",
    aiSuggestionsNotAvailable: "AI сунуштары бул аккаунт үчүн жеткиликсиз.",
    aiSuggestionsRateLimited:
      "Сурамдар өтө көп. Кайра аракет кылуудан мурун бир мүнөт күтүңүз.",
  },
  ru: {
    nextButton: "Далее",
    publishButton: "Опубликовать",
    addSeedOpinions: "Добавить начальные высказывания",
    addMaxDiffItems: "Добавить высказывания для ранжирования",
    seedOpinionsDescription:
      "Рекомендуется добавить от 8 до 15 начальных высказываний с разных точек зрения. Это значительно стимулирует раннее участие.",
    maxDiffSeedDescription:
      "Для приоритизации требуется как минимум 2 высказывания. Для удобной работы рекомендуем добавить от 10 до 25.",
    addStatementShortcut:
      "Во время ввода нажмите Shift + Enter, чтобы начать новое высказывание.",
    needMinimumForMaxDiff:
      "Для приоритизации требуется как минимум 2 высказывания.",
    addOpinion: "Добавить высказывание",
    addMaxDiffItem: "Добавить высказывание",
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
    aiSuggestionsButton: "Предложения ИИ",
    aiSuggestionsGenerating: "Генерация",
    aiSuggestionsGenerateMore: "Сгенерировать ещё",
    aiSuggestionsNote:
      "Составлено по вашему заголовку и описанию. Ссылки и документы не учитываются.",
    aiSuggestionsNotClear:
      "Название и описание пока недостаточно понятны для предложений ИИ.",
    aiSuggestionAdd: "Добавить",
    aiSuggestionDiscard: "Отклонить",
    aiSuggestionsEditConversation: "Изменить обсуждение",
    aiSuggestionsFailed:
      "Не удалось сгенерировать предложения. Вы можете добавить высказывания сами или попробовать ещё раз.",
    aiSuggestionsNotAvailable: "Предложения ИИ недоступны для этого аккаунта.",
    aiSuggestionsRateLimited:
      "Слишком много запросов. Подождите минуту и попробуйте снова.",
  },
};
