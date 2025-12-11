import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface NotificationTranslations {
  notifications: string;
  endOfFeed: string;
  noNotifications: string;
  contributedOpinion: string;
  onePersonVoted: string;
  peopleVoted: string;
  exportStarted: string;
  exportCompleted: string;
  exportFailed: string;
  exportCancelled: string;
  importStarted: string;
  importCompleted: string;
  importFailed: string;
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
    exportStarted: "Your conversation export has started",
    exportCompleted: "Your conversation export is ready",
    exportFailed: "Your conversation export failed",
    exportCancelled: "Your conversation export was cancelled",
    importStarted: "Your conversation import has started",
    importCompleted: "Your conversation import is complete",
    importFailed: "Your conversation import failed",
  },
  ar: {
    notifications: "الإشعارات",
    endOfFeed: "انتهاء موجز الإشعارات",
    noNotifications: "لا توجد لديك إشعارات",
    contributedOpinion: "{username} ساهم برأي في محادثتك:",
    onePersonVoted: "شخص واحد صوت على رأيك:",
    peopleVoted: "{count} أشخاص صوتوا على رأيك:",
    exportStarted: "بدأ تصدير محادثتك",
    exportCompleted: "تصدير محادثتك جاهز",
    exportFailed: "فشل تصدير محادثتك",
    exportCancelled: "تم إلغاء تصدير محادثتك",
    importStarted: "بدأ استيراد محادثتك",
    importCompleted: "اكتمل استيراد محادثتك",
    importFailed: "فشل استيراد محادثتك",
  },
  es: {
    notifications: "Notificaciones",
    endOfFeed: "Fin del feed de notificaciones",
    noNotifications: "No tiene notificaciones",
    contributedOpinion:
      "{username} contribuyó con una opinión a su conversación:",
    onePersonVoted: "1 persona votó en su opinión:",
    peopleVoted: "{count} personas votaron en su opinión:",
    exportStarted: "Su exportación de conversación ha comenzado",
    exportCompleted: "Su exportación de conversación está lista",
    exportFailed: "Su exportación de conversación falló",
    exportCancelled: "Su exportación de conversación fue cancelada",
    importStarted: "Su importación de conversación ha comenzado",
    importCompleted: "Su importación de conversación está completa",
    importFailed: "Su importación de conversación falló",
  },
  fr: {
    notifications: "Notifications",
    endOfFeed: "Fin du flux de notifications",
    noNotifications: "Vous n'avez aucune notification",
    contributedOpinion:
      "{username} a contribué une opinion à votre conversation :",
    onePersonVoted: "1 personne a voté sur votre opinion :",
    peopleVoted: "{count} personnes ont voté sur votre opinion :",
    exportStarted: "Votre exportation de conversation a commencé",
    exportCompleted: "Votre exportation de conversation est prête",
    exportFailed: "Votre exportation de conversation a échoué",
    exportCancelled: "Votre exportation de conversation a été annulée",
    importStarted: "Votre importation de conversation a commencé",
    importCompleted: "Votre importation de conversation est terminée",
    importFailed: "Votre importation de conversation a échoué",
  },
  "zh-Hans": {
    notifications: "通知",
    endOfFeed: "通知列表结束",
    noNotifications: "您没有通知",
    contributedOpinion: "{username} 为您的对话贡献了意见：",
    onePersonVoted: "1 人为您的意见投票：",
    peopleVoted: "{count} 人为您的意见投票：",
    exportStarted: "您的对话导出已开始",
    exportCompleted: "您的对话导出已准备就绪",
    exportFailed: "您的对话导出失败",
    exportCancelled: "您的对话导出已取消",
    importStarted: "您的对话导入已开始",
    importCompleted: "您的对话导入已完成",
    importFailed: "您的对话导入失败",
  },
  "zh-Hant": {
    notifications: "通知",
    endOfFeed: "通知列表結束",
    noNotifications: "您沒有通知",
    contributedOpinion: "{username} 為您的對話貢獻了意見：",
    onePersonVoted: "1 人為您的意見投票：",
    peopleVoted: "{count} 人為您的意見投票：",
    exportStarted: "您的對話匯出已開始",
    exportCompleted: "您的對話匯出已準備就緒",
    exportFailed: "您的對話匯出失敗",
    exportCancelled: "您的對話匯出已取消",
    importStarted: "您的對話匯入已開始",
    importCompleted: "您的對話匯入已完成",
    importFailed: "您的對話匯入失敗",
  },
  ja: {
    notifications: "通知",
    endOfFeed: "通知フィードの終了",
    noNotifications: "通知はありません",
    contributedOpinion: "{username} があなたの会話に意見を投稿しました：",
    onePersonVoted: "1人があなたの意見に投票しました：",
    peopleVoted: "{count} 人があなたの意見に投票しました：",
    exportStarted: "会話のエクスポートが開始されました",
    exportCompleted: "会話のエクスポートの準備ができました",
    exportFailed: "会話のエクスポートに失敗しました",
    exportCancelled: "会話のエクスポートがキャンセルされました",
    importStarted: "会話のインポートが開始されました",
    importCompleted: "会話のインポートが完了しました",
    importFailed: "会話のインポートに失敗しました",
  },
};
