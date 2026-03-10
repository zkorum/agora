import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface NotificationSSETranslations {
  newStatement: string;
  someoneVoted: string;
  exportStarted: string;
  exportReady: string;
  exportFailed: string;
  exportCancelled: string;
  importStarted: string;
  importComplete: string;
  importFailed: string;
  newNotification: string;
}

export const notificationSSETranslations: Record<
  SupportedDisplayLanguageCodes,
  NotificationSSETranslations
> = {
  en: {
    newStatement: "New statement in your conversation",
    someoneVoted: "Someone voted on your statement",
    exportStarted: "Your conversation export has started",
    exportReady: "Your conversation export is ready",
    exportFailed: "Your conversation export failed",
    exportCancelled: "Your conversation export was cancelled",
    importStarted: "Your conversation import has started",
    importComplete: "Your conversation import is complete",
    importFailed: "Your conversation import failed",
    newNotification: "New notification",
  },
  ar: {
    newStatement: "مقترح جديد في محادثتك",
    someoneVoted: "شخص ما صوت على مقترحك",
    exportStarted: "بدأ تصدير محادثتك",
    exportReady: "تصدير محادثتك جاهز",
    exportFailed: "فشل تصدير محادثتك",
    exportCancelled: "تم إلغاء تصدير محادثتك",
    importStarted: "بدأ استيراد محادثتك",
    importComplete: "اكتمل استيراد محادثتك",
    importFailed: "فشل استيراد محادثتك",
    newNotification: "إشعار جديد",
  },
  es: {
    newStatement: "Nueva proposición en su conversación",
    someoneVoted: "Alguien votó en su proposición",
    exportStarted: "Su exportación de conversación ha comenzado",
    exportReady: "Su exportación de conversación está lista",
    exportFailed: "Su exportación de conversación falló",
    exportCancelled: "Su exportación de conversación fue cancelada",
    importStarted: "Su importación de conversación ha comenzado",
    importComplete: "Su importación de conversación está completa",
    importFailed: "Su importación de conversación falló",
    newNotification: "Nueva notificación",
  },
  fr: {
    newStatement: "Nouvelle proposition dans votre conversation",
    someoneVoted: "Quelqu'un a voté sur votre proposition",
    exportStarted: "Votre export de conversation a commencé",
    exportReady: "Votre export de conversation est prêt",
    exportFailed: "Votre export de conversation a échoué",
    exportCancelled: "Votre export de conversation a été annulé",
    importStarted: "Votre import de conversation a commencé",
    importComplete: "Votre import de conversation est terminé",
    importFailed: "Votre import de conversation a échoué",
    newNotification: "Nouvelle notification",
  },
  "zh-Hans": {
    newStatement: "您的对话中有新的观点",
    someoneVoted: "有人对您的观点投了票",
    exportStarted: "您的对话导出已开始",
    exportReady: "您的对话导出已准备就绪",
    exportFailed: "您的对话导出失败",
    exportCancelled: "您的对话导出已取消",
    importStarted: "您的对话导入已开始",
    importComplete: "您的对话导入已完成",
    importFailed: "您的对话导入失败",
    newNotification: "新通知",
  },
  "zh-Hant": {
    newStatement: "您的對話中有新的觀點",
    someoneVoted: "有人對您的觀點投了票",
    exportStarted: "您的對話匯出已開始",
    exportReady: "您的對話匯出已準備就緒",
    exportFailed: "您的對話匯出失敗",
    exportCancelled: "您的對話匯出已取消",
    importStarted: "您的對話匯入已開始",
    importComplete: "您的對話匯入已完成",
    importFailed: "您的對話匯入失敗",
    newNotification: "新通知",
  },
  ja: {
    newStatement: "会話に新しい主張が投稿されました",
    someoneVoted: "あなたの主張に投票がありました",
    exportStarted: "会話のエクスポートが開始されました",
    exportReady: "会話のエクスポートの準備ができました",
    exportFailed: "会話のエクスポートに失敗しました",
    exportCancelled: "会話のエクスポートがキャンセルされました",
    importStarted: "会話のインポートが開始されました",
    importComplete: "会話のインポートが完了しました",
    importFailed: "会話のインポートに失敗しました",
    newNotification: "新しい通知",
  },
};
