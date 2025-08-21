export interface UserProfileTranslations {
  userProfile: string;
  conversations: string;
  conversationTab: string;
  opinionTab: string;
  [key: string]: string;
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
  };
