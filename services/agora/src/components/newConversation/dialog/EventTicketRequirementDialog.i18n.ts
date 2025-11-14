import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface EventTicketRequirementDialogTranslations {
  noVerificationTitle: string;
  noVerificationDescription: string;
  requiresEventTicketTitle: string;
  requiresEventTicketDescription: string;
  guestParticipationDisabledNotification: string;
}

export const eventTicketRequirementDialogTranslations: Record<
  SupportedDisplayLanguageCodes,
  EventTicketRequirementDialogTranslations
> = {
  en: {
    noVerificationTitle: "No verification",
    noVerificationDescription:
      "Anyone can participate without event ticket verification",
    requiresEventTicketTitle: "Requires event ticket",
    requiresEventTicketDescription:
      "Only verified event ticket holders can vote and contribute opinions",
    guestParticipationDisabledNotification:
      "Guest participation disabled for public conversations without event ticket verification. Login is now required.",
  },
  ar: {
    noVerificationTitle: "بدون تحقق",
    noVerificationDescription:
      "يمكن لأي شخص المشاركة بدون التحقق من تذكرة الحدث",
    requiresEventTicketTitle: "يتطلب تذكرة الحدث",
    requiresEventTicketDescription:
      "يمكن فقط لحاملي تذاكر الحدث المتحقق منهم التصويت وإضافة آراء",
    guestParticipationDisabledNotification:
      "تم تعطيل مشاركة الضيوف للمحادثات العامة بدون التحقق من تذكرة الحدث. تسجيل الدخول مطلوب الآن.",
  },
  es: {
    noVerificationTitle: "Sin verificación",
    noVerificationDescription:
      "Cualquiera puede participar sin verificación de boleto de evento",
    requiresEventTicketTitle: "Requiere boleto de evento",
    requiresEventTicketDescription:
      "Solo los titulares de boletos de eventos verificados pueden votar y contribuir opiniones",
    guestParticipationDisabledNotification:
      "Participación de invitados deshabilitada para conversaciones públicas sin verificación de entrada. Ahora se requiere inicio de sesión.",
  },
  fr: {
    noVerificationTitle: "Pas de vérification",
    noVerificationDescription:
      "Tout le monde peut participer sans vérification de billet d'événement",
    requiresEventTicketTitle: "Billet d'événement requis",
    requiresEventTicketDescription:
      "Seuls les détenteurs de billets d'événement vérifiés peuvent voter et contribuer des opinions",
    guestParticipationDisabledNotification:
      "Participation des invités désactivée pour les conversations publiques sans vérification de billet. Connexion requise maintenant.",
  },
  "zh-Hans": {
    noVerificationTitle: "无需验证",
    noVerificationDescription: "任何人都可以参与，无需活动门票验证",
    requiresEventTicketTitle: "需要活动门票",
    requiresEventTicketDescription:
      "只有经过验证的活动门票持有者才能投票和贡献意见",
    guestParticipationDisabledNotification:
      "公开对话在没有活动门票验证的情况下已禁用访客参与。现在需要登录。",
  },
  "zh-Hant": {
    noVerificationTitle: "無需驗證",
    noVerificationDescription: "任何人都可以參與，無需活動門票驗證",
    requiresEventTicketTitle: "需要活動門票",
    requiresEventTicketDescription:
      "只有經過驗證的活動門票持有者才能投票和貢獻意見",
    guestParticipationDisabledNotification:
      "公開對話在沒有活動門票驗證的情況下已禁用訪客參與。現在需要登入。",
  },
  ja: {
    noVerificationTitle: "検証不要",
    noVerificationDescription:
      "イベントチケットの検証なしで誰でも参加できます",
    requiresEventTicketTitle: "イベントチケットが必要",
    requiresEventTicketDescription:
      "検証済みのイベントチケット保有者のみが投票と意見の投稿ができます",
    guestParticipationDisabledNotification:
      "イベントチケット検証なしの公開会話でゲスト参加が無効になりました。ログインが必要になります。",
  },
};
