import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface LoginRequirementDialogTranslations {
  requiresAccountTitle: string;
  requiresAccountDescription: string;
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
    requiresAccountTitle: "Requires account",
    requiresAccountDescription:
      "Anyone with the link can view the conversation, but will need an account to vote and contribute statements",
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
    requiresAccountTitle: "يتطلب حسابًا",
    requiresAccountDescription:
      "يمكن لأي شخص لديه الرابط عرض المحادثة، ولكن سيحتاج إلى حساب للتصويت وإضافة مقترحات",
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
    requiresAccountTitle: "Requiere cuenta",
    requiresAccountDescription:
      "Cualquiera con el enlace puede ver la conversación, pero necesitará una cuenta para votar y contribuir proposiciones",
    requiresLoginTitle: "Requiere verificación fuerte",
    requiresLoginDescription:
      "Cualquiera con el enlace puede ver la conversación, pero necesitará verificar su teléfono o pasaporte para votar y contribuir proposiciones",
    requiresEmailVerificationTitle: "Requiere verificación por correo electrónico",
    requiresEmailVerificationDescription:
      "Cualquiera con el enlace puede ver la conversación, pero necesitará verificar su correo electrónico para votar y contribuir proposiciones",
    guestParticipationTitle: "Participación de invitados",
    guestParticipationDescription:
      "Cualquiera con el enlace puede ver la conversación, votar y contribuir proposiciones",
  },
  fa: {
    requiresAccountTitle: "نیاز به حساب کاربری",
    requiresAccountDescription:
      "هر کسی که لینک را داشته باشد می‌تواند گفتگو را مشاهده کند، اما برای رأی دادن و ارائه گزاره نیاز به حساب کاربری دارد",
    requiresLoginTitle: "نیاز به تأیید هویت قوی",
    requiresLoginDescription:
      "هر کسی که لینک را داشته باشد می‌تواند گفتگو را مشاهده کند، اما برای رأی دادن و ارائه گزاره نیاز به تأیید تلفن یا گذرنامه دارد",
    requiresEmailVerificationTitle: "نیاز به تأیید ایمیل",
    requiresEmailVerificationDescription:
      "هر کسی که لینک را داشته باشد می‌تواند گفتگو را مشاهده کند، اما برای رأی دادن و ارائه گزاره نیاز به تأیید ایمیل دارد",
    guestParticipationTitle: "مشارکت مهمان",
    guestParticipationDescription:
      "هر کسی که لینک را داشته باشد می‌تواند گفتگو را مشاهده کند، رأی دهد و گزاره ارائه کند",
  },
  fr: {
    requiresAccountTitle: "Compte requis",
    requiresAccountDescription:
      "Toute personne ayant le lien peut voir la conversation, mais devra avoir un compte pour voter et contribuer des propositions",
    requiresLoginTitle: "Vérification renforcée requise",
    requiresLoginDescription:
      "Toute personne ayant le lien peut voir la conversation, mais devra vérifier son téléphone ou passeport pour voter et contribuer des propositions",
    requiresEmailVerificationTitle: "Vérification par email requise",
    requiresEmailVerificationDescription:
      "Toute personne ayant le lien peut voir la conversation, mais devra vérifier son email pour voter et contribuer des propositions",
    guestParticipationTitle: "Participation d'invités",
    guestParticipationDescription:
      "Toute personne ayant le lien peut voir la conversation, voter et contribuer des propositions",
  },
  "zh-Hans": {
    requiresAccountTitle: "需要账户",
    requiresAccountDescription:
      "任何有链接的人都可以查看对话，但需要账户才能投票和贡献观点",
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
    requiresAccountTitle: "需要帳戶",
    requiresAccountDescription:
      "任何有連結的人都可以查看對話，但需要帳戶才能投票和貢獻觀點",
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
  he: {
    requiresAccountTitle: "נדרש חשבון",
    requiresAccountDescription:
      "כל מי שיש לו את הקישור יכול לצפות בשיחה, אך יידרש חשבון כדי להצביע ולהוסיף הצהרות",
    requiresLoginTitle: "נדרש אימות חזק",
    requiresLoginDescription:
      "כל מי שיש לו את הקישור יכול לצפות בשיחה, אך יידרש אימות טלפון או דרכון כדי להצביע ולהוסיף הצהרות",
    requiresEmailVerificationTitle: "נדרש אימות דוא\"ל",
    requiresEmailVerificationDescription:
      "כל מי שיש לו את הקישור יכול לצפות בשיחה, אך יידרש אימות דוא\"ל כדי להצביע ולהוסיף הצהרות",
    guestParticipationTitle: "השתתפות אורחים",
    guestParticipationDescription:
      "כל מי שיש לו את הקישור יכול לצפות בשיחה, להצביע ולהוסיף הצהרות",
  },
  ja: {
    requiresAccountTitle: "アカウントが必要",
    requiresAccountDescription:
      "リンクを持つ人は誰でも会話を閲覧できますが、投票や意見の投稿にはアカウントが必要です",
    requiresLoginTitle: "強力な認証が必要",
    requiresLoginDescription:
      "リンクを持つ人は誰でも会話を閲覧できますが、投票や意見の投稿には電話またはパスポートの認証が必要です",
    requiresEmailVerificationTitle: "メール認証が必要",
    requiresEmailVerificationDescription:
      "リンクを持つ人は誰でも会話を閲覧できますが、投票や意見の投稿にはメール認証が必要です",
    guestParticipationTitle: "ゲスト参加",
    guestParticipationDescription:
      "リンクを持つ人は誰でも会話を閲覧、投票、意見の投稿ができます",
  },
  ky: {
    requiresAccountTitle: "Аккаунт талап кылынат",
    requiresAccountDescription:
      "Шилтемеси бар ар бир адам талкууну көрө алат, бирок добуш берүү жана пикир жазуу үчүн аккаунт керек",
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
    requiresAccountTitle: "Требуется аккаунт",
    requiresAccountDescription:
      "Любой, у кого есть ссылка, может просматривать обсуждение, но для голосования и добавления высказываний необходим аккаунт",
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
};
