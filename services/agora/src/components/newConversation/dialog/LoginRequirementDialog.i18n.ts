import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface LoginRequirementDialogTranslations {
  requiresLoginTitle: string;
  requiresLoginDescription: string;
  guestParticipationTitle: string;
  guestParticipationDescription: string;
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
  },
  es: {
    requiresLoginTitle: "Requiere inicio de sesión",
    requiresLoginDescription:
      "Cualquiera con el enlace puede ver la conversación, pero necesitará iniciar sesión para votar y contribuir opiniones",
    guestParticipationTitle: "Participación de invitados",
    guestParticipationDescription:
      "Cualquiera con el enlace puede ver la conversación, votar y contribuir opiniones",
  },
  fr: {
    requiresLoginTitle: "Connexion requise",
    requiresLoginDescription:
      "Toute personne ayant le lien peut voir la conversation, mais devra se connecter pour voter et contribuer des opinions",
    guestParticipationTitle: "Participation d'invités",
    guestParticipationDescription:
      "Toute personne ayant le lien peut voir la conversation, voter et contribuer des opinions",
  },
  "zh-Hans": {
    requiresLoginTitle: "需要登录",
    requiresLoginDescription:
      "任何有链接的人都可以查看对话，但需要登录才能投票和贡献意见",
    guestParticipationTitle: "访客参与",
    guestParticipationDescription:
      "任何有链接的人都可以查看对话、投票和贡献意见",
  },
  "zh-Hant": {
    requiresLoginTitle: "需要登入",
    requiresLoginDescription:
      "任何有連結的人都可以查看對話，但需要登入才能投票和貢獻意見",
    guestParticipationTitle: "訪客參與",
    guestParticipationDescription:
      "任何有連結的人都可以查看對話、投票和貢獻意見",
  },
  ja: {
    requiresLoginTitle: "ログインが必要",
    requiresLoginDescription:
      "リンクを持つ人は誰でも会話を閲覧できますが、投票や意見の投稿にはログインが必要です",
    guestParticipationTitle: "ゲスト参加",
    guestParticipationDescription:
      "リンクを持つ人は誰でも会話を閲覧、投票、意見の投稿ができます",
  },
};
