import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface OrganizationNoProjectEmailUpdatesTranslations {
  cancel: string;
  configurationUnavailable: string;
  contactDescription: string;
  contactEmailLabel: string;
  contactInUse: string;
  contactNameLabel: string;
  contactTitle: string;
  deleteConfirmation: string;
  deleteContact: string;
  entitlementRequired: string;
  missingContact: string;
  organizationNotFound: string;
  saveContact: string;
  saved: string;
  tryAgain: string;
}

const en: OrganizationNoProjectEmailUpdatesTranslations = {
  cancel: "Cancel",
  configurationUnavailable:
    "No Project Email Updates settings are unavailable right now.",
  contactDescription:
    "Used as the monitored participant contact for conversations created without a listed project.",
  contactEmailLabel: "Contact email",
  contactInUse:
    "Turn off the No Project default and all conversation overrides before deleting this contact.",
  contactNameLabel: "Contact name",
  contactTitle: "No Project participant contact",
  deleteConfirmation: "Delete the No Project participant contact?",
  deleteContact: "Delete contact",
  entitlementRequired: "This organization does not have Email Updates access.",
  missingContact: "Add a participant contact before enabling Email Updates.",
  organizationNotFound: "The organization could not be found.",
  saveContact: "Save contact",
  saved: "No Project Email Updates settings saved.",
  tryAgain: "Try again",
};

export const organizationNoProjectEmailUpdatesTranslations: Record<
  SupportedDisplayLanguageCodes,
  OrganizationNoProjectEmailUpdatesTranslations
