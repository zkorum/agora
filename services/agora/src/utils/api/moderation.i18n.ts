import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ModerationApiTranslations {
  moderationDecisionCompleted: string;
  moderationDecisionWithdrawn: string;
  failedToSubmitModerationDecision: string;
  failedToWithdrawModerationDecision: string;
  failedToFetchPostModerationDetails: string;
  failedToFetchCommentModerationDetails: string;
}

export const moderationApiTranslations: Record<
  SupportedDisplayLanguageCodes,
  ModerationApiTranslations
> = {
  en: { moderationDecisionCompleted: "Moderation decision completed", moderationDecisionWithdrawn: "Moderation decision withdrawn", failedToSubmitModerationDecision: "Failed to submit moderation decision", failedToWithdrawModerationDecision: "Failed to withdraw moderation decision", failedToFetchPostModerationDetails: "Failed to fetch post moderation details", failedToFetchCommentModerationDetails: "Failed to fetch comment moderation details" },
  es: { moderationDecisionCompleted: "Decisión de moderación completada", moderationDecisionWithdrawn: "Decisión de moderación retirada", failedToSubmitModerationDecision: "No se pudo enviar la decisión de moderación", failedToWithdrawModerationDecision: "No se pudo retirar la decisión de moderación", failedToFetchPostModerationDetails: "No se pudieron obtener los detalles de moderación de la publicación", failedToFetchCommentModerationDetails: "No se pudieron obtener los detalles de moderación del comentario" },
  fr: { moderationDecisionCompleted: "Décision de modération terminée", moderationDecisionWithdrawn: "Décision de modération retirée", failedToSubmitModerationDecision: "Échec de l’envoi de la décision de modération", failedToWithdrawModerationDecision: "Échec du retrait de la décision de modération", failedToFetchPostModerationDetails: "Échec de la récupération des détails de modération de la publication", failedToFetchCommentModerationDetails: "Échec de la récupération des détails de modération du commentaire" },
  "zh-Hant": { moderationDecisionCompleted: "審核決定已完成", moderationDecisionWithdrawn: "審核決定已撤回", failedToSubmitModerationDecision: "提交審核決定失敗", failedToWithdrawModerationDecision: "撤回審核決定失敗", failedToFetchPostModerationDetails: "取得貼文審核詳情失敗", failedToFetchCommentModerationDetails: "取得評論審核詳情失敗" },
  "zh-Hans": { moderationDecisionCompleted: "审核决定已完成", moderationDecisionWithdrawn: "审核决定已撤回", failedToSubmitModerationDecision: "提交审核决定失败", failedToWithdrawModerationDecision: "撤回审核决定失败", failedToFetchPostModerationDetails: "获取帖子审核详情失败", failedToFetchCommentModerationDetails: "获取评论审核详情失败" },
  ja: { moderationDecisionCompleted: "モデレーション判定が完了しました", moderationDecisionWithdrawn: "モデレーション判定を取り下げました", failedToSubmitModerationDecision: "モデレーション判定の送信に失敗しました", failedToWithdrawModerationDecision: "モデレーション判定の取り下げに失敗しました", failedToFetchPostModerationDetails: "投稿のモデレーション詳細を取得できませんでした", failedToFetchCommentModerationDetails: "コメントのモデレーション詳細を取得できませんでした" },
  ar: { moderationDecisionCompleted: "اكتمل قرار الإشراف", moderationDecisionWithdrawn: "تم سحب قرار الإشراف", failedToSubmitModerationDecision: "فشل إرسال قرار الإشراف", failedToWithdrawModerationDecision: "فشل سحب قرار الإشراف", failedToFetchPostModerationDetails: "فشل جلب تفاصيل إشراف المنشور", failedToFetchCommentModerationDetails: "فشل جلب تفاصيل إشراف التعليق" },
  fa: { moderationDecisionCompleted: "تصمیم نظارت تکمیل شد", moderationDecisionWithdrawn: "تصمیم نظارت پس گرفته شد", failedToSubmitModerationDecision: "ارسال تصمیم نظارت ناموفق بود", failedToWithdrawModerationDecision: "پس گرفتن تصمیم نظارت ناموفق بود", failedToFetchPostModerationDetails: "دریافت جزئیات نظارت پست ناموفق بود", failedToFetchCommentModerationDetails: "دریافت جزئیات نظارت نظر ناموفق بود" },
  he: { moderationDecisionCompleted: "החלטת הניהול הושלמה", moderationDecisionWithdrawn: "החלטת הניהול בוטלה", failedToSubmitModerationDecision: "שליחת החלטת הניהול נכשלה", failedToWithdrawModerationDecision: "ביטול החלטת הניהול נכשל", failedToFetchPostModerationDetails: "טעינת פרטי ניהול הפוסט נכשלה", failedToFetchCommentModerationDetails: "טעינת פרטי ניהול התגובה נכשלה" },
  ky: { moderationDecisionCompleted: "Модерация чечими аяктады", moderationDecisionWithdrawn: "Модерация чечими кайтарылды", failedToSubmitModerationDecision: "Модерация чечимин жөнөтүү ишке ашкан жок", failedToWithdrawModerationDecision: "Модерация чечимин кайтаруу ишке ашкан жок", failedToFetchPostModerationDetails: "Посттун модерация чоо-жайын алуу ишке ашкан жок", failedToFetchCommentModerationDetails: "Пикирдин модерация чоо-жайын алуу ишке ашкан жок" },
  ru: { moderationDecisionCompleted: "Решение модерации выполнено", moderationDecisionWithdrawn: "Решение модерации отозвано", failedToSubmitModerationDecision: "Не удалось отправить решение модерации", failedToWithdrawModerationDecision: "Не удалось отозвать решение модерации", failedToFetchPostModerationDetails: "Не удалось получить детали модерации публикации", failedToFetchCommentModerationDetails: "Не удалось получить детали модерации комментария" },
};
