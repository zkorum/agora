import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface PreLoginIntentionDialogTranslations {
  title: string;
  message: string;
  labelOk: string;
  labelCancel: string;
}

export const preLoginIntentionDialogTranslations: Record<
  SupportedDisplayLanguageCodes,
  PreLoginIntentionDialogTranslations
> = {
  en: {
    title: "Log in to Agora",
    message: "Log in to participate in the discussions",
    labelOk: "Log In",
    labelCancel: "Cancel",
  },
  es: {
    title: "Iniciar sesión en Ágora",
    message: "Inicia sesión para participar en las discusiones",
    labelOk: "Iniciar Sesión",
    labelCancel: "Cancelar",
  },
  fr: {
    title: "Se connecter à Agora",
    message: "Connectez-vous pour participer aux discussions",
    labelOk: "Se Connecter",
    labelCancel: "Annuler",
  },
  "zh-CN": {
    title: "登录 Agora",
    message: "登录以参与讨论",
    labelOk: "登录",
    labelCancel: "取消",
  },
  "zh-TW": {
    title: "登入 Agora",
    message: "登入以參與討論",
    labelOk: "登入",
    labelCancel: "取消",
  },
  ja: {
    title: "Agora にログイン",
    message: "ログインして議論に参加",
    labelOk: "ログイン",
    labelCancel: "キャンセル",
  },
};
