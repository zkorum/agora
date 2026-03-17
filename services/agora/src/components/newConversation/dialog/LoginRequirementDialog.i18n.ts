import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface LoginRequirementDialogTranslations {
  requiresLoginTitle: string;
  requiresLoginDescription: string;
  requiresEmailVerificationTitle: string;
  requiresEmailVerificationDescription: string;
  guestParticipationTitle: string;
  guestParticipationDescription: string;
}

export const loginRequirementDialogTranslations: Record<
  SupportedDisplayLanguageCodes,
  LoginRequirementDialogTranslations
> = {
  en: {
    requiresLoginTitle: "Requires strong verification",
    requiresLoginDescription:
      "Anyone with the link can view the conversation, but will need phone or passport verification to vote and contribute statements",
    requiresEmailVerificationTitle: "Requires email verification",
    requiresEmailVerificationDescription:
      "Anyone with the link can view the conversation, but will need to verify their email to vote and contribute statements",
    guestParticipationTitle: "Guest participation",
    guestParticipationDescription:
      "Anyone with the link can view the conversation, vote and contribute statements",
  },
  ar: {
    requiresLoginTitle: "يتطلب تحققًا قويًا",
    requiresLoginDescription:
      "يمكن لأي شخص لديه الرابط عرض المحادثة، ولكن سيحتاج إلى التحقق عبر الهاتف أو جواز السفر للتصويت وإضافة مقترحات",
    requiresEmailVerificationTitle: "يتطلب التحقق من البريد الإلكتروني",
    requiresEmailVerificationDescription:
      "يمكن لأي شخص لديه الرابط عرض المحادثة، ولكن سيحتاج إلى التحقق من بريده الإلكتروني للتصويت وإضافة مقترحات",
    guestParticipationTitle: "مشاركة الضيوف",
    guestParticipationDescription:
      "يمكن لأي شخص لديه الرابط عرض المحادثة والتصويت وإضافة مقترحات",
  },
  es: {
    requiresLoginTitle: "Requiere verificación fuerte",
    requiresLoginDescription:
      "Cualquiera con el enlace puede ver la conversación, pero necesitará verificación por teléfono o pasaporte para votar y contribuir proposiciones",
    requiresEmailVerificationTitle: "Requiere verificación por correo electrónico",
    requiresEmailVerificationDescription:
      "Cualquiera con el enlace puede ver la conversación, pero necesitará verificar su correo electrónico para votar y contribuir proposiciones",
    guestParticipationTitle: "Participación de invitados",
    guestParticipationDescription:
      "Cualquiera con el enlace puede ver la conversación, votar y contribuir proposiciones",
  },
  fr: {
    requiresLoginTitle: "Vérification renforcée requise",
    requiresLoginDescription:
      "Toute personne ayant le lien peut voir la conversation, mais devra effectuer une vérification par téléphone ou passeport pour voter et contribuer des propositions",
    requiresEmailVerificationTitle: "Vérification par email requise",
    requiresEmailVerificationDescription:
      "Toute personne ayant le lien peut voir la conversation, mais devra vérifier son email pour voter et contribuer des propositions",
    guestParticipationTitle: "Participation d'invités",
    guestParticipationDescription:
      "Toute personne ayant le lien peut voir la conversation, voter et contribuer des propositions",
  },
  "zh-Hans": {
    requiresLoginTitle: "需要强验证",
    requiresLoginDescription:
      "任何有链接的人都可以查看对话，但需要通过手机或护照验证才能投票和贡献观点",
    requiresEmailVerificationTitle: "需要邮箱验证",
    requiresEmailVerificationDescription:
      "任何有链接的人都可以查看对话，但需要验证邮箱才能投票和贡献观点",
    guestParticipationTitle: "访客参与",
    guestParticipationDescription:
      "任何有链接的人都可以查看对话、投票和贡献观点",
  },
  "zh-Hant": {
    requiresLoginTitle: "需要強驗證",
    requiresLoginDescription:
      "任何有連結的人都可以查看對話，但需要透過手機或護照驗證才能投票和貢獻觀點",
    requiresEmailVerificationTitle: "需要電郵驗證",
    requiresEmailVerificationDescription:
      "任何有連結的人都可以查看對話，但需要驗證電郵才能投票和貢獻觀點",
    guestParticipationTitle: "訪客參與",
    guestParticipationDescription:
      "任何有連結的人都可以查看對話、投票和貢獻觀點",
  },
  ja: {
    requiresLoginTitle: "強力な認証が必要",
    requiresLoginDescription:
      "リンクを持つ人は誰でも会話を閲覧できますが、投票や主張の投稿には電話またはパスポートの認証が必要です",
    requiresEmailVerificationTitle: "メール認証が必要",
    requiresEmailVerificationDescription:
      "リンクを持つ人は誰でも会話を閲覧できますが、投票や主張の投稿にはメール認証が必要です",
    guestParticipationTitle: "ゲスト参加",
    guestParticipationDescription:
      "リンクを持つ人は誰でも会話を閲覧、投票、主張の投稿ができます",
  },
  ky: {
    requiresLoginTitle: "Күчтүү текшерүү талап кылынат",
    requiresLoginDescription:
      "Шилтемеси бар ар бир адам талкууну көрө алат, бирок добуш берүү жана пикир жазуу үчүн телефон же паспорт текшерүүсү талап кылынат",
    requiresEmailVerificationTitle: "Электрондук почта текшерүүсү талап кылынат",
    requiresEmailVerificationDescription:
      "Шилтемеси бар ар бир адам талкууну көрө алат, бирок добуш берүү жана пикир жазуу үчүн электрондук почтасын текшерүүсү керек",
    guestParticipationTitle: "Конок катышуу",
    guestParticipationDescription:
      "Шилтемеси бар ар бир адам талкууну көрө, добуш бере жана пикир жаза алат",
  },
  ru: {
    requiresLoginTitle: "Требуется усиленная проверка",
    requiresLoginDescription:
      "Любой, у кого есть ссылка, может просматривать обсуждение, но для голосования и добавления высказываний потребуется проверка по телефону или паспорту",
    requiresEmailVerificationTitle: "Требуется подтверждение электронной почты",
    requiresEmailVerificationDescription:
      "Любой, у кого есть ссылка, может просматривать обсуждение, но для голосования и добавления высказываний необходимо подтвердить электронную почту",
    guestParticipationTitle: "Гостевое участие",
    guestParticipationDescription:
      "Любой, у кого есть ссылка, может просматривать обсуждение, голосовать и добавлять высказывания",
  },
  fa: {
    requiresLoginTitle: "نیاز به ورود",
    requiresLoginDescription:
      "Anyone with the link can view the conversation, but will need to login to vote and contribute statements",
    guestParticipationTitle: "مشارکت مهمان",
    guestParticipationDescription:
      "Anyone with the link can view the conversation, vote and contribute statements",
    conversationSwitchedToPrivate:
      "Conversation switched to private. Guest participation without event ticket verification is only available for private conversations.",
  },
};
