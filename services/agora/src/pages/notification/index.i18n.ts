import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface NotificationTranslations {
  notifications: string;
  endOfFeed: string;
  noNotifications: string;
  contributedOpinion: string;
  onePersonVoted: string;
  peopleVoted: string;
  exportCompleted: string;
  exportFailed: string;
  exportCancelled: string;
}

export const notificationTranslations: Record<
  SupportedDisplayLanguageCodes,
  NotificationTranslations
> = {
  en: {
    notifications: "Notifications",
    endOfFeed: "End of notification feed",
    noNotifications: "You have no notifications",
    contributedOpinion:
      "{username} contributed an opinion to your conversation:",
    onePersonVoted: "1 person voted on your opinion:",
    peopleVoted: "{count} people voted on your opinion:",
    exportCompleted: "Your conversation export is ready",
    exportFailed: "Your conversation export failed",
    exportCancelled: "Your conversation export was cancelled",
  },
  ar: {
    notifications: "الإشعارات",
    endOfFeed: "انتهاء موجز الإشعارات",
    noNotifications: "لا توجد لديك إشعارات",
    contributedOpinion: "{username} ساهم برأي في محادثتك:",
    onePersonVoted: "شخص واحد صوت على رأيك:",
    peopleVoted: "{count} أشخاص صوتوا على رأيك:",
    exportCompleted: "تصدير محادثتك جاهز",
    exportFailed: "فشل تصدير محادثتك",
    exportCancelled: "تم إلغاء تصدير محادثتك",
  },
  es: {
    notifications: "Notificaciones",
    endOfFeed: "Fin del feed de notificaciones",
    noNotifications: "No tiene notificaciones",
    contributedOpinion:
      "{username} contribuyó con una opinión a su conversación:",
    onePersonVoted: "1 persona votó en su opinión:",
    peopleVoted: "{count} personas votaron en su opinión:",
    exportCompleted: "Su exportación de conversación está lista",
    exportFailed: "Su exportación de conversación falló",
    exportCancelled: "Su exportación de conversación fue cancelada",
  },
  fr: {
    notifications: "Notifications",
    endOfFeed: "Fin du flux de notifications",
    noNotifications: "Vous n'avez aucune notification",
    contributedOpinion:
      "{username} a contribué une opinion à votre conversation :",
    onePersonVoted: "1 personne a voté sur votre opinion :",
    peopleVoted: "{count} personnes ont voté sur votre opinion :",
    exportCompleted: "Votre exportation de conversation est prête",
    exportFailed: "Votre exportation de conversation a échoué",
    exportCancelled: "Votre exportation de conversation a été annulée",
  },
  "zh-Hans": {
    notifications: "通知",
    endOfFeed: "通知列表结束",
    noNotifications: "您没有通知",
    contributedOpinion: "{username} 为您的对话贡献了意见：",
    onePersonVoted: "1 人为您的意见投票：",
    peopleVoted: "{count} 人为您的意见投票：",
    exportCompleted: "您的对话导出已准备就绪",
    exportFailed: "您的对话导出失败",
    exportCancelled: "您的对话导出已取消",
  },
  "zh-Hant": {
    notifications: "通知",
    endOfFeed: "通知列表結束",
    noNotifications: "您沒有通知",
    contributedOpinion: "{username} 為您的對話貢獻了意見：",
    onePersonVoted: "1 人為您的意見投票：",
    peopleVoted: "{count} 人為您的意見投票：",
    exportCompleted: "您的對話匯出已準備就緒",
    exportFailed: "您的對話匯出失敗",
    exportCancelled: "您的對話匯出已取消",
  },
  ja: {
    notifications: "通知",
    endOfFeed: "通知フィードの終了",
    noNotifications: "通知はありません",
    contributedOpinion: "{username} があなたの会話に意見を投稿しました：",
    onePersonVoted: "1人があなたの意見に投票しました：",
    peopleVoted: "{count} 人があなたの意見に投票しました：",
    exportCompleted: "会話のエクスポートの準備ができました",
    exportFailed: "会話のエクスポートに失敗しました",
    exportCancelled: "会話のエクスポートがキャンセルされました",
  },
};
