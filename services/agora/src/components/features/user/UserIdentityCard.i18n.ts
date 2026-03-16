import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface UserIdentityCardTranslations {
  guestParticipationTooltip: string;
  accountRequiredTooltip: string;
  emailVerificationTooltip: string;
  strongVerificationTooltip: string;
  edited: string;
}

export const userIdentityCardTranslations: Record<
  SupportedDisplayLanguageCodes,
  UserIdentityCardTranslations
> = {
  en: {
    guestParticipationTooltip: "Guest participation enabled",
    accountRequiredTooltip: "Account required",
    emailVerificationTooltip: "Email verification required",
    strongVerificationTooltip: "Phone or passport verification required",
    edited: "Edited",
  },
  ar: {
    guestParticipationTooltip: "مشاركة الضيوف مفعلة",
    accountRequiredTooltip: "يتطلب حسابًا",
    emailVerificationTooltip: "مطلوب التحقق من البريد الإلكتروني",
    strongVerificationTooltip: "مطلوب التحقق من الهاتف أو جواز السفر",
    edited: "معدل",
  },
  es: {
    guestParticipationTooltip: "Participación de invitados habilitada",
    accountRequiredTooltip: "Cuenta requerida",
    emailVerificationTooltip: "Verificación de correo electrónico requerida",
    strongVerificationTooltip:
      "Verificación de teléfono o pasaporte requerida",
    edited: "Editado",
  },
  fr: {
    guestParticipationTooltip: "Participation des invités activée",
    accountRequiredTooltip: "Compte requis",
    emailVerificationTooltip: "Vérification par e-mail requise",
    strongVerificationTooltip:
      "Vérification par téléphone ou passeport requise",
    edited: "Modifié",
  },
  "zh-Hans": {
    guestParticipationTooltip: "已启用访客参与",
    accountRequiredTooltip: "需要账户",
    emailVerificationTooltip: "需要电子邮件验证",
    strongVerificationTooltip: "需要手机或护照验证",
    edited: "已编辑",
  },
  "zh-Hant": {
    guestParticipationTooltip: "已啟用訪客參與",
    accountRequiredTooltip: "需要帳戶",
    emailVerificationTooltip: "需要電子郵件驗證",
    strongVerificationTooltip: "需要手機或護照驗證",
    edited: "已編輯",
  },
  ja: {
    guestParticipationTooltip: "ゲスト参加が有効",
    accountRequiredTooltip: "アカウントが必要",
    emailVerificationTooltip: "メール認証が必要",
    strongVerificationTooltip: "電話またはパスポート認証が必要",
    edited: "編集済み",
  },
  ky: {
    guestParticipationTooltip: "Конок катышуу иштетилген",
    accountRequiredTooltip: "Аккаунт талап кылынат",
    emailVerificationTooltip: "Электрондук почта текшерүүсү талап кылынат",
    strongVerificationTooltip: "Телефон же паспорт текшерүүсү талап кылынат",
    edited: "Түзөтүлгөн",
  },
  ru: {
    guestParticipationTooltip: "Гостевое участие включено",
    accountRequiredTooltip: "Требуется аккаунт",
    emailVerificationTooltip: "Требуется подтверждение электронной почты",
    strongVerificationTooltip: "Требуется подтверждение по телефону или паспорту",
    edited: "Изменено",
  },
};
