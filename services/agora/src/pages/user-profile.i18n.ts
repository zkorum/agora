import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface UserProfileTranslations {
  userProfile: string;
  conversations: string;
  conversationTab: string;
  opinionTab: string;
  emptyConversations: string;
  emptyStatements: string;
}

export const userProfileTranslations: Record<SupportedDisplayLanguageCodes, UserProfileTranslations> =
  {
    en: {
      userProfile: "User Profile",
      conversations: "conversations",
      conversationTab: "Conversation",
      opinionTab: "Statement",
      emptyConversations: "You have no conversations",
      emptyStatements: "You have no statements",
    },
    ar: {
      userProfile: "الملف الشخصي",
      conversations: "محادثات",
      conversationTab: "المحادثة",
      opinionTab: "المقترح",
      emptyConversations: "ليس لديك محادثات",
      emptyStatements: "ليس لديك مقترحات",
    },
    es: {
      userProfile: "Perfil de Usuario",
      conversations: "conversaciones",
      conversationTab: "Conversación",
      opinionTab: "Proposición",
      emptyConversations: "No tienes conversaciones",
      emptyStatements: "No tienes proposiciones",
    },
    fr: {
      userProfile: "Profil Utilisateur",
      conversations: "conversations",
      conversationTab: "Conversation",
      opinionTab: "Proposition",
      emptyConversations: "Vous n'avez aucune conversation",
      emptyStatements: "Vous n'avez aucune proposition",
    },
    "zh-Hans": {
      userProfile: "用户资料",
      conversations: "对话",
      conversationTab: "对话",
      opinionTab: "观点",
      emptyConversations: "您没有对话",
      emptyStatements: "您没有观点",
    },
    "zh-Hant": {
      userProfile: "用戶資料",
      conversations: "對話",
      conversationTab: "對話",
      opinionTab: "觀點",
      emptyConversations: "您沒有對話",
      emptyStatements: "您沒有觀點",
    },
    ja: {
      userProfile: "ユーザープロフィール",
      conversations: "会話",
      conversationTab: "会話",
      opinionTab: "主張",
      emptyConversations: "会話がありません",
      emptyStatements: "主張がありません",
    },
  };
