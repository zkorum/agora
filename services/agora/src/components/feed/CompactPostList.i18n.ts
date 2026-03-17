import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface CompactPostListTranslations {
  emptyStateTitle: string;
  emptyStateDescription: string;
  errorStateTitle: string;
  networkErrorTitle: string;
  networkErrorDescription: string;
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
    errorStateTitle: "Something went wrong",
    networkErrorTitle: "Connection lost",
    networkErrorDescription: "Conversations will load when you're back online.",
    completedTitle: "You're all caught up",
    completedDescription: "You have seen all the new conversations.",
    newConversationsButton: "New conversations",
    retryButton: "Retry",
  },
  ar: {
    emptyStateTitle: "إنه هادئ جداً هنا...",
    emptyStateDescription: "أنشئ محادثة جديدة باستخدام",
    errorStateTitle: "حدث خطأ ما",
    networkErrorTitle: "انقطع الاتصال",
    networkErrorDescription: "ستظهر المحادثات عندما تعود للاتصال.",
    completedTitle: "لقد اطلعت على كل شيء",
    completedDescription: "لقد شاهدت جميع المحادثات الجديدة.",
    newConversationsButton: "محادثات جديدة",
    retryButton: "إعادة المحاولة",
  },
  es: {
    emptyStateTitle: "Está muy silencioso aquí...",
    emptyStateDescription: "Crea una nueva conversación usando el",
    errorStateTitle: "Algo salió mal",
    networkErrorTitle: "Conexión perdida",
    networkErrorDescription: "Las conversaciones se cargarán cuando vuelvas a estar en línea.",
    completedTitle: "Estás al día",
    completedDescription: "Has visto todas las conversaciones nuevas.",
    newConversationsButton: "Nuevas conversaciones",
    retryButton: "Reintentar",
  },
  fr: {
    emptyStateTitle: "C'est trop calme ici...",
    emptyStateDescription: "Créez une nouvelle conversation en utilisant le",
    errorStateTitle: "Une erreur est survenue",
    networkErrorTitle: "Connexion perdue",
    networkErrorDescription: "Les conversations se chargeront quand vous serez de nouveau en ligne.",
    completedTitle: "Vous êtes à jour",
    completedDescription: "Vous avez vu toutes les nouvelles conversations.",
    newConversationsButton: "Nouvelles conversations",
    retryButton: "Réessayer",
  },
  "zh-Hans": {
    emptyStateTitle: "这里太安静了...",
    emptyStateDescription: "使用",
    errorStateTitle: "出了点问题",
    networkErrorTitle: "连接已断开",
    networkErrorDescription: "恢复连接后将自动加载对话。",
    completedTitle: "你已经看完了所有新对话",
    completedDescription: "你已经看完了所有新对话。",
    newConversationsButton: "新对话",
    retryButton: "重试",
  },
  "zh-Hant": {
    emptyStateTitle: "這裡太安靜了...",
    emptyStateDescription: "使用",
    errorStateTitle: "出了點問題",
    networkErrorTitle: "連線已中斷",
    networkErrorDescription: "恢復連線後將自動載入對話。",
    completedTitle: "你已經看完了所有新對話",
    completedDescription: "你已經看完了所有新對話。",
    newConversationsButton: "新對話",
    retryButton: "重試",
  },
  ja: {
    emptyStateTitle: "ここは静かすぎます...",
    emptyStateDescription: "をタップして新しい会話を作成してください。",
    errorStateTitle: "問題が発生しました",
    networkErrorTitle: "接続が切断されました",
    networkErrorDescription: "オンラインに戻ると会話が読み込まれます。",
    completedTitle: "すべての新しい会話を見ました",
    completedDescription: "すべての新しい会話を見ました。",
    newConversationsButton: "新しい会話",
    retryButton: "再試行",
  },
  ky: {
    emptyStateTitle: "Бул жерде өтө тынч...",
    emptyStateDescription: "Жаңы талкуу түзүү үчүн",
    errorStateTitle: "Бир нерсе туура эмес болду",
    networkErrorTitle: "Байланыш үзүлдү",
    networkErrorDescription: "Байланыш калыбына келгенде талкуулар жүктөлөт.",
    completedTitle: "Баарын карап чыктыңыз",
    completedDescription: "Бардык жаңы талкууларды көрдүңүз.",
    newConversationsButton: "Жаңы талкуулар",
    retryButton: "Кайра аракет",
  },
  ru: {
    emptyStateTitle: "Здесь слишком тихо...",
    emptyStateDescription: "Создайте новое обсуждение с помощью",
    errorStateTitle: "Что-то пошло не так",
    networkErrorTitle: "Соединение потеряно",
    networkErrorDescription: "Обсуждения загрузятся, когда вы снова будете в сети.",
    completedTitle: "Вы всё просмотрели",
    completedDescription: "Вы просмотрели все новые обсуждения.",
    newConversationsButton: "Новые обсуждения",
    retryButton: "Повторить",
  },
};