> = {
  en,
  ar: {
    cancel: "إلغاء",
    configurationUnavailable:
      "إعدادات تحديثات البريد الإلكتروني بلا مشروع غير متاحة الآن.",
    contactDescription:
      "تُستخدم كجهة اتصال مراقبة للمشاركين في المحادثات المنشأة دون مشروع مدرج.",
    contactEmailLabel: "بريد جهة الاتصال",
    contactInUse:
      "أوقف الإعداد الافتراضي بلا مشروع وجميع تجاوزات المحادثات قبل حذف جهة الاتصال.",
    contactNameLabel: "اسم جهة الاتصال",
    contactTitle: "جهة اتصال المشاركين بلا مشروع",
    deleteConfirmation: "حذف جهة اتصال المشاركين بلا مشروع؟",
    deleteContact: "حذف جهة الاتصال",
    entitlementRequired:
      "لا تملك هذه المنظمة صلاحية تحديثات البريد الإلكتروني.",
    missingContact:
      "أضف جهة اتصال للمشاركين قبل تفعيل تحديثات البريد الإلكتروني.",
    organizationNotFound: "تعذر العثور على المنظمة.",
    saveContact: "حفظ جهة الاتصال",
    saved: "تم حفظ إعدادات تحديثات البريد الإلكتروني بلا مشروع.",
    tryAgain: "حاول مجددًا",
  },
  es: {
    cancel: "Cancelar",
    configurationUnavailable:
      "La configuración Sin proyecto no está disponible ahora.",
    contactDescription:
      "Se usa como contacto supervisado para participantes en conversaciones creadas sin un proyecto listado.",
    contactEmailLabel: "Correo de contacto",
    contactInUse:
      "Desactive el valor predeterminado Sin proyecto y todas las excepciones antes de eliminar este contacto.",
    contactNameLabel: "Nombre del contacto",
    contactTitle: "Contacto de participantes sin proyecto",
    deleteConfirmation: "¿Eliminar el contacto de participantes sin proyecto?",
    deleteContact: "Eliminar contacto",
    entitlementRequired:
      "Esta organización no tiene acceso a las novedades por correo.",
    missingContact:
      "Añada un contacto de participantes antes de activar las novedades por correo.",
    organizationNotFound: "No se encontró la organización.",
    saveContact: "Guardar contacto",
    saved: "Se guardó la configuración Sin proyecto.",
    tryAgain: "Intentar de nuevo",
  },
  fa: {
    cancel: "لغو",
    configurationUnavailable:
      "تنظیمات به‌روزرسانی ایمیلی بدون پروژه اکنون در دسترس نیست.",
    contactDescription:
      "به‌عنوان راه ارتباطی تحت نظارت برای شرکت‌کنندگان گفتگوهای بدون پروژه فهرست‌شده استفاده می‌شود.",
    contactEmailLabel: "ایمیل تماس",
    contactInUse:
      "پیش از حذف این راه ارتباطی، پیش‌فرض بدون پروژه و همه تغییرات گفتگو را خاموش کنید.",
    contactNameLabel: "نام مخاطب",
    contactTitle: "راه ارتباطی شرکت‌کنندگان بدون پروژه",
    deleteConfirmation: "راه ارتباطی شرکت‌کنندگان بدون پروژه حذف شود؟",
    deleteContact: "حذف راه ارتباطی",
    entitlementRequired: "این سازمان به به‌روزرسانی‌های ایمیلی دسترسی ندارد.",
    missingContact:
      "پیش از فعال‌کردن به‌روزرسانی‌های ایمیلی، راه ارتباطی شرکت‌کنندگان را اضافه کنید.",
    organizationNotFound: "سازمان یافت نشد.",
    saveContact: "ذخیره راه ارتباطی",
    saved: "تنظیمات بدون پروژه ذخیره شد.",
    tryAgain: "تلاش دوباره",
  },
  fr: {
    cancel: "Annuler",
    configurationUnavailable:
      "Les réglages Sans projet sont indisponibles pour le moment.",
    contactDescription:
      "Utilisé comme contact suivi des participants pour les conversations créées sans projet répertorié.",
    contactEmailLabel: "E-mail de contact",
    contactInUse:
      "Désactivez le réglage Sans projet et toutes les dérogations avant de supprimer ce contact.",
    contactNameLabel: "Nom du contact",
    contactTitle: "Contact des participants sans projet",
    deleteConfirmation: "Supprimer le contact des participants sans projet ?",
    deleteContact: "Supprimer le contact",
    entitlementRequired:
      "Cette organisation n’a pas accès aux nouvelles par e-mail.",
    missingContact:
      "Ajoutez un contact des participants avant d’activer les nouvelles par e-mail.",
    organizationNotFound: "L’organisation est introuvable.",
    saveContact: "Enregistrer le contact",
    saved: "Les réglages Sans projet ont été enregistrés.",
    tryAgain: "Réessayer",
  },
  he: {
    cancel: "ביטול",
    configurationUnavailable: "הגדרות ללא פרויקט אינן זמינות כרגע.",
    contactDescription:
      "משמש כאיש קשר מנוטר למשתתפים בשיחות שנוצרו ללא פרויקט רשום.",
    contactEmailLabel: "דוא״ל ליצירת קשר",
    contactInUse:
      "יש לכבות את ברירת המחדל ללא פרויקט ואת כל השינויים בשיחות לפני מחיקת איש הקשר.",
    contactNameLabel: "שם איש הקשר",
    contactTitle: "איש קשר למשתתפים ללא פרויקט",
    deleteConfirmation: "למחוק את איש הקשר למשתתפים ללא פרויקט?",
    deleteContact: "מחיקת איש קשר",
    entitlementRequired: "לארגון זה אין גישה לעדכוני דוא״ל.",
    missingContact: "יש להוסיף איש קשר למשתתפים לפני הפעלת עדכוני דוא״ל.",
    organizationNotFound: "הארגון לא נמצא.",
    saveContact: "שמירת איש קשר",
    saved: "הגדרות ללא פרויקט נשמרו.",
    tryAgain: "ניסיון נוסף",
  },
  ja: {
    cancel: "キャンセル",
    configurationUnavailable: "プロジェクトなしの設定は現在利用できません。",
    contactDescription:
      "一覧表示されるプロジェクトなしで作成された会話の参加者向け連絡先として使用されます。",
    contactEmailLabel: "連絡先メール",
    contactInUse:
      "この連絡先を削除する前に、プロジェクトなしの既定値とすべての会話の上書きをオフにしてください。",
    contactNameLabel: "連絡先名",
    contactTitle: "プロジェクトなしの参加者向け連絡先",
    deleteConfirmation: "参加者向け連絡先を削除しますか？",
    deleteContact: "連絡先を削除",
    entitlementRequired: "この組織はメール更新を利用できません。",
    missingContact:
      "メール更新を有効にする前に参加者向け連絡先を追加してください。",
    organizationNotFound: "組織が見つかりません。",
    saveContact: "連絡先を保存",
    saved: "プロジェクトなしの設定を保存しました。",
    tryAgain: "もう一度試す",
  },
  ky: {
    cancel: "Жокко чыгаруу",
    configurationUnavailable: "Долбоорсуз жөндөөлөр учурда жеткиликсиз.",
    contactDescription:
      "Тизмедеги долбоорсуз түзүлгөн талкуулар үчүн көзөмөлдөнгөн байланыш катары колдонулат.",
    contactEmailLabel: "Байланыш электрондук дареги",
    contactInUse:
      "Байланышты өчүрүүдөн мурун долбоорсуз демейки жөндөөнү жана бардык талкуу өзгөртүүлөрүн өчүрүңүз.",
    contactNameLabel: "Байланыш аты",
    contactTitle: "Долбоорсуз катышуучулардын байланышы",
    deleteConfirmation: "Долбоорсуз катышуучулардын байланышы өчүрүлсүнбү?",
    deleteContact: "Байланышты өчүрүү",
    entitlementRequired: "Бул уюмда электрондук жаңыртууларга мүмкүнчүлүк жок.",
    missingContact:
      "Электрондук жаңыртууларды күйгүзүүдөн мурун катышуучулардын байланышын кошуңуз.",
    organizationNotFound: "Уюм табылган жок.",
    saveContact: "Байланышты сактоо",
    saved: "Долбоорсуз жөндөөлөр сакталды.",
    tryAgain: "Кайра аракет кылуу",
  },
  ru: {
    cancel: "Отмена",
    configurationUnavailable: "Настройки без проекта сейчас недоступны.",
    contactDescription:
      "Используется как отслеживаемый контакт для участников обсуждений без указанного проекта.",
    contactEmailLabel: "Контактный адрес",
    contactInUse:
      "Отключите настройку по умолчанию и все переопределения обсуждений перед удалением контакта.",
    contactNameLabel: "Имя контакта",
    contactTitle: "Контакт для участников без проекта",
    deleteConfirmation: "Удалить контакт для участников без проекта?",
    deleteContact: "Удалить контакт",
    entitlementRequired:
      "У этой организации нет доступа к почтовым обновлениям.",
    missingContact:
      "Добавьте контакт для участников перед включением почтовых обновлений.",
    organizationNotFound: "Организация не найдена.",
    saveContact: "Сохранить контакт",
    saved: "Настройки без проекта сохранены.",
    tryAgain: "Повторить",
  },
  "zh-Hans": {
    cancel: "取消",
    configurationUnavailable: "无项目设置目前不可用。",
    contactDescription:
      "用于未归入公开项目的对话，作为有人查收的参与者联系方式。",
    contactEmailLabel: "联系邮箱",
    contactInUse: "删除联系人前，请关闭无项目默认设置和所有对话单独设置。",
    contactNameLabel: "联系人姓名",
    contactTitle: "无项目参与者联系人",
    deleteConfirmation: "删除无项目参与者联系人？",
    deleteContact: "删除联系人",
    entitlementRequired: "此组织无权使用电子邮件更新。",
    missingContact: "开启电子邮件更新前，请添加参与者联系人。",
    organizationNotFound: "找不到该组织。",
    saveContact: "保存联系人",
    saved: "已保存无项目设置。",
    tryAgain: "重试",
  },
  "zh-Hant": {
    cancel: "取消",
    configurationUnavailable: "無專案設定目前無法使用。",
    contactDescription:
      "用於未歸入公開專案的對話，作為有人查收的參與者聯絡方式。",
    contactEmailLabel: "聯絡信箱",
    contactInUse: "刪除聯絡人前，請關閉無專案預設設定和所有對話個別設定。",
    contactNameLabel: "聯絡人姓名",
    contactTitle: "無專案參與者聯絡人",
    deleteConfirmation: "刪除無專案參與者聯絡人？",
    deleteContact: "刪除聯絡人",
    entitlementRequired: "此組織無權使用電子郵件更新。",
    missingContact: "開啟電子郵件更新前，請新增參與者聯絡人。",
    organizationNotFound: "找不到該組織。",
    saveContact: "儲存聯絡人",
    saved: "已儲存無專案設定。",
    tryAgain: "再試一次",
  },
};
