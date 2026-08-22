import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface AdministratorPremiumEntitlementsTranslations {
  administrator: string;
  pageTitle: string;
  subjectTypeLabel: string;
  userLabel: string;
  organizationLabel: string;
  usernameLabel: string;
  organizationNameLabel: string;
  featureLabel: string;
  startsAtLabel: string;
  expiresAtLabel: string;
  adminNoteLabel: string;
  createButton: string;
  activeEntitlementsTitle: string;
  noEntitlements: string;
  noExpiry: string;
  revokedLabel: string;
  revokeButton: string;
  surveyFeature: string;
  eventTicketFeature: string;
  analysisVariantsFeature: string;
  dynamicTranslationFeature: string;
  conversationEmailUpdateFeature: string;
}

const en: AdministratorPremiumEntitlementsTranslations = {
  administrator: "Administrator",
  pageTitle: "Premium entitlements",
  subjectTypeLabel: "Subject type",
  userLabel: "User",
  organizationLabel: "Organization",
  usernameLabel: "Username",
  organizationNameLabel: "Organization name",
  featureLabel: "Feature",
  startsAtLabel: "Starts at",
  expiresAtLabel: "Expires at",
  adminNoteLabel: "Admin note",
  createButton: "Create entitlement",
  activeEntitlementsTitle: "Current entitlements",
  noEntitlements: "No premium entitlements yet.",
  noExpiry: "No expiry",
  revokedLabel: "Revoked",
  revokeButton: "Revoke",
  surveyFeature: "Survey",
  eventTicketFeature: "Event ticket",
  analysisVariantsFeature: "Analysis variants (2-6 groups)",
  dynamicTranslationFeature: "Dynamic Translation",
  conversationEmailUpdateFeature: "Email Updates",
};

const ar: AdministratorPremiumEntitlementsTranslations = {
  administrator: "مسؤول النظام",
  pageTitle: "استحقاقات الميزات المميزة",
  subjectTypeLabel: "نوع الجهة",
  userLabel: "مستخدم",
  organizationLabel: "منظمة",
  usernameLabel: "اسم المستخدم",
  organizationNameLabel: "اسم المنظمة",
  featureLabel: "الميزة",
  startsAtLabel: "تاريخ البدء",
  expiresAtLabel: "تاريخ الانتهاء",
  adminNoteLabel: "ملاحظة المسؤول",
  createButton: "إنشاء استحقاق",
  activeEntitlementsTitle: "الاستحقاقات الحالية",
  noEntitlements: "لا توجد استحقاقات لميزات مميزة حتى الآن.",
  noExpiry: "بلا تاريخ انتهاء",
  revokedLabel: "ملغى",
  revokeButton: "إلغاء",
  surveyFeature: "استطلاع",
  eventTicketFeature: "تذكرة فعالية",
  analysisVariantsFeature: "خيارات التحليل (2-6 مجموعات)",
  dynamicTranslationFeature: "الترجمة الديناميكية",
  conversationEmailUpdateFeature: "تحديثات البريد الإلكتروني",
};

const es: AdministratorPremiumEntitlementsTranslations = {
  administrator: "Administrador",
  pageTitle: "Derechos de acceso prémium",
  subjectTypeLabel: "Tipo de beneficiario",
  userLabel: "Usuario",
  organizationLabel: "Organización",
  usernameLabel: "Nombre de usuario",
  organizationNameLabel: "Nombre de la organización",
  featureLabel: "Función",
  startsAtLabel: "Fecha de inicio",
  expiresAtLabel: "Fecha de vencimiento",
  adminNoteLabel: "Nota del administrador",
  createButton: "Crear derecho de acceso",
  activeEntitlementsTitle: "Derechos de acceso actuales",
  noEntitlements: "Aún no hay derechos de acceso prémium.",
  noExpiry: "Sin vencimiento",
  revokedLabel: "Revocado",
  revokeButton: "Revocar",
  surveyFeature: "Encuesta",
  eventTicketFeature: "Entrada para evento",
  analysisVariantsFeature: "Variantes de análisis (2-6 grupos)",
  dynamicTranslationFeature: "Traducción dinámica",
  conversationEmailUpdateFeature: "Actualizaciones por correo electrónico",
};

