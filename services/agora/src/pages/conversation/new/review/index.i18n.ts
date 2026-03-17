import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ConversationReviewTranslations {
  posting: string;
  post: string;
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
}

export const conversationReviewTranslations: Record<
  SupportedDisplayLanguageCodes,
  ConversationReviewTranslations
> = {
  en: {
    posting: "Posting...",
    post: "Post",
    addSeedOpinions: "Add Seed Statements",
    addMaxDiffItems: "Add Statements to Rank",
    seedOpinionsDescription:
      "It's recommended to seed 8 to 15 statements across a range of viewpoints. This has a powerful effect on early participation.",
    maxDiffSeedDescription:
      "Prioritization requires at least 6 statements. We recommend 10 to 25 for the best experience.",
    needMinimumForMaxDiff:
      "At least 6 statements are required for prioritization.",
    addOpinion: "Add Statement",
    addMaxDiffItem: "Add Statement",
    opinionCannotBeEmpty: "Statement cannot be empty",
    opinionExceedsLimit:
      "Statement exceeds {limit} character limit ({count}/{limit})",
    opinionDuplicate: "This statement is a duplicate",
    errorCreatingConversation:
      "Error while trying to create a new conversation",
  },
  ar: {
    posting: "جاري النشر...",
    post: "نشر",
    addSeedOpinions: "إضافة مقترحات أولية",
    addMaxDiffItems: "إضافة عبارات للترتيب",
    seedOpinionsDescription:
      "يُنصح ببذر 8 إلى 15 مقترحًا عبر مجموعة من وجهات النظر. هذا له تأثير قوي على المشاركة المبكرة.",
    maxDiffSeedDescription:
      "يتطلب ترتيب الأولويات 6 مقترحات على الأقل. نوصي بـ 10 إلى 25 للحصول على أفضل تجربة.",
    needMinimumForMaxDiff:
      "مطلوب 6 مقترحات على الأقل لترتيب الأولويات.",
    addOpinion: "أضف مقترحًا",
    addMaxDiffItem: "أضف عبارة",
    opinionCannotBeEmpty: "لا يمكن أن يكون المقترح فارغًا",
    opinionExceedsLimit: "المقترح يتجاوز حد الـ {limit} حرف ({count}/{limit})",
    opinionDuplicate: "هذا المقترح مكرر",
    errorCreatingConversation: "خطأ أثناء محاولة إنشاء محادثة جديدة",
  },
  es: {
    posting: "Publicando...",
    post: "Publicar",
    addSeedOpinions: "Agregar Proposiciones Semilla",
    addMaxDiffItems: "Agregar Declaraciones a Clasificar",
    seedOpinionsDescription:
      "Se recomienda sembrar de 8 a 15 proposiciones en una gama de puntos de vista. Esto tiene un efecto poderoso en la participación temprana.",
    maxDiffSeedDescription:
      "La priorización requiere al menos 6 declaraciones. Recomendamos de 10 a 25 para la mejor experiencia.",
    needMinimumForMaxDiff:
      "Se requieren al menos 6 declaraciones para la priorización.",
    addOpinion: "Añadir Proposición",
    addMaxDiffItem: "Añadir Declaración",
    opinionCannotBeEmpty: "La proposición no puede estar vacía",
    opinionExceedsLimit:
      "La proposición excede el límite de {limit} caracteres ({count}/{limit})",
    opinionDuplicate: "Esta proposición es un duplicado",
    errorCreatingConversation: "Error al intentar crear una nueva conversación",
  },
  fr: {
    posting: "Publication...",
    post: "Publier",
    addSeedOpinions: "Ajouter des Propositions Initiales",
    addMaxDiffItems: "Ajouter les Propositions à Classer",
    seedOpinionsDescription:
      "Il est recommandé de semer 8 à 15 propositions à travers une gamme de points de vue. Cela a un effet puissant sur la participation précoce.",
    maxDiffSeedDescription:
      "La hiérarchisation nécessite au moins 6 propositions. Nous recommandons 10 à 25 pour une meilleure expérience.",
    needMinimumForMaxDiff:
      "Au moins 6 propositions sont requises pour la hiérarchisation.",
    addOpinion: "Ajouter une Proposition",
    addMaxDiffItem: "Ajouter une Proposition",
    opinionCannotBeEmpty: "La proposition ne peut pas être vide",
    opinionExceedsLimit:
      "La proposition dépasse la limite de {limit} caractères ({count}/{limit})",
    opinionDuplicate: "Cette proposition est un doublon",
    errorCreatingConversation:
      "Erreur lors de la tentative de création d'une nouvelle conversation",
  },
  "zh-Hans": {
    posting: "发布中...",
    post: "发布",
    addSeedOpinions: "添加种子观点",
    addMaxDiffItems: "添加待排名的陈述",
    seedOpinionsDescription:
      "建议在不同观点范围内播种8到15个观点。这会对早期参与产生强大的影响。",
    maxDiffSeedDescription:
      "优先排序至少需要6条陈述。我们建议10至25条以获得最佳体验。",
    needMinimumForMaxDiff:
      "优先排序至少需要6条陈述。",
    addOpinion: "添加观点",
    addMaxDiffItem: "添加陈述",
    opinionCannotBeEmpty: "观点不能为空",
    opinionExceedsLimit: "观点超过 {limit} 字符限制 ({count}/{limit})",
    opinionDuplicate: "观点重复",
    errorCreatingConversation: "创建新对话时出错",
  },
  "zh-Hant": {
    posting: "發布中...",
    post: "發布",
    addSeedOpinions: "添加種子觀點",
    addMaxDiffItems: "添加待排名的陳述",
    seedOpinionsDescription:
      "建議在不同觀點範圍內播種8到15個觀點。這會對早期參與產生強大的影響。",
    maxDiffSeedDescription:
      "優先排序至少需要6條陳述。我們建議10至25條以獲得最佳體驗。",
    needMinimumForMaxDiff:
      "優先排序至少需要6條陳述。",
    addOpinion: "添加觀點",
    addMaxDiffItem: "添加陳述",
    opinionCannotBeEmpty: "觀點不能為空",
    opinionExceedsLimit: "觀點超過 {limit} 字符限制 ({count}/{limit})",
    opinionDuplicate: "觀點重複",
    errorCreatingConversation: "創建新對話時出錯",
  },
  ja: {
    posting: "投稿中...",
    post: "投稿",
    addSeedOpinions: "主張の種を追加",
    addMaxDiffItems: "ランク付けするステートメントを追加",
    seedOpinionsDescription:
      "様々な視点からで8から15個の主張を投稿（種植え）することをお勧めします。これは初期段階の参加に強力な効果をもたらします。",
    maxDiffSeedDescription:
      "優先順位付けには少なくとも6つのステートメントが必要です。最良の体験のために10〜25を推奨します。",
    needMinimumForMaxDiff:
      "優先順位付けには少なくとも6つのステートメントが必要です。",
    addOpinion: "主張を追加",
    addMaxDiffItem: "ステートメントを追加",
    opinionCannotBeEmpty: "主張を入力してください",
    opinionExceedsLimit:
      "主張が {limit} 文字制限を超えています ({count}/{limit})",
    opinionDuplicate: "この主張は重複しています",
    errorCreatingConversation: "新しい会話を作成する際にエラーが発生しました",
  },
  fa: {
    posting: "در حال ارسال...",
    post: "ارسال",
    addSeedOpinions: "افزودن نظرات اولیه",
    seedOpinionsDescription:
      "It's recommended to seed 8 to 15 statements across a range of viewpoints. This has a powerful effect on early participation.",
    addOpinion: "افزودن نظر",
    opinionCannotBeEmpty: "نظر نمی‌تواند خالی باشد",
    opinionExceedsLimit:
      "Statement exceeds {limit} character limit ({count}/{limit})",
    opinionDuplicate: "این نظر تکراری است",
    errorCreatingConversation:
      "Error while trying to create a new conversation",
  ky: {
    posting: "Жарыяланууда...",
    post: "Жарыялоо",
    addSeedOpinions: "Баштапкы пикирлерди кошуу",
    addMaxDiffItems: "Рейтингге билдирүүлөрдү кошуу",
    seedOpinionsDescription:
      "Ар кандай көз караштардан 8ден 15ке чейин пикир кошуу сунушталат. Бул эрте катышууга күчтүү таасир тийгизет.",
    maxDiffSeedDescription:
      "Артыкчылыктуу кылуу үчүн кеминде 6 билдирүү керек. Эң жакшы тажрыйба үчүн 10-25 сунушталат.",
    needMinimumForMaxDiff:
      "Артыкчылыктуу кылуу үчүн кеминде 6 билдирүү керек.",
    addOpinion: "Пикир кошуу",
    addMaxDiffItem: "Билдирүү кошуу",
    opinionCannotBeEmpty: "Пикир бош болушу мүмкүн эмес",
    opinionExceedsLimit:
      "Пикир {limit} белги чегинен ашып кетти ({count}/{limit})",
    opinionDuplicate: "Бул пикир кайталанган",
    errorCreatingConversation: "Жаңы талкуу түзүүдө ката кетти",
  },
  ru: {
    posting: "Публикация...",
    post: "Опубликовать",
    addSeedOpinions: "Добавить начальные высказывания",
    addMaxDiffItems: "Добавить утверждения для ранжирования",
    seedOpinionsDescription:
      "Рекомендуется добавить от 8 до 15 высказываний с разных точек зрения. Это значительно стимулирует раннее участие.",
    maxDiffSeedDescription:
      "Для приоритизации необходимо минимум 6 высказываний. Рекомендуем 10-25 для лучшего опыта.",
    needMinimumForMaxDiff:
      "Для приоритизации необходимо минимум 6 высказываний.",
    addOpinion: "Добавить высказывание",
    addMaxDiffItem: "Добавить утверждение",
    opinionCannotBeEmpty: "Высказывание не может быть пустым",
    opinionExceedsLimit:
      "Высказывание превышает лимит в {limit} символов ({count}/{limit})",
    opinionDuplicate: "Это высказывание дублируется",
    errorCreatingConversation: "Ошибка при создании нового обсуждения",
  },
};
