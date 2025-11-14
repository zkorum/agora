import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface VisibilityOptionsDialogTranslations {
  publicTitle: string;
  publicDescription: string;
  privateTitle: string;
  privateDescription: string;
  guestParticipationDisabledForPublic: string;
}

export const visibilityOptionsDialogTranslations: Record<
  SupportedDisplayLanguageCodes,
  VisibilityOptionsDialogTranslations
> = {
  en: {
    publicTitle: "Public",
    publicDescription:
      "This conversation will be visible to all users in the main Agora feed",
    privateTitle: "Private",
    privateDescription:
      "Only visible to those with whom you share a link or QR code",
    guestParticipationDisabledForPublic:
      "Guest participation disabled for public conversations without event ticket verification. Login is now required.",
  },
  ar: {
    publicTitle: "عام",
    publicDescription:
      "ستكون هذه المحادثة مرئية لجميع المستخدمين في موجز أغورا الرئيسي",
    privateTitle: "خاص",
    privateDescription: "مرئية فقط لأولئك الذين تشاركهم رابطاً أو رمز QR",
    guestParticipationDisabledForPublic:
      "تم تعطيل مشاركة الضيوف للمحادثات العامة بدون التحقق من تذكرة الحدث. تسجيل الدخول مطلوب الآن.",
  },
  es: {
    publicTitle: "Público",
    publicDescription:
      "Esta conversación será visible para todos los usuarios en el feed principal de Ágora",
    privateTitle: "Privado",
    privateDescription:
      "Solo visible para aquellos con quienes compartas un enlace o código QR",
    guestParticipationDisabledForPublic:
      "Participación de invitados deshabilitada para conversaciones públicas sin verificación de entrada. Ahora se requiere inicio de sesión.",
  },
  fr: {
    publicTitle: "Public",
    publicDescription:
      "Cette conversation sera visible par tous les utilisateurs dans le flux principal d'Agora",
    privateTitle: "Privé",
    privateDescription:
      "Visible uniquement par ceux avec qui vous partagez un lien ou un code QR",
    guestParticipationDisabledForPublic:
      "Participation des invités désactivée pour les conversations publiques sans vérification de billet. Connexion requise maintenant.",
  },
  "zh-Hans": {
    publicTitle: "公开",
    publicDescription: "此对话将在主 Agora  feed 中对所有用户可见",
    privateTitle: "私密",
    privateDescription: "仅对分享链接或二维码的人可见",
    guestParticipationDisabledForPublic:
      "公开对话在没有活动门票验证的情况下已禁用访客参与。现在需要登录。",
  },
  "zh-Hant": {
    publicTitle: "公開",
    publicDescription: "此對話將在主 Agora feed 中對所有用戶可見",
    privateTitle: "私密",
    privateDescription: "僅對分享鏈接或二維碼的人可見",
    guestParticipationDisabledForPublic:
      "公開對話在沒有活動門票驗證的情況下已禁用訪客參與。現在需要登入。",
  },
  ja: {
    publicTitle: "公開",
    publicDescription:
      "この会話は主 Agora feed ですべてのユーザーに表示されます",
    privateTitle: "プライベート",
    privateDescription: "リンクまたはQRコードを共有した人のみが見れます",
    guestParticipationDisabledForPublic:
      "イベントチケット検証なしの公開会話でゲスト参加が無効になりました。ログインが必要になります。",
  },
};
