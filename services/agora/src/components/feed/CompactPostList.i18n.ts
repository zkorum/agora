import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface CompactPostListTranslations {
  emptyStateTitle: string;
  emptyStateDescription: string;
  completedTitle: string;
  completedDescription: string;
  newConversationsButton: string;
  retryButton: string;
}

export const compactPostListTranslations: Record<
  SupportedDisplayLanguageCodes,
  CompactPostListTranslations
> = {
  en: {
    emptyStateTitle: "It is too quiet here...",
    emptyStateDescription: "Create a new conversation using the",
    completedTitle: "You're all caught up",
    completedDescription: "You have seen all the new conversations.",
    newConversationsButton: "New conversations",
    retryButton: "Retry",
  },
  ar: {
    emptyStateTitle: "إنه هادئ جداً هنا...",
    emptyStateDescription: "أنشئ محادثة جديدة باستخدام",
    completedTitle: "لقد اطلعت على كل شيء",
    completedDescription: "لقد شاهدت جميع المحادثات الجديدة.",
    newConversationsButton: "محادثات جديدة",
    retryButton: "إعادة المحاولة",
  },
  es: {
    emptyStateTitle: "Está muy silencioso aquí...",
    emptyStateDescription: "Crea una nueva conversación usando el",
    completedTitle: "Estás al día",
    completedDescription: "Has visto todas las conversaciones nuevas.",
    newConversationsButton: "Nuevas conversaciones",
    retryButton: "Reintentar",
  },
  fr: {
    emptyStateTitle: "C'est trop calme ici...",
    emptyStateDescription: "Créez une nouvelle conversation en utilisant le",
    completedTitle: "Vous êtes à jour",
    completedDescription: "Vous avez vu toutes les nouvelles conversations.",
    newConversationsButton: "Nouvelles conversations",
    retryButton: "Réessayer",
  },
  "zh-Hans": {
    emptyStateTitle: "这里太安静了...",
    emptyStateDescription: "使用",
    completedTitle: "你已经看完了所有新对话",
    completedDescription: "你已经看完了所有新对话。",
    newConversationsButton: "新对话",
    retryButton: "重试",
  },
  "zh-Hant": {
    emptyStateTitle: "這裡太安靜了...",
    emptyStateDescription: "使用",
    completedTitle: "你已經看完了所有新對話",
    completedDescription: "你已經看完了所有新對話。",
    newConversationsButton: "新對話",
    retryButton: "重試",
  },
  ja: {
    emptyStateTitle: "ここは静かすぎます...",
    emptyStateDescription: "をタップして新しい会話を作成してください。",
    completedTitle: "すべての新しい会話を見ました",
    completedDescription: "すべての新しい会話を見ました。",
    newConversationsButton: "新しい会話",
    retryButton: "再試行",
  },
  ky: {
    emptyStateTitle: "Бул жерде өтө тынч...",
    emptyStateDescription: "Жаңы талкуу түзүү үчүн",
    completedTitle: "Баарын карап чыктыңыз",
    completedDescription: "Бардык жаңы талкууларды көрдүңүз.",
    newConversationsButton: "Жаңы талкуулар",
    retryButton: "Кайра аракет",
  },
  ru: {
    emptyStateTitle: "Здесь слишком тихо...",
    emptyStateDescription: "Создайте новое обсуждение с помощью",
    completedTitle: "Вы всё просмотрели",
    completedDescription: "Вы просмотрели все новые обсуждения.",
    newConversationsButton: "Новые обсуждения",
    retryButton: "Повторить",
  },
};
