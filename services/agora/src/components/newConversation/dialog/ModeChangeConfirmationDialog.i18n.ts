import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ModeChangeConfirmationDialogTranslations {
  switchToImportMode: string;
  switchingWillClear: string;
  title: string;
  bodyText: string;
  settingsPreserved: string;
  cancel: string;
  continue: string;
}

export const modeChangeConfirmationDialogTranslations: Record<
  SupportedDisplayLanguageCodes,
  ModeChangeConfirmationDialogTranslations
> = {
  en: {
    switchToImportMode: "Switch to Import Mode?",
    switchingWillClear:
      "Switching to import mode will clear the following fields from the conversation draft:",
    title: "Title",
    bodyText: "Body text",
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
    settingsPreserved:
      "Tu configuración de privacidad y selección de organización se preservará.",
    cancel: "Cancelar",
    continue: "Continuar",
  },
  fa: {
    switchToImportMode: "تغییر به حالت واردات؟",
    switchingWillClear:
      "تغییر به حالت واردات فیلدهای زیر را از پیش‌نویس گفتگو پاک می‌کند:",
    title: "عنوان",
    bodyText: "متن اصلی",
    settingsPreserved:
      "تنظیمات حریم خصوصی و انتخاب سازمان شما حفظ خواهد شد.",
    cancel: "لغو",
    continue: "ادامه",
  },
  fr: {
    switchToImportMode: "Passer en Mode d'Import ?",
    switchingWillClear:
      "Passer en mode d'import effacera les champs suivants du brouillon de conversation :",
    title: "Titre",
    bodyText: "Texte du corps",
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
    settingsPreserved: "您的隐私设置和组织选择将被保留。",
    cancel: "取消",
    continue: "继续",
  },
  "zh-Hant": {
    switchToImportMode: "切換到匯入模式？",
    switchingWillClear: "切換到匯入模式將清除以下欄位：",
    title: "標題",
    bodyText: "正文",
    settingsPreserved: "您的隱私設置和組織選擇將被保留。",
    cancel: "取消",
    continue: "繼續",
  },
  he: {
    switchToImportMode: "לעבור למצב ייבוא?",
    switchingWillClear:
      "מעבר למצב ייבוא ימחק את השדות הבאים מטיוטת השיחה:",
    title: "כותרת",
    bodyText: "גוף הטקסט",
    settingsPreserved:
      "הגדרות הפרטיות ובחירת הארגון שלך יישמרו.",
    cancel: "ביטול",
    continue: "המשך",
  },
  ja: {
    switchToImportMode: "インポートモードに切り替えますか？",
    switchingWillClear:
      "インポートモードに切り替えると、以下のフィールドがクリアされます：",
    title: "タイトル",
    bodyText: "本文",
    settingsPreserved: "あなたのプライバシー設定と組織選択は保持されます。",
    cancel: "キャンセル",
    continue: "続ける",
  },
  ky: {
    switchToImportMode: "Импорт режимине которуласызбы?",
    switchingWillClear:
      "Импорт режимине которуу талкуу черновигинен төмөнкү талааларды тазалайт:",
    title: "Аталышы",
    bodyText: "Негизги текст",
    settingsPreserved: "Купуялык жөндөөлөрүңүз жана уюм тандооңуз сакталат.",
    cancel: "Жокко чыгаруу",
    continue: "Улантуу",
  },
  ru: {
    switchToImportMode: "Переключиться в режим импорта?",
    switchingWillClear:
      "Переключение в режим импорта очистит следующие поля черновика обсуждения:",
    title: "Заголовок",
    bodyText: "Основной текст",
    settingsPreserved: "Ваши настройки приватности и выбор организации будут сохранены.",
    cancel: "Отмена",
    continue: "Продолжить",
  },
};
