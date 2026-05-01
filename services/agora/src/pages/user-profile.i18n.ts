import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface UserProfileTranslations {
  userProfile: string;
  conversations: string;
  conversationTab: string;
  opinionTab: string;
  emptyConversations: string;
  emptyStatements: string;
  errorTitle: string;
  retryButton: string;
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
      errorTitle: "Something went wrong",
      retryButton: "Retry",
    },
    ar: {
      userProfile: "الملف الشخصي",
      conversations: "محادثات",
      conversationTab: "المحادثة",
      opinionTab: "المقترح",
      emptyConversations: "ليس لديك محادثات",
      emptyStatements: "ليس لديك مقترحات",
      errorTitle: "حدث خطأ ما",
      retryButton: "إعادة المحاولة",
    },
    es: {
      userProfile: "Perfil de Usuario",
      conversations: "conversaciones",
      conversationTab: "Conversación",
      opinionTab: "Proposición",
      emptyConversations: "No tienes conversaciones",
      emptyStatements: "No tienes proposiciones",
      errorTitle: "Algo salió mal",
      retryButton: "Reintentar",
    },
    fa: {
      userProfile: "پروفایل کاربر",
      conversations: "گفتگوها",
      conversationTab: "گفتگو",
      opinionTab: "گزاره",
      emptyConversations: "شما هیچ گفتگویی ندارید",
      emptyStatements: "شما هیچ گزاره‌ای ندارید",
      errorTitle: "مشکلی پیش آمد",
      retryButton: "تلاش مجدد",
    },
    he: {
      userProfile: "פרופיל משתמש",
      conversations: "שיחות",
      conversationTab: "שיחה",
      opinionTab: "הצהרה",
      emptyConversations: "אין לכם שיחות",
      emptyStatements: "אין לכם הצהרות",
      errorTitle: "משהו השתבש",
      retryButton: "נסה שוב",
    },
    fr: {
      userProfile: "Profil Utilisateur",
      conversations: "conversations",
      conversationTab: "Conversation",
      opinionTab: "Proposition",
      emptyConversations: "Vous n'avez aucune conversation",
      emptyStatements: "Vous n'avez aucune proposition",
      errorTitle: "Une erreur est survenue",
      retryButton: "Réessayer",
    },
    "zh-Hans": {
      userProfile: "用户资料",
      conversations: "对话",
      conversationTab: "对话",
      opinionTab: "观点",
      emptyConversations: "您没有对话",
      emptyStatements: "您没有观点",
      errorTitle: "出了点问题",
      retryButton: "重试",
    },
    "zh-Hant": {
      userProfile: "用戶資料",
      conversations: "對話",
      conversationTab: "對話",
      opinionTab: "觀點",
      emptyConversations: "您沒有對話",
      emptyStatements: "您沒有觀點",
      errorTitle: "出了點問題",
      retryButton: "重試",
    },
    ja: {
      userProfile: "ユーザープロフィール",
      conversations: "会話",
      conversationTab: "会話",
      opinionTab: "意見",
      emptyConversations: "会話がありません",
      emptyStatements: "意見がありません",
      errorTitle: "問題が発生しました",
      retryButton: "再試行",
    },
    ky: {
      userProfile: "Колдонуучу профили",
      conversations: "талкуулар",
      conversationTab: "Талкуу",
      opinionTab: "Пикир",
      emptyConversations: "Сизде талкуулар жок",
      emptyStatements: "Сизде пикирлер жок",
      errorTitle: "Бир нерсе туура эмес болду",
      retryButton: "Кайра аракет",
    },
    ru: {
      userProfile: "Профиль пользователя",
      conversations: "обсуждения",
      conversationTab: "Обсуждение",
      opinionTab: "Высказывание",
      emptyConversations: "У вас нет обсуждений",
      emptyStatements: "У вас нет высказываний",
      errorTitle: "Что-то пошло не так",
      retryButton: "Повторить",
    },
  };
