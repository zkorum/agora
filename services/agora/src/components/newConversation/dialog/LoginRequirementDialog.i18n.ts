import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface LoginRequirementDialogTranslations {
  requiresLoginTitle: string;
  requiresLoginDescription: string;
  guestParticipationTitle: string;
  guestParticipationDescription: string;
  guestParticipationBlockedDescription: string;
}

export const loginRequirementDialogTranslations: Record<
  SupportedDisplayLanguageCodes,
  LoginRequirementDialogTranslations
> = {
  en: {
    requiresLoginTitle: "Requires login",
    requiresLoginDescription:
      "Anyone with the link can view the conversation, but will need to login to vote and contribute opinions",
    guestParticipationTitle: "Guest participation",
    guestParticipationDescription:
      "Anyone with the link can view the conversation, vote and contribute opinions",
    guestParticipationBlockedDescription:
      "Disabled. Public conversations require either login or event ticket verification for participation",
  },
  ar: {
    requiresLoginTitle: "يتطلب تسجيل الدخول",
    requiresLoginDescription:
      "يمكن لأي شخص لديه الرابط عرض المحادثة، ولكن سيحتاج إلى تسجيل الدخول للتصويت وإضافة آراء",
    guestParticipationTitle: "مشاركة الضيوف",
    guestParticipationDescription:
      "يمكن لأي شخص لديه الرابط عرض المحادثة والتصويت وإضافة آراء",
    guestParticipationBlockedDescription:
      "معطل. تتطلب المحادثات العامة تسجيل الدخول أو التحقق من تذكرة الحدث للمشاركة",
  },
  es: {
    requiresLoginTitle: "Requiere inicio de sesión",
    requiresLoginDescription:
      "Cualquiera con el enlace puede ver la conversación, pero necesitará iniciar sesión para votar y contribuir opiniones",
    guestParticipationTitle: "Participación de invitados",
    guestParticipationDescription:
      "Cualquiera con el enlace puede ver la conversación, votar y contribuir opiniones",
    guestParticipationBlockedDescription:
      "Deshabilitado. Las conversaciones públicas requieren inicio de sesión o verificación de entrada para participar",
  },
  fr: {
    requiresLoginTitle: "Connexion requise",
    requiresLoginDescription:
      "Toute personne ayant le lien peut voir la conversation, mais devra se connecter pour voter et contribuer des opinions",
    guestParticipationTitle: "Participation d'invités",
    guestParticipationDescription:
      "Toute personne ayant le lien peut voir la conversation, voter et contribuer des opinions",
    guestParticipationBlockedDescription:
      "Désactivé. Les conversations publiques nécessitent une connexion ou une vérification de billet pour participer",
  },
  "zh-Hans": {
    requiresLoginTitle: "需要登录",
    requiresLoginDescription:
      "任何有链接的人都可以查看对话，但需要登录才能投票和贡献意见",
    guestParticipationTitle: "访客参与",
    guestParticipationDescription:
      "任何有链接的人都可以查看对话、投票和贡献意见",
    guestParticipationBlockedDescription:
      "已禁用。公开对话需要登录或活动门票验证才能参与",
  },
  "zh-Hant": {
    requiresLoginTitle: "需要登入",
    requiresLoginDescription:
      "任何有連結的人都可以查看對話，但需要登入才能投票和貢獻意見",
    guestParticipationTitle: "訪客參與",
    guestParticipationDescription:
      "任何有連結的人都可以查看對話、投票和貢獻意見",
    guestParticipationBlockedDescription:
      "已禁用。公開對話需要登入或活動門票驗證才能參與",
  },
  ja: {
    requiresLoginTitle: "ログインが必要",
    requiresLoginDescription:
      "リンクを持つ人は誰でも会話を閲覧できますが、投票や意見の投稿にはログインが必要です",
    guestParticipationTitle: "ゲスト参加",
    guestParticipationDescription:
      "リンクを持つ人は誰でも会話を閲覧、投票、意見の投稿ができます",
    guestParticipationBlockedDescription:
      "無効。公開会話では参加にログインまたはイベントチケットの検証が必要です",
  },
};
