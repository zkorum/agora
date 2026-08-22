import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ConversationUpdateEmailPreviewTranslations {
  managePreferences: string;
  seeMore: string;
  unsubscribeFrom: string;
}

export const conversationUpdateEmailPreviewTranslations: Record<
  SupportedDisplayLanguageCodes,
  ConversationUpdateEmailPreviewTranslations
> = {
  en: {
    managePreferences:
      "Manage preferences or unsubscribe from specific conversations",
    seeMore: "See more",
    unsubscribeFrom: "Unsubscribe from {name}",
  },
  ar: {
    managePreferences: "إدارة التفضيلات أو إلغاء الاشتراك في محادثات محددة",
    seeMore: "عرض المزيد",
    unsubscribeFrom: "إلغاء الاشتراك في {name}",
  },
  es: {
    managePreferences:
      "Gestionar preferencias o darse de baja de conversaciones específicas",
    seeMore: "Ver más",
    unsubscribeFrom: "Darse de baja de {name}",
  },
  fa: {
    managePreferences: "مدیریت ترجیحات یا لغو اشتراک از گفت‌وگوهای خاص",
    seeMore: "مشاهده بیشتر",
    unsubscribeFrom: "لغو اشتراک از {name}",
  },
  fr: {
    managePreferences:
      "Gérer les préférences ou se désabonner de certaines conversations",
    seeMore: "Voir plus",
    unsubscribeFrom: "Se désabonner de {name}",
  },
  "zh-Hans": {
    managePreferences: "管理偏好或取消订阅特定对话",
    seeMore: "查看更多",
    unsubscribeFrom: "取消订阅{name}",
  },
  "zh-Hant": {
    managePreferences: "管理偏好或取消訂閱特定對話",
    seeMore: "查看更多",
    unsubscribeFrom: "取消訂閱{name}",
  },
  he: {
    managePreferences: "ניהול העדפות או ביטול הרשמה משיחות מסוימות",
    seeMore: "הצגת עוד",
    unsubscribeFrom: "ביטול הרשמה מ-{name}",
  },
  ja: {
    managePreferences: "設定を管理するか、特定の会話の配信を停止",
    seeMore: "さらに表示",
    unsubscribeFrom: "{name}の配信を停止",
  },
  ky: {
    managePreferences: "Жөндөөлөрдү башкаруу же айрым талкуулардан баш тартуу",
    seeMore: "Көбүрөөк көрүү",
    unsubscribeFrom: "{name} жаңыртууларынан баш тартуу",
  },
  ru: {
    managePreferences:
      "Управлять настройками или отписаться от отдельных обсуждений",
    seeMore: "Показать ещё",
    unsubscribeFrom: "Отписаться от обновлений «{name}»",
  },
};