const fa: AdministratorPremiumEntitlementsTranslations = {
  administrator: "مدیر",
  pageTitle: "مجوزهای دسترسی ویژه",
  subjectTypeLabel: "نوع ذی‌نفع",
  userLabel: "کاربر",
  organizationLabel: "سازمان",
  usernameLabel: "نام کاربری",
  organizationNameLabel: "نام سازمان",
  featureLabel: "قابلیت",
  startsAtLabel: "زمان شروع",
  expiresAtLabel: "زمان انقضا",
  adminNoteLabel: "یادداشت مدیر",
  createButton: "ایجاد مجوز دسترسی",
  activeEntitlementsTitle: "مجوزهای دسترسی فعلی",
  noEntitlements: "هنوز هیچ مجوز دسترسی ویژه‌ای وجود ندارد.",
  noExpiry: "بدون انقضا",
  revokedLabel: "لغوشده",
  revokeButton: "لغو",
  surveyFeature: "نظرسنجی",
  eventTicketFeature: "بلیت رویداد",
  analysisVariantsFeature: "گزینه‌های تحلیل (۲ تا ۶ گروه)",
  dynamicTranslationFeature: "ترجمه پویا",
  conversationEmailUpdateFeature: "به‌روزرسانی‌های ایمیلی",
};

const fr: AdministratorPremiumEntitlementsTranslations = {
  administrator: "Administrateur",
  pageTitle: "Droits d’accès premium",
  subjectTypeLabel: "Type de bénéficiaire",
  userLabel: "Utilisateur",
  organizationLabel: "Organisation",
  usernameLabel: "Nom d’utilisateur",
  organizationNameLabel: "Nom de l’organisation",
  featureLabel: "Fonctionnalité",
  startsAtLabel: "Date de début",
  expiresAtLabel: "Date d’expiration",
  adminNoteLabel: "Note de l’administrateur",
  createButton: "Créer un droit d’accès",
  activeEntitlementsTitle: "Droits d’accès actuels",
  noEntitlements: "Aucun droit d’accès premium pour le moment.",
  noExpiry: "Sans expiration",
  revokedLabel: "Révoqué",
  revokeButton: "Révoquer",
  surveyFeature: "Sondage",
  eventTicketFeature: "Billet d’événement",
  analysisVariantsFeature: "Variantes d’analyse (2 à 6 groupes)",
  dynamicTranslationFeature: "Traduction dynamique",
  conversationEmailUpdateFeature: "Suivi des conversations par e-mail",
};

const he: AdministratorPremiumEntitlementsTranslations = {
  administrator: "מנהל מערכת",
  pageTitle: "הרשאות פרימיום",
  subjectTypeLabel: "סוג הישות",
  userLabel: "משתמש",
  organizationLabel: "ארגון",
  usernameLabel: "שם משתמש",
  organizationNameLabel: "שם הארגון",
  featureLabel: "תכונה",
  startsAtLabel: "מועד התחלה",
  expiresAtLabel: "מועד תפוגה",
  adminNoteLabel: "הערת מנהל",
  createButton: "יצירת הרשאה",
  activeEntitlementsTitle: "הרשאות נוכחיות",
  noEntitlements: "עדיין אין הרשאות פרימיום.",
  noExpiry: "ללא תפוגה",
  revokedLabel: "בוטלה",
  revokeButton: "ביטול",
  surveyFeature: "סקר",
  eventTicketFeature: "כרטיס לאירוע",
  analysisVariantsFeature: "גרסאות ניתוח (2-6 קבוצות)",
  dynamicTranslationFeature: "תרגום דינמי",
  conversationEmailUpdateFeature: "עדכונים בדוא״ל",
};

const ja: AdministratorPremiumEntitlementsTranslations = {
  administrator: "管理者",
  pageTitle: "プレミアム権限",
  subjectTypeLabel: "対象の種類",
  userLabel: "ユーザー",
  organizationLabel: "組織",
  usernameLabel: "ユーザー名",
  organizationNameLabel: "組織名",
  featureLabel: "機能",
  startsAtLabel: "開始日時",
  expiresAtLabel: "有効期限",
  adminNoteLabel: "管理者メモ",
  createButton: "権限を作成",
  activeEntitlementsTitle: "現在の権限",
  noEntitlements: "プレミアム権限はまだありません。",
  noExpiry: "無期限",
  revokedLabel: "取り消し済み",
  revokeButton: "取り消す",
  surveyFeature: "アンケート",
  eventTicketFeature: "イベントチケット",
  analysisVariantsFeature: "分析バリエーション（2～6グループ）",
  dynamicTranslationFeature: "動的翻訳",
  conversationEmailUpdateFeature: "メール更新",
};

