import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface CreateConversationUpdatesSettingsTranslations {
  controlLabel: string;
  defaultLabel: string;
  emailUpdates: string;
  enableAriaLabel: string;
  inheritsDescription: string;
  manualUpdatesSubtitle: string;
  missingContact: string;
  noProjectDefault: string;
  noProjectGroup: string;
  off: string;
  on: string;
  override: string;
  overridesDescription: string;
  projectDefault: string;
  projectFallback: string;
  useDefault: string;
}

const en: CreateConversationUpdatesSettingsTranslations = {
  controlLabel: "Email Updates: {value} ({source})",
  defaultLabel: "default",
  emailUpdates: "Email Updates",
  enableAriaLabel: "Enable Email Updates for {conversationTitle}",
  inheritsDescription: "Uses the {defaultValue} default from {scopeLabel}.",
  manualUpdatesSubtitle:
    "Send occasional manual email updates to participants who opt in.",
  missingContact:
    "Add a monitored participant contact email before sending Email Updates.",
  noProjectDefault: "No Project default",
  noProjectGroup: "the No Project group",
  off: "Off",
  on: "On",
  override: "override",
  overridesDescription:
    "Overrides the {defaultValue} default from {scopeLabel}.",
  projectDefault: "project default",
  projectFallback: "the project",
  useDefault: "Use {source}",
};

export const createConversationUpdatesSettingsTranslations: Record<
  SupportedDisplayLanguageCodes,
  CreateConversationUpdatesSettingsTranslations
