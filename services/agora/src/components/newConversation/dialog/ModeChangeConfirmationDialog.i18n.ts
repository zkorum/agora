export interface ModeChangeConfirmationDialogTranslations {
  switchToImportMode: string;
  switchingWillClear: string;
  title: string;
  bodyText: string;
  pollOptions: string;
  settingsPreserved: string;
  cancel: string;
  continue: string;
  [key: string]: string;
}

export const modeChangeConfirmationDialogTranslations: Record<
  string,
  ModeChangeConfirmationDialogTranslations
> = {
  en: {
    switchToImportMode: "Switch to Import Mode?",
    switchingWillClear:
      "Switching to import mode will clear the following fields from the conversation draft:",
    title: "Title",
    bodyText: "Body text",
    pollOptions: "Poll options",
    settingsPreserved:
      "Your privacy settings and organization selection will be preserved.",
    cancel: "Cancel",
    continue: "Continue",
  },
  ar: {
    switchToImportMode: "التبديل إلى وضع الاستيراد؟",
    switchingWillClear:
      "التبديل إلى وضع الاستيراد سيمحو الحقول التالية من مسودة المحادثة:",
    title: "العنوان",
    bodyText: "نص المحتوى",
    pollOptions: "خيارات الاستطلاع",
    settingsPreserved: "سيتم الاحتفاظ بإعدادات الخصوصية واختيار المنظمة.",
    cancel: "إلغاء",
    continue: "متابعة",
  },
  es: {
    switchToImportMode: "¿Cambiar al Modo de Importación?",
    switchingWillClear:
      "Cambiar al modo de importación borrará los siguientes campos del borrador de conversación:",
    title: "Título",
    bodyText: "Texto del cuerpo",
    pollOptions: "Opciones de encuesta",
    settingsPreserved:
      "Tu configuración de privacidad y selección de organización se preservará.",
    cancel: "Cancelar",
    continue: "Continuar",
  },
  fr: {
    switchToImportMode: "Passer en Mode d'Importation ?",
    switchingWillClear:
      "Passer en mode d'importation effacera les champs suivants du brouillon de conversation :",
    title: "Titre",
    bodyText: "Texte du corps",
    pollOptions: "Options de sondage",
    settingsPreserved:
      "Vos paramètres de confidentialité et sélection d'organisation seront préservés.",
    cancel: "Annuler",
    continue: "Continuer",
  },
  "zh-Hans": {
    switchToImportMode: "切换到导入模式？",
    switchingWillClear: "切换到导入模式将清除以下字段：",
    title: "标题",
    bodyText: "正文",
    pollOptions: "投票选项",
    settingsPreserved: "您的隐私设置和组织选择将被保留。",
    cancel: "取消",
    continue: "继续",
  },
  "zh-Hant": {
    switchToImportMode: "切換到導入模式？",
    switchingWillClear: "切換到導入模式將清除以下字段：",
    title: "標題",
    bodyText: "正文",
    pollOptions: "投票選項",
    settingsPreserved: "您的隱私設置和組織選擇將被保留。",
    cancel: "取消",
    continue: "繼續",
  },
  ja: {
    switchToImportMode: "インポートモードに切り替えますか？",
    switchingWillClear:
      "インポートモードに切り替えると、以下のフィールドがクリアされます：",
    title: "タイトル",
    bodyText: "本文",
    pollOptions: "投票オプション",
    settingsPreserved: "あなたのプライバシー設定と組織選択は保持されます。",
    cancel: "キャンセル",
    continue: "続ける",
  },
};
