import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface NotificationApiTranslations {
  failedToMarkNotificationsRead: string;
}

export const notificationApiTranslations: Record<
  SupportedDisplayLanguageCodes,
  NotificationApiTranslations
> = {
  en: { failedToMarkNotificationsRead: "Failed to mark user notifications as read" },
  es: { failedToMarkNotificationsRead: "No se pudieron marcar las notificaciones como leídas" },
  fr: { failedToMarkNotificationsRead: "Échec du marquage des notifications comme lues" },
  "zh-Hant": { failedToMarkNotificationsRead: "標記通知為已讀失敗" },
  "zh-Hans": { failedToMarkNotificationsRead: "标记通知为已读失败" },
  ja: { failedToMarkNotificationsRead: "通知を既読にできませんでした" },
  ar: { failedToMarkNotificationsRead: "فشل وضع علامة مقروء على إشعارات المستخدم" },
  fa: { failedToMarkNotificationsRead: "علامت‌گذاری اعلان‌ها به‌عنوان خوانده‌شده ناموفق بود" },
  he: { failedToMarkNotificationsRead: "סימון ההתראות כנקראו נכשל" },
  ky: { failedToMarkNotificationsRead: "Билдирүүлөрдү окулду деп белгилөө ишке ашкан жок" },
  ru: { failedToMarkNotificationsRead: "Не удалось отметить уведомления как прочитанные" },
};
