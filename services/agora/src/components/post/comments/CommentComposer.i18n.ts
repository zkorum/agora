export interface CommentComposerTranslations {
  placeholder: string;
  postButton: string;
  conversationLockedError: string;
  createOpinionError: string;
  [key: string]: string;
}

export const commentComposerTranslations: Record<
  string,
  CommentComposerTranslations
> = {
  en: {
    placeholder: "Add your own opinion",
    postButton: "Post",
    conversationLockedError:
      "Cannot create opinion because the conversation is locked",
    createOpinionError: "Error while trying to create a new opinion",
  },
  es: {
    placeholder: "Añade tu propia opinión",
    postButton: "Publicar",
    conversationLockedError:
      "No se puede crear una opinión porque la conversación está bloqueada",
    createOpinionError: "Error al intentar crear una nueva opinión",
  },
  fr: {
    placeholder: "Ajoutez votre propre opinion",
    postButton: "Publier",
    conversationLockedError:
      "Impossible de créer une opinion car la conversation est verrouillée",
    createOpinionError:
      "Erreur lors de la tentative de création d'une nouvelle opinion",
  },
  "zh-CN": {
    placeholder: "添加您自己的意见",
    postButton: "发布",
    conversationLockedError: "无法创建意见，因为对话已锁定",
    createOpinionError: "尝试创建新意见时出错",
  },
  "zh-TW": {
    placeholder: "添加您自己的意見",
    postButton: "發布",
    conversationLockedError: "無法創建意見，因為對話已鎖定",
    createOpinionError: "嘗試創建新意見時出錯",
  },
  ja: {
    placeholder: "あなた自身の意見を追加",
    postButton: "投稿",
    conversationLockedError: "会話がロックされているため、意見を作成できません",
    createOpinionError: "新しい意見を作成しようとした際にエラーが発生しました",
  },
};
