export interface ConversationReviewTranslations {
  posting: string;
  post: string;
  addSeedOpinions: string;
  seedOpinionsDescription: string;
  add: string;
  inputTextPlaceholder: string;
  opinionCannotBeEmpty: string;
  opinionExceedsLimit: string;
  opinionDuplicate: string;
  errorCreatingConversation: string;
  [key: string]: string;
}

export const conversationReviewTranslations: Record<
  string,
  ConversationReviewTranslations
> = {
  en: {
    posting: "Posting...",
    post: "Post",
    addSeedOpinions: "Add Seed Opinions",
    seedOpinionsDescription:
      "It's recommended to seed 8 to 15 opinions across a range of viewpoints. This has a powerful effect on early participation.",
    add: "Add",
    inputTextPlaceholder: "Input text",
    opinionCannotBeEmpty: "Opinion cannot be empty",
    opinionExceedsLimit:
      "Opinion exceeds {limit} character limit ({count}/{limit})",
    opinionDuplicate: "This opinion is a duplicate",
    errorCreatingConversation:
      "Error while trying to create a new conversation",
  },
  ar: {
    posting: "جاري النشر...",
    post: "نشر",
    addSeedOpinions: "إضافة آراء أولية",
    seedOpinionsDescription:
      "يُنصح ببذر 8 إلى 15 رأيًا عبر مجموعة من وجهات النظر. هذا له تأثير قوي على المشاركة المبكرة.",
    add: "إضافة",
    inputTextPlaceholder: "أدخل النص",
    opinionCannotBeEmpty: "لا يمكن أن يكون الرأي فارغًا",
    opinionExceedsLimit:
      "الرأي يتجاوز حد الـ {limit} حرف ({count}/{limit})",
    opinionDuplicate: "هذا الرأي مكرر",
    errorCreatingConversation:
      "خطأ أثناء محاولة إنشاء محادثة جديدة",
  },
  es: {
    posting: "Publicando...",
    post: "Publicar",
    addSeedOpinions: "Agregar Opiniones Semilla",
    seedOpinionsDescription:
      "Se recomienda sembrar de 8 a 15 opiniones en una gama de puntos de vista. Esto tiene un efecto poderoso en la participación temprana.",
    add: "Agregar",
    inputTextPlaceholder: "Ingrese texto",
    opinionCannotBeEmpty: "La opinión no puede estar vacía",
    opinionExceedsLimit:
      "La opinión excede el límite de {limit} caracteres ({count}/{limit})",
    opinionDuplicate: "Esta opinión es un duplicado",
    errorCreatingConversation: "Error al intentar crear una nueva conversación",
  },
  fr: {
    posting: "Publication...",
    post: "Publier",
    addSeedOpinions: "Ajouter des Opinions Initiales",
    seedOpinionsDescription:
      "Il est recommandé de semer 8 à 15 opinions à travers une gamme de points de vue. Cela a un effet puissant sur la participation précoce.",
    add: "Ajouter",
    inputTextPlaceholder: "Saisir le texte",
    opinionCannotBeEmpty: "L'opinion ne peut pas être vide",
    opinionExceedsLimit:
      "L'opinion dépasse la limite de {limit} caractères ({count}/{limit})",
    opinionDuplicate: "Cette opinion est un doublon",
    errorCreatingConversation:
      "Erreur lors de la tentative de création d'une nouvelle conversation",
  },
  "zh-Hans": {
    posting: "发布中...",
    post: "发布",
    addSeedOpinions: "添加种子意见",
    seedOpinionsDescription:
      "建议在不同观点范围内播种8到15个意见。这会对早期参与产生强大的影响。",
    add: "添加",
    inputTextPlaceholder: "输入文本",
    opinionCannotBeEmpty: "意见不能为空",
    opinionExceedsLimit: "意见超过 {limit} 字符限制 ({count}/{limit})",
    opinionDuplicate: "意见重复",
    errorCreatingConversation: "创建新对话时出错",
  },
  "zh-Hant": {
    posting: "發布中...",
    post: "發布",
    addSeedOpinions: "添加種子意見",
    seedOpinionsDescription:
      "建議在不同觀點範圍內播種8到15個意見。這會對早期參與產生強大的影響。",
    add: "添加",
    inputTextPlaceholder: "輸入文本",
    opinionCannotBeEmpty: "意見不能為空",
    opinionExceedsLimit: "意見超過 {limit} 字符限制 ({count}/{limit})",
    opinionDuplicate: "意見重複",
    errorCreatingConversation: "創建新對話時出錯",
  },
  ja: {
    posting: "投稿中...",
    post: "投稿",
    addSeedOpinions: "種子意見を追加",
    seedOpinionsDescription:
      "異なる視点の範囲で8から15個の意見を播種することをお勧めします。これは早期参加に強力な影響を与えます。",
    add: "追加",
    inputTextPlaceholder: "テキストを入力",
    opinionCannotBeEmpty: "意見を入力してください",
    opinionExceedsLimit:
      "意見が {limit} 文字制限を超えています ({count}/{limit})",
    opinionDuplicate: "この意見は重複しています",
    errorCreatingConversation: "新しい会話を作成する際にエラーが発生しました",
  },
};
