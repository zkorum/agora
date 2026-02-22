import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface UserProfileTranslations {
  userProfile: string;
  conversations: string;
  conversationTab: string;
  opinionTab: string;
}

export const userProfileTranslations: Record<SupportedDisplayLanguageCodes, UserProfileTranslations> =
  {
    en: {
      userProfile: "User Profile",
      conversations: "conversations",
      conversationTab: "Conversation",
      opinionTab: "Statement",
    },
    ar: {
      userProfile: "الملف الشخصي",
      conversations: "محادثات",
      conversationTab: "المحادثة",
      opinionTab: "المقترح",
    },
    es: {
      userProfile: "Perfil de Usuario",
      conversations: "conversaciones",
      conversationTab: "Conversación",
      opinionTab: "Proposición",
    },
    fr: {
      userProfile: "Profil Utilisateur",
      conversations: "conversations",
      conversationTab: "Conversation",
      opinionTab: "Proposition",
    },
    "zh-Hans": {
      userProfile: "用户资料",
      conversations: "对话",
      conversationTab: "对话",
      opinionTab: "观点",
    },
    "zh-Hant": {
      userProfile: "用戶資料",
      conversations: "對話",
      conversationTab: "對話",
      opinionTab: "觀點",
    },
    ja: {
      userProfile: "ユーザープロフィール",
      conversations: "会話",
      conversationTab: "会話",
      opinionTab: "主張",
    },
  };
