import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface VisibilityOptionsDialogTranslations {
  publicTitle: string;
  publicDescription: string;
  privateTitle: string;
  privateDescription: string;
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
  },
  es: {
    publicTitle: "Público",
    publicDescription:
      "Esta conversación será visible para todos los usuarios en el feed principal de Ágora",
    privateTitle: "Privado",
    privateDescription:
      "Solo visible para aquellos con quienes compartas un enlace o código QR",
  },
  fr: {
    publicTitle: "Public",
    publicDescription:
      "Cette conversation sera visible par tous les utilisateurs dans le flux principal d'Agora",
    privateTitle: "Privé",
    privateDescription:
      "Visible uniquement par ceux avec qui vous partagez un lien ou un code QR",
  },
  "zh-CN": {
    publicTitle: "公开",
    publicDescription: "此对话将在主 Agora  feed 中对所有用户可见",
    privateTitle: "私密",
    privateDescription: "仅对分享链接或二维码的人可见",
  },
  "zh-TW": {
    publicTitle: "公開",
    publicDescription: "此對話將在主 Agora feed 中對所有用戶可見",
    privateTitle: "私密",
    privateDescription: "僅對分享鏈接或二維碼的人可見",
  },
  ja: {
    publicTitle: "公開",
    publicDescription: "この会話は主 Agora feed ですべてのユーザーに表示されます",
    privateTitle: "プライベート",
    privateDescription: "リンクまたはQRコードを共有した人のみが見れます",
  },
};
