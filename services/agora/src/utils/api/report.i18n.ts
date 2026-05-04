import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ReportApiTranslations {
  submittedReport: string;
  failedToSubmitPostReport: string;
  failedToSubmitCommentReport: string;
  failedToFetchPostReports: string;
}

export const reportApiTranslations: Record<
  SupportedDisplayLanguageCodes,
  ReportApiTranslations
> = {
  en: { submittedReport: "Submitted report", failedToSubmitPostReport: "Failed to submit user report for post", failedToSubmitCommentReport: "Failed to submit user report for comment", failedToFetchPostReports: "Failed to fetch post reports" },
  es: { submittedReport: "Reporte enviado", failedToSubmitPostReport: "No se pudo enviar el reporte de la publicación", failedToSubmitCommentReport: "No se pudo enviar el reporte del comentario", failedToFetchPostReports: "No se pudieron obtener los reportes de la publicación" },
  fr: { submittedReport: "Signalement envoyé", failedToSubmitPostReport: "Échec de l’envoi du signalement de la publication", failedToSubmitCommentReport: "Échec de l’envoi du signalement du commentaire", failedToFetchPostReports: "Échec de la récupération des signalements de la publication" },
  "zh-Hant": { submittedReport: "檢舉已提交", failedToSubmitPostReport: "提交貼文檢舉失敗", failedToSubmitCommentReport: "提交評論檢舉失敗", failedToFetchPostReports: "取得貼文檢舉失敗" },
  "zh-Hans": { submittedReport: "举报已提交", failedToSubmitPostReport: "提交帖子举报失败", failedToSubmitCommentReport: "提交评论举报失败", failedToFetchPostReports: "获取帖子举报失败" },
  ja: { submittedReport: "報告を送信しました", failedToSubmitPostReport: "投稿の報告を送信できませんでした", failedToSubmitCommentReport: "コメントの報告を送信できませんでした", failedToFetchPostReports: "投稿の報告を取得できませんでした" },
  ar: { submittedReport: "تم إرسال البلاغ", failedToSubmitPostReport: "فشل إرسال بلاغ المستخدم عن المنشور", failedToSubmitCommentReport: "فشل إرسال بلاغ المستخدم عن التعليق", failedToFetchPostReports: "فشل جلب بلاغات المنشور" },
  fa: { submittedReport: "گزارش ارسال شد", failedToSubmitPostReport: "ارسال گزارش کاربر برای پست ناموفق بود", failedToSubmitCommentReport: "ارسال گزارش کاربر برای نظر ناموفق بود", failedToFetchPostReports: "دریافت گزارش‌های پست ناموفق بود" },
  he: { submittedReport: "הדיווח נשלח", failedToSubmitPostReport: "שליחת דיווח המשתמש על הפוסט נכשלה", failedToSubmitCommentReport: "שליחת דיווח המשתמש על התגובה נכשלה", failedToFetchPostReports: "טעינת דיווחי הפוסט נכשלה" },
  ky: { submittedReport: "Арыз жөнөтүлдү", failedToSubmitPostReport: "Пост боюнча арыз жөнөтүү ишке ашкан жок", failedToSubmitCommentReport: "Пикир боюнча арыз жөнөтүү ишке ашкан жок", failedToFetchPostReports: "Пост арыздарын алуу ишке ашкан жок" },
  ru: { submittedReport: "Жалоба отправлена", failedToSubmitPostReport: "Не удалось отправить жалобу на публикацию", failedToSubmitCommentReport: "Не удалось отправить жалобу на комментарий", failedToFetchPostReports: "Не удалось получить жалобы на публикацию" },
};
