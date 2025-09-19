import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface PreferencesDialogTestTranslations {
  preferencesDialog: string;
  preferencesDialogDescription: string;
  openPreferencesDialogButton: string;
}

export const preferencesDialogTestTranslations: Record<
  SupportedDisplayLanguageCodes,
  PreferencesDialogTestTranslations
> = {
  en: {
    preferencesDialog: "Preferences Dialog",
    preferencesDialogDescription:
      "Test the post-signup preferences dialog that allows users to select their language and topic preferences after creating an account.",
    openPreferencesDialogButton: "Open Preferences Dialog",
  },
  ar: {
    preferencesDialog: "ترجمة: Preferences Dialog",
    preferencesDialogDescription:
      "ترجمة: Test the post-signup preferences dialog that allows users to select their language and topic preferences after creating an account.",
    openPreferencesDialogButton: "ترجمة: Open Preferences Dialog",
  },
  es: {
    preferencesDialog: "Diálogo de preferencias",
    preferencesDialogDescription:
      "Pruebe el diálogo de preferencias posterior al registro que permite a los usuarios seleccionar sus preferencias de idioma y tema después de crear una cuenta.",
    openPreferencesDialogButton: "Abrir diálogo de preferencias",
  },
  fr: {
    preferencesDialog: "Dialogue des Préférences",
    preferencesDialogDescription:
      "Testez le dialogue des préférences post-inscription qui permet aux utilisateurs de sélectionner leurs préférences de langue et de sujet après avoir créé un compte.",
    openPreferencesDialogButton: "Ouvrir le Dialogue des Préférences",
  },
  "zh-Hans": {
    preferencesDialog: "偏好设置对话",
    preferencesDialogDescription:
      "测试用户在创建账户后选择语言和主题偏好的对话框。",
    openPreferencesDialogButton: "打开偏好设置对话框",
  },
  "zh-Hant": {
    preferencesDialog: "偏好設置對話框",
    preferencesDialogDescription:
      "測试用戶在創建賬戶後選擇語言和主題偏好的對話框。",
    openPreferencesDialogButton: "打開偏好設置對話框",
  },
  ja: {
    preferencesDialog: "設定ダイアログ",
    preferencesDialogDescription:
      "ユーザーがアカウントを作成した後、言語とトピックの設定を選択できるダイアログをテストします。",
    openPreferencesDialogButton: "設定ダイアログを開く",
  },
};
