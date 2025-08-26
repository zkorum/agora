export interface UserProfileTranslations {
  userProfile: string;
  conversations: string;
  conversationTab: string;
  opinionTab: string;
}

export const userProfileTranslations: Record<string, UserProfileTranslations> =
  {
    en: {
      userProfile: "User Profile",
      conversations: "conversations",
      conversationTab: "Conversation",
      opinionTab: "Opinion",
    },
    es: {
      userProfile: "Perfil de Usuario",
      conversations: "conversaciones",
      conversationTab: "Conversación",
      opinionTab: "Opinión",
    },
    fr: {
      userProfile: "Profil Utilisateur",
      conversations: "conversations",
      conversationTab: "Conversation",
      opinionTab: "Opinion",
    },
    "zh-CN": {
      userProfile: "用户资料",
      conversations: "对话",
      conversationTab: "对话",
      opinionTab: "意见",
    },
    "zh-TW": {
      userProfile: "用戶資料",
      conversations: "對話",
      conversationTab: "對話",
      opinionTab: "意見",
    },
    ja: {
      userProfile: "ユーザープロフィール",
      conversations: "会話",
      conversationTab: "会話",
      opinionTab: "意見",
    },
  };
