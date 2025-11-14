import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface LoginRequirementDialogTranslations {
  requiresLoginTitle: string;
  requiresLoginDescription: string;
  guestParticipationTitle: string;
  guestParticipationDescription: string;
  conversationSwitchedToPrivate: string;
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
    conversationSwitchedToPrivate:
      "Conversation switched to private. Guest participation without event ticket verification is only available for private conversations.",
  },
  ar: {
    requiresLoginTitle: "يتطلب تسجيل الدخول",
    requiresLoginDescription:
      "يمكن لأي شخص لديه الرابط عرض المحادثة، ولكن سيحتاج إلى تسجيل الدخول للتصويت وإضافة آراء",
    guestParticipationTitle: "مشاركة الضيوف",
    guestParticipationDescription:
      "يمكن لأي شخص لديه الرابط عرض المحادثة والتصويت وإضافة آراء",
    conversationSwitchedToPrivate:
      "تم تحويل المحادثة إلى خاصة. مشاركة الضيوف بدون التحقق من تذكرة الحدث متاحة فقط للمحادثات الخاصة.",
  },
  es: {
    requiresLoginTitle: "Requiere inicio de sesión",
    requiresLoginDescription:
      "Cualquiera con el enlace puede ver la conversación, pero necesitará iniciar sesión para votar y contribuir opiniones",
    guestParticipationTitle: "Participación de invitados",
    guestParticipationDescription:
      "Cualquiera con el enlace puede ver la conversación, votar y contribuir opiniones",
    conversationSwitchedToPrivate:
      "Conversación cambiada a privada. La participación de invitados sin verificación de entrada solo está disponible para conversaciones privadas.",
  },
  fr: {
    requiresLoginTitle: "Connexion requise",
    requiresLoginDescription:
      "Toute personne ayant le lien peut voir la conversation, mais devra se connecter pour voter et contribuer des opinions",
    guestParticipationTitle: "Participation d'invités",
    guestParticipationDescription:
      "Toute personne ayant le lien peut voir la conversation, voter et contribuer des opinions",
    conversationSwitchedToPrivate:
      "Conversation basculée en privé. La participation des invités sans vérification de billet est uniquement disponible pour les conversations privées.",
  },
  "zh-Hans": {
    requiresLoginTitle: "需要登录",
    requiresLoginDescription:
      "任何有链接的人都可以查看对话，但需要登录才能投票和贡献意见",
    guestParticipationTitle: "访客参与",
    guestParticipationDescription:
      "任何有链接的人都可以查看对话、投票和贡献意见",
    conversationSwitchedToPrivate:
      "对话已切换为私密。没有活动门票验证的访客参与仅适用于私密对话。",
  },
  "zh-Hant": {
    requiresLoginTitle: "需要登入",
    requiresLoginDescription:
      "任何有連結的人都可以查看對話，但需要登入才能投票和貢獻意見",
    guestParticipationTitle: "訪客參與",
    guestParticipationDescription:
      "任何有連結的人都可以查看對話、投票和貢獻意見",
    conversationSwitchedToPrivate:
      "對話已切換為私密。沒有活動門票驗證的訪客參與僅適用於私密對話。",
  },
  ja: {
    requiresLoginTitle: "ログインが必要",
    requiresLoginDescription:
      "リンクを持つ人は誰でも会話を閲覧できますが、投票や意見の投稿にはログインが必要です",
    guestParticipationTitle: "ゲスト参加",
    guestParticipationDescription:
      "リンクを持つ人は誰でも会話を閲覧、投票、意見の投稿ができます",
    conversationSwitchedToPrivate:
      "会話がプライベートに切り替わりました。イベントチケット検証なしのゲスト参加はプライベート会話でのみ利用可能です。",
  },
};
