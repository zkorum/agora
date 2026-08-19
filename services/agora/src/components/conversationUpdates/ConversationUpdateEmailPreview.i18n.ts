import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ConversationUpdateEmailPreviewTranslations {
  seeMore: string;
  unsubscribeFrom: string;
}

export const conversationUpdateEmailPreviewTranslations: Record<
  SupportedDisplayLanguageCodes,
  ConversationUpdateEmailPreviewTranslations
> = {
  en: {
    seeMore: "See more",
    unsubscribeFrom: "Unsubscribe from {name}",
  },
  ar: {
    seeMore: "عرض المزيد",
    unsubscribeFrom: "إلغاء الاشتراك في {name}",
  },
  es: {
    seeMore: "Ver más",
    unsubscribeFrom: "Darse de baja de {name}",
  },
  fa: {
    seeMore: "مشاهده بیشتر",
    unsubscribeFrom: "لغو اشتراک از {name}",
  },
  fr: {
    seeMore: "Voir plus",
    unsubscribeFrom: "Se désabonner de {name}",
  },
  "zh-Hans": {
    seeMore: "查看更多",
    unsubscribeFrom: "取消订阅{name}",
  },
  "zh-Hant": {
    seeMore: "查看更多",
    unsubscribeFrom: "取消訂閱{name}",
  },
  he: {
    seeMore: "הצגת עוד",
    unsubscribeFrom: "ביטול הרשמה מ-{name}",
  },
  ja: {
    seeMore: "さらに表示",
    unsubscribeFrom: "{name}の配信を停止",
  },
  ky: {
    seeMore: "Көбүрөөк көрүү",
    unsubscribeFrom: "{name} жаңыртууларынан баш тартуу",
  },
  ru: {
    seeMore: "Показать ещё",
    unsubscribeFrom: "Отписаться от обновлений «{name}»",
  },
};
