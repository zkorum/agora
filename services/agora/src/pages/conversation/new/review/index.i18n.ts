import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ConversationReviewTranslations {
  posting: string;
  post: string;
  addSeedOpinions: string;
  seedOpinionsDescription: string;
  addOpinion: string;
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
    seedOpinionsDescription:
      "It's recommended to seed 8 to 15 statements across a range of viewpoints. This has a powerful effect on early participation.",
    addOpinion: "Add Statement",
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
    seedOpinionsDescription:
      "يُنصح ببذر 8 إلى 15 مقترحًا عبر مجموعة من وجهات النظر. هذا له تأثير قوي على المشاركة المبكرة.",
    addOpinion: "أضف مقترحًا",
    opinionCannotBeEmpty: "لا يمكن أن يكون المقترح فارغًا",
    opinionExceedsLimit: "المقترح يتجاوز حد الـ {limit} حرف ({count}/{limit})",
    opinionDuplicate: "هذا المقترح مكرر",
    errorCreatingConversation: "خطأ أثناء محاولة إنشاء محادثة جديدة",
  },
  es: {
    posting: "Publicando...",
    post: "Publicar",
    addSeedOpinions: "Agregar Proposiciones Semilla",
    seedOpinionsDescription:
      "Se recomienda sembrar de 8 a 15 proposiciones en una gama de puntos de vista. Esto tiene un efecto poderoso en la participación temprana.",
    addOpinion: "Añadir Proposición",
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
    seedOpinionsDescription:
      "Il est recommandé de semer 8 à 15 propositions à travers une gamme de points de vue. Cela a un effet puissant sur la participation précoce.",
    addOpinion: "Ajouter une Proposition",
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
    seedOpinionsDescription:
      "建议在不同观点范围内播种8到15个观点。这会对早期参与产生强大的影响。",
    addOpinion: "添加观点",
    opinionCannotBeEmpty: "观点不能为空",
    opinionExceedsLimit: "观点超过 {limit} 字符限制 ({count}/{limit})",
    opinionDuplicate: "观点重复",
    errorCreatingConversation: "创建新对话时出错",
  },
  "zh-Hant": {
    posting: "發布中...",
    post: "發布",
    addSeedOpinions: "添加種子觀點",
    seedOpinionsDescription:
      "建議在不同觀點範圍內播種8到15個觀點。這會對早期參與產生強大的影響。",
    addOpinion: "添加觀點",
    opinionCannotBeEmpty: "觀點不能為空",
    opinionExceedsLimit: "觀點超過 {limit} 字符限制 ({count}/{limit})",
    opinionDuplicate: "觀點重複",
    errorCreatingConversation: "創建新對話時出錯",
  },
  ja: {
    posting: "投稿中...",
    post: "投稿",
    addSeedOpinions: "主張の種を追加",
    seedOpinionsDescription:
      "様々な視点からで8から15個の主張を投稿（種植え）することをお勧めします。これは初期段階の参加に強力な効果をもたらします。",
    addOpinion: "主張を追加",
    opinionCannotBeEmpty: "主張を入力してください",
    opinionExceedsLimit:
      "主張が {limit} 文字制限を超えています ({count}/{limit})",
    opinionDuplicate: "この主張は重複しています",
    errorCreatingConversation: "新しい会話を作成する際にエラーが発生しました",
  },
};