> = {
  en,
  de: {
    controlLabel: "E-Mail-Benachrichtigungen: {value} ({source})",
    defaultLabel: "Standard",
    emailUpdates: "E-Mail-Benachrichtigungen",
    enableAriaLabel:
      "E-Mail-Benachrichtigungen für {conversationTitle} aktivieren",
    inheritsDescription:
      "Verwendet den Standard von {defaultValue} aus {scopeLabel}.",
    manualUpdatesSubtitle:
      "Senden Sie gelegentliche manuelle E-Mail-Benachrichtigungen an Teilnehmende, die zugestimmt haben.",
    missingContact:
      "Geben Sie vor dem Versand eine regelmäßig gelesene Kontaktadresse für Rückfragen der Teilnehmenden an.",
    noProjectDefault: "Kein Projektdefault",
    noProjectGroup: "Die Gruppe 'Kein Projekt'",
    off: "Aus",
    on: "An",
    override: "Überschreiben",
    overridesDescription:
      "Überschreibt den {defaultValue} Standard von {scopeLabel}.",
    projectDefault: "Projektstandard",
    projectFallback: "Das Projekt",
    useDefault: "{source} verwenden",
  },
  hi: {
    controlLabel: "ईमेल अपडेट: {value} ({source})",
    defaultLabel: "डिफ़ॉल्ट",
    emailUpdates: "ईमेल अपडेट",
    enableAriaLabel: "{conversationTitle} के लिए ईमेल अपडेट सक्षम करें",
    inheritsDescription:
      "{scopeLabel} से {defaultValue} डिफ़ॉल्ट का उपयोग करता है।",
    manualUpdatesSubtitle:
      "जो प्रतिभागी विकल्प चुनते हैं, उन्हें कभी-कभी मैन्युअल ईमेल अपडेट भेजें।",
    missingContact:
      "ईमेल अपडेट भेजने से पहले प्रतिभागियों के लिए ऐसा संपर्क ईमेल पता जोड़ें जिसे नियमित रूप से देखा जाता हो।",
    noProjectDefault: "कोई परियोजना डिफ़ॉल्ट नहीं",
    noProjectGroup: "कोई परियोजना समूह नहीं",
    off: "बंद",
    on: "चालू",
    override: "अधिलेखित करें",
    overridesDescription:
      "{scopeLabel} से {defaultValue} डिफ़ॉल्ट को अधिलेखित करता है।",
    projectDefault: "परियोजना डिफ़ॉल्ट",
    projectFallback: "परियोजना",
    useDefault: "{source} का उपयोग करें",
  },
  ar: {
    controlLabel: "تحديثات البريد الإلكتروني: {value} ({source})",
    defaultLabel: "افتراضي",
    emailUpdates: "تحديثات البريد الإلكتروني",
    enableAriaLabel: "تفعيل تحديثات البريد الإلكتروني لـ {conversationTitle}",
    inheritsDescription:
      "يستخدم الإعداد الافتراضي {defaultValue} من {scopeLabel}.",
    manualUpdatesSubtitle:
      "أرسل يدويًا تحديثات بريد إلكتروني من حين لآخر إلى المشاركين المشتركين.",
    missingContact:
      "أضف بريدًا إلكترونيًا مراقبًا لجهة اتصال المشاركين قبل إرسال تحديثات البريد الإلكتروني.",
    noProjectDefault: "الإعداد الافتراضي بلا مشروع",
    noProjectGroup: "مجموعة بلا مشروع",
    off: "متوقف",
    on: "مفعّل",
    override: "تجاوز",
    overridesDescription:
      "يتجاوز الإعداد الافتراضي {defaultValue} من {scopeLabel}.",
    projectDefault: "الإعداد الافتراضي للمشروع",
    projectFallback: "المشروع",
    useDefault: "استخدام {source}",
  },
  es: {
    controlLabel: "Novedades por correo: {value} ({source})",
    defaultLabel: "predeterminado",
    emailUpdates: "Novedades por correo",
    enableAriaLabel:
      "Activar Novedades de la conversación para {conversationTitle}",
    inheritsDescription:
      "Use el valor predeterminado {defaultValue} de {scopeLabel}.",
    manualUpdatesSubtitle:
      "Envíe manualmente novedades ocasionales por correo a quienes se suscriban.",
    missingContact:
      "Añada una dirección de correo electrónico de contacto supervisada antes de enviar novedades.",
    noProjectDefault: "valor predeterminado de Sin proyecto",
    noProjectGroup: "el grupo Sin proyecto",
    off: "Desactivadas",
    on: "Activadas",
    override: "excepción",
    overridesDescription:
      "Anula el valor predeterminado {defaultValue} de {scopeLabel}.",
    projectDefault: "valor predeterminado del proyecto",
    projectFallback: "el proyecto",
    useDefault: "Usar {source}",
  },
  fa: {
    controlLabel: "به‌روزرسانی‌های ایمیلی: {value} ({source})",
    defaultLabel: "پیش‌فرض",
    emailUpdates: "به‌روزرسانی‌های ایمیلی",
    enableAriaLabel: "فعال‌کردن به‌روزرسانی ایمیلی برای {conversationTitle}",
    inheritsDescription:
      "از پیش‌فرض {defaultValue} در {scopeLabel} استفاده می‌کند.",
    manualUpdatesSubtitle:
      "گاه‌به‌گاه به‌صورت دستی برای شرکت‌کنندگان عضو، به‌روزرسانی ایمیلی بفرستید.",
    missingContact:
      "پیش از ارسال به‌روزرسانی‌های ایمیلی، یک ایمیل پاسخ‌گویی‌شده برای ارتباط با شرکت‌کنندگان اضافه کنید.",
    noProjectDefault: "پیش‌فرض بدون پروژه",
    noProjectGroup: "گروه بدون پروژه",
    off: "خاموش",
    on: "روشن",
    override: "تغییر اختصاصی",
    overridesDescription:
      "پیش‌فرض {defaultValue} در {scopeLabel} را تغییر می‌دهد.",
    projectDefault: "پیش‌فرض پروژه",
    projectFallback: "پروژه",
    useDefault: "استفاده از {source}",
  },
  fr: {
    controlLabel: "Nouvelles par e-mail : {value} ({source})",
    defaultLabel: "défaut",
    emailUpdates: "Nouvelles par e-mail",
    enableAriaLabel:
      "Activer les Nouvelles de la conversation pour {conversationTitle}",
    inheritsDescription: "Utilise le réglage {defaultValue} de {scopeLabel}.",
    manualUpdatesSubtitle:
      "Envoyez manuellement des nouvelles occasionnelles par e-mail aux participants inscrits.",
    missingContact:
      "Ajoutez une adresse e-mail de contact suivie pour les participants avant d'envoyer des nouvelles.",
    noProjectDefault: "réglage par défaut Sans projet",
    noProjectGroup: "le groupe Sans projet",
    off: "Désactivées",
    on: "Activées",
    override: "hérité",
    overridesDescription: "Remplace le réglage {defaultValue} de {scopeLabel}.",
    projectDefault: "réglage par défaut du projet",
    projectFallback: "le projet",
    useDefault: "Utiliser {source}",
  },
  he: {
    controlLabel: "עדכוני דוא״ל: {value} ({source})",
    defaultLabel: "ברירת מחדל",
    emailUpdates: "עדכוני דוא״ל",
    enableAriaLabel: "הפעלת עדכוני דוא״ל עבור {conversationTitle}",
    inheritsDescription:
      "נעשה שימוש בברירת המחדל {defaultValue} של {scopeLabel}.",
    manualUpdatesSubtitle:
      "שליחה ידנית של עדכוני דוא״ל מזדמנים למשתתפים שבחרו להצטרף.",
    missingContact:
      "יש להוסיף כתובת דוא״ל מנוטרת ליצירת קשר עם המשתתפים לפני שליחת עדכונים.",
    noProjectDefault: "ברירת המחדל ללא פרויקט",
    noProjectGroup: "הקבוצה ללא פרויקט",
    off: "כבוי",
    on: "פעיל",
    override: "שינוי",
    overridesDescription: "החלפת ברירת המחדל {defaultValue} של {scopeLabel}.",
    projectDefault: "ברירת המחדל של הפרויקט",
    projectFallback: "הפרויקט",
    useDefault: "שימוש ב{source}",
  },
  ja: {
    controlLabel: "メール更新：{value}（{source}）",
    defaultLabel: "既定",
    emailUpdates: "メール更新",
    enableAriaLabel: "{conversationTitle}のメール更新を有効にする",
    inheritsDescription: "{scopeLabel}の既定値「{defaultValue}」を使用します。",
    manualUpdatesSubtitle:
      "登録した参加者に、ときどき手動でメール更新を送信します。",
    missingContact:
      "メール更新を送信する前に、確認される参加者向け連絡先メールを追加してください。",
    noProjectDefault: "プロジェクトなしの既定値",
    noProjectGroup: "プロジェクトなしグループ",
    off: "オフ",
    on: "オン",
    override: "上書き",
    overridesDescription:
      "{scopeLabel}の既定値「{defaultValue}」を上書きします。",
    projectDefault: "プロジェクトの既定値",
    projectFallback: "プロジェクト",
    useDefault: "{source}を使用",
  },
  ky: {
    controlLabel: "Электрондук жаңыртуулар: {value} ({source})",
    defaultLabel: "демейки",
    emailUpdates: "Электрондук жаңыртуулар",
    enableAriaLabel:
      "{conversationTitle} үчүн электрондук жаңыртууларды күйгүзүү",
    inheritsDescription:
      "{scopeLabel} аймагындагы {defaultValue} демейки маанисин колдонот.",
    manualUpdatesSubtitle:
      "Катталган катышуучуларга маал-маалы менен жаңыртууларды кол менен жөнөтүңүз.",
    missingContact:
      "Электрондук жаңыртууларды жөнөтүүдөн мурун көзөмөлдөнгөн байланыш дарегин кошуңуз.",
    noProjectDefault: "Долбоорсуз демейки жөндөө",
    noProjectGroup: "Долбоорсуз топ",
    off: "Өчүк",
    on: "Күйүк",
    override: "өзгөчө жөндөө",
    overridesDescription:
      "{scopeLabel} аймагындагы {defaultValue} демейки маанисин өзгөртөт.",
    projectDefault: "долбоордун демейки жөндөөсү",
    projectFallback: "долбоор",
    useDefault: "{source} колдонуу",
  },
  ru: {
    controlLabel: "Почтовые обновления: {value} ({source})",
    defaultLabel: "по умолчанию",
    emailUpdates: "Почтовые обновления",
    enableAriaLabel: "Включить почтовые обновления для «{conversationTitle}»",
    inheritsDescription:
      "Используется значение «{defaultValue}» из области «{scopeLabel}».",
    manualUpdatesSubtitle:
      "Вручную отправляйте редкие почтовые обновления подписавшимся участникам.",
    missingContact:
      "Добавьте отслеживаемый контактный адрес для участников перед отправкой обновлений.",
    noProjectDefault: "настройка по умолчанию без проекта",
    noProjectGroup: "группа без проекта",
    off: "Выкл.",
    on: "Вкл.",
    override: "переопределение",
    overridesDescription:
      "Переопределяется значение «{defaultValue}» из области «{scopeLabel}».",
    projectDefault: "настройка проекта по умолчанию",
    projectFallback: "проект",
    useDefault: "Использовать {source}",
  },
  "zh-Hans": {
    controlLabel: "电子邮件更新：{value}（{source}）",
    defaultLabel: "默认",
    emailUpdates: "电子邮件更新",
    enableAriaLabel: "为{conversationTitle}开启电子邮件更新",
    inheritsDescription: "使用{scopeLabel}的{defaultValue}默认值。",
    manualUpdatesSubtitle: "不定期手动向选择接收更新的参与者发送电子邮件。",
    missingContact: "发送电子邮件更新前，请添加有人查收的参与者联系邮箱。",
    noProjectDefault: "无项目默认值",
    noProjectGroup: "无项目组",
    off: "关闭",
    on: "开启",
    override: "单独设置",
    overridesDescription: "覆盖{scopeLabel}的{defaultValue}默认值。",
    projectDefault: "项目默认值",
    projectFallback: "项目",
    useDefault: "使用{source}",
  },
  "zh-Hant": {
    controlLabel: "電子郵件更新：{value}（{source}）",
    defaultLabel: "預設",
    emailUpdates: "電子郵件更新",
    enableAriaLabel: "為{conversationTitle}開啟電子郵件更新",
    inheritsDescription: "使用{scopeLabel}的{defaultValue}預設值。",
    manualUpdatesSubtitle: "不定期手動向選擇接收更新的參與者傳送電子郵件。",
    missingContact: "傳送電子郵件更新前，請新增有人查收的參與者聯絡信箱。",
    noProjectDefault: "無專案預設值",
    noProjectGroup: "無專案群組",
    off: "關閉",
    on: "開啟",
    override: "個別設定",
    overridesDescription: "覆寫{scopeLabel}的{defaultValue}預設值。",
    projectDefault: "專案預設值",
    projectFallback: "專案",
    useDefault: "使用{source}",
  },
};