const ky: AdministratorPremiumEntitlementsTranslations = {
  administrator: "Администратор",
  pageTitle: "Премиум укуктар",
  subjectTypeLabel: "Субъекттин түрү",
  userLabel: "Колдонуучу",
  organizationLabel: "Уюм",
  usernameLabel: "Колдонуучунун аты",
  organizationNameLabel: "Уюмдун аталышы",
  featureLabel: "Мүмкүнчүлүк",
  startsAtLabel: "Башталуу убактысы",
  expiresAtLabel: "Аяктоо убактысы",
  adminNoteLabel: "Администратордун эскертүүсү",
  createButton: "Укук түзүү",
  activeEntitlementsTitle: "Учурдагы укуктар",
  noEntitlements: "Азырынча премиум укуктар жок.",
  noExpiry: "Мөөнөтсүз",
  revokedLabel: "Жокко чыгарылган",
  revokeButton: "Жокко чыгаруу",
  surveyFeature: "Сурамжылоо",
  eventTicketFeature: "Иш-чарага билет",
  analysisVariantsFeature: "Анализ варианттары (2-6 топ)",
  dynamicTranslationFeature: "Динамикалык котормо",
  conversationEmailUpdateFeature: "Электрондук почта жаңыртуулары",
};

const ru: AdministratorPremiumEntitlementsTranslations = {
  administrator: "Администратор",
  pageTitle: "Права на премиум-функции",
  subjectTypeLabel: "Тип субъекта",
  userLabel: "Пользователь",
  organizationLabel: "Организация",
  usernameLabel: "Имя пользователя",
  organizationNameLabel: "Название организации",
  featureLabel: "Функция",
  startsAtLabel: "Дата начала",
  expiresAtLabel: "Дата окончания",
  adminNoteLabel: "Примечание администратора",
  createButton: "Создать право",
  activeEntitlementsTitle: "Текущие права",
  noEntitlements: "Прав на премиум-функции пока нет.",
  noExpiry: "Без срока действия",
  revokedLabel: "Отозвано",
  revokeButton: "Отозвать",
  surveyFeature: "Опрос",
  eventTicketFeature: "Билет на мероприятие",
  analysisVariantsFeature: "Варианты анализа (2-6 групп)",
  dynamicTranslationFeature: "Динамический перевод",
  conversationEmailUpdateFeature: "Обновления по электронной почте",
};

const zhHans: AdministratorPremiumEntitlementsTranslations = {
  administrator: "管理员",
  pageTitle: "高级功能权限",
  subjectTypeLabel: "授权对象类型",
  userLabel: "用户",
  organizationLabel: "组织",
  usernameLabel: "用户名",
  organizationNameLabel: "组织名称",
  featureLabel: "功能",
  startsAtLabel: "开始时间",
  expiresAtLabel: "到期时间",
  adminNoteLabel: "管理员备注",
  createButton: "创建权限",
  activeEntitlementsTitle: "当前权限",
  noEntitlements: "暂无高级功能权限。",
  noExpiry: "永不过期",
  revokedLabel: "已撤销",
  revokeButton: "撤销",
  surveyFeature: "调查问卷",
  eventTicketFeature: "活动门票",
  analysisVariantsFeature: "分析方案（2-6 个群组）",
  dynamicTranslationFeature: "动态翻译",
  conversationEmailUpdateFeature: "电子邮件更新",
};

const zhHant: AdministratorPremiumEntitlementsTranslations = {
  administrator: "管理員",
  pageTitle: "進階功能權限",
  subjectTypeLabel: "授權對象類型",
  userLabel: "使用者",
  organizationLabel: "組織",
  usernameLabel: "使用者名稱",
  organizationNameLabel: "組織名稱",
  featureLabel: "功能",
  startsAtLabel: "開始時間",
  expiresAtLabel: "到期時間",
  adminNoteLabel: "管理員備註",
  createButton: "建立權限",
  activeEntitlementsTitle: "目前權限",
  noEntitlements: "目前沒有進階功能權限。",
  noExpiry: "永不過期",
  revokedLabel: "已撤銷",
  revokeButton: "撤銷",
  surveyFeature: "問卷調查",
  eventTicketFeature: "活動票券",
  analysisVariantsFeature: "分析方案（2-6 個群組）",
  dynamicTranslationFeature: "動態翻譯",
  conversationEmailUpdateFeature: "電子郵件更新",
};

export const administratorPremiumEntitlementsTranslations: Record<
  SupportedDisplayLanguageCodes,
  AdministratorPremiumEntitlementsTranslations
> = {
  en,
  ar,
  es,
  fa,
  fr,
  he,
  ja,
  ky,
  ru,
  "zh-Hans": zhHans,
  "zh-Hant": zhHant,
};
