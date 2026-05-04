import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface TopicStoreTranslations {
  failedToFollowTopic: string;
  failedToUnfollowTopic: string;
}

export const topicStoreTranslations: Record<
  SupportedDisplayLanguageCodes,
  TopicStoreTranslations
> = {
  en: { failedToFollowTopic: "Failed to follow topic", failedToUnfollowTopic: "Failed to unfollow topic" },
  es: { failedToFollowTopic: "No se pudo seguir el tema", failedToUnfollowTopic: "No se pudo dejar de seguir el tema" },
  fr: { failedToFollowTopic: "Échec du suivi du sujet", failedToUnfollowTopic: "Échec de l’arrêt du suivi du sujet" },
  "zh-Hant": { failedToFollowTopic: "追蹤主題失敗", failedToUnfollowTopic: "取消追蹤主題失敗" },
  "zh-Hans": { failedToFollowTopic: "关注主题失败", failedToUnfollowTopic: "取消关注主题失败" },
  ja: { failedToFollowTopic: "トピックをフォローできませんでした", failedToUnfollowTopic: "トピックのフォローを解除できませんでした" },
  ar: { failedToFollowTopic: "فشل متابعة الموضوع", failedToUnfollowTopic: "فشل إلغاء متابعة الموضوع" },
  fa: { failedToFollowTopic: "دنبال کردن موضوع ناموفق بود", failedToUnfollowTopic: "لغو دنبال کردن موضوع ناموفق بود" },
  he: { failedToFollowTopic: "מעקב אחרי הנושא נכשל", failedToUnfollowTopic: "ביטול המעקב אחרי הנושא נכשל" },
  ky: { failedToFollowTopic: "Теманы ээрчүү ишке ашкан жок", failedToUnfollowTopic: "Теманы ээрчүүнү токтотуу ишке ашкан жок" },
  ru: { failedToFollowTopic: "Не удалось подписаться на тему", failedToUnfollowTopic: "Не удалось отписаться от темы" },
};
