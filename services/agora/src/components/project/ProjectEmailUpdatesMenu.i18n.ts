import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ProjectEmailUpdatesMenuTranslations {
  projectActions: string;
  receiveUpdates: string;
  manageUpdates: string;
  viewHistory: string;
  saveEnabled: string;
  saveDisabled: string;
  saveError: string;
}

export const projectEmailUpdatesMenuTranslations: Record<
  SupportedDisplayLanguageCodes,
  ProjectEmailUpdatesMenuTranslations
> = {
  en: {
    projectActions: "Project actions",
    receiveUpdates: "Email updates by default for this project",
    manageUpdates: "Manage email updates for this project",
    viewHistory: "View email update history for this project",
    saveEnabled: "The project email update default is on.",
    saveDisabled: "The project email update default is off.",
    saveError: "Couldn’t save your email update preference.",
  },
  ar: {
    projectActions: "إجراءات المشروع",
    receiveUpdates: "تحديثات البريد الإلكتروني افتراضيًا لهذا المشروع",
    manageUpdates: "إدارة تحديثات البريد الإلكتروني لهذا المشروع",
    viewHistory: "عرض سجل تحديثات البريد الإلكتروني لهذا المشروع",
    saveEnabled: "تم تفعيل الإعداد الافتراضي لتحديثات المشروع.",
    saveDisabled: "تم إيقاف الإعداد الافتراضي لتحديثات المشروع.",
    saveError: "تعذر حفظ تفضيل تحديثات البريد الإلكتروني.",
  },
  es: {
    projectActions: "Acciones del proyecto",
    receiveUpdates: "Novedades por correo por defecto para este proyecto",
    manageUpdates: "Gestionar el seguimiento del proyecto por correo",
    viewHistory: "Ver el historial de novedades del proyecto",
    saveEnabled: "El valor predeterminado del proyecto está activado.",
    saveDisabled: "El valor predeterminado del proyecto está desactivado.",
    saveError: "No se pudo guardar su preferencia de seguimiento por correo.",
  },
  fa: {
    projectActions: "اقدامات پروژه",
    receiveUpdates: "به‌روزرسانی‌های ایمیلی پیش‌فرض این پروژه",
    manageUpdates: "مدیریت به‌روزرسانی‌های ایمیلی این پروژه",
    viewHistory: "مشاهده تاریخچه به‌روزرسانی‌های ایمیلی این پروژه",
    saveEnabled: "پیش‌فرض به‌روزرسانی ایمیلی پروژه روشن شد.",
    saveDisabled: "پیش‌فرض به‌روزرسانی ایمیلی پروژه خاموش شد.",
    saveError: "ذخیره ترجیح به‌روزرسانی ایمیلی ممکن نشد.",
  },
  fr: {
    projectActions: "Actions du projet",
    receiveUpdates: "Nouvelles par e-mail par défaut pour ce projet",
    manageUpdates: "Gérer le suivi du projet par e-mail",
    viewHistory: "Voir l’historique des nouvelles du projet",
    saveEnabled: "Le réglage par défaut du projet est activé.",
    saveDisabled: "Le réglage par défaut du projet est désactivé.",
    saveError: "Impossible d’enregistrer votre préférence de suivi par e-mail.",
  },
  "zh-Hans": {
    projectActions: "项目操作",
    receiveUpdates: "此项目的默认电子邮件更新",
    manageUpdates: "管理此项目的电子邮件更新",
    viewHistory: "查看此项目的电子邮件更新历史",
    saveEnabled: "项目的默认电子邮件更新已开启。",
    saveDisabled: "项目的默认电子邮件更新已关闭。",
    saveError: "无法保存您的电子邮件更新偏好。",
  },
  "zh-Hant": {
    projectActions: "專案操作",
    receiveUpdates: "此專案的預設電子郵件更新",
    manageUpdates: "管理此專案的電子郵件更新",
    viewHistory: "查看此專案的電子郵件更新歷史",
    saveEnabled: "專案的預設電子郵件更新已開啟。",
    saveDisabled: "專案的預設電子郵件更新已關閉。",
    saveError: "無法儲存您的電子郵件更新偏好。",
  },
  he: {
    projectActions: "פעולות פרויקט",
    receiveUpdates: "עדכונים בדוא״ל כברירת מחדל לפרויקט הזה",
    manageUpdates: "ניהול עדכונים בדוא״ל לפרויקט הזה",
    viewHistory: "הצגת היסטוריית העדכונים בדוא״ל של הפרויקט הזה",
    saveEnabled: "ברירת המחדל של עדכוני הפרויקט מופעלת.",
    saveDisabled: "ברירת המחדל של עדכוני הפרויקט כבויה.",
    saveError: "לא ניתן לשמור את העדפת העדכונים בדוא״ל.",
  },
  ja: {
    projectActions: "プロジェクト操作",
    receiveUpdates: "このプロジェクトのメール更新の既定値",
    manageUpdates: "このプロジェクトのメール更新を管理する",
    viewHistory: "このプロジェクトのメール更新履歴を表示する",
    saveEnabled: "プロジェクトのメール更新の既定値をオンにしました。",
    saveDisabled: "プロジェクトのメール更新の既定値をオフにしました。",
    saveError: "メール更新の設定を保存できませんでした。",
  },
  ky: {
    projectActions: "Долбоор аракеттери",
    receiveUpdates: "Бул долбоордун демейки электрондук жаңыртуулары",
    manageUpdates: "Бул долбоордун электрондук каттарын башкаруу",
    viewHistory: "Бул долбоордун электрондук кат тарыхын көрүү",
    saveEnabled: "Долбоордун демейки электрондук жаңыртуулары күйгүзүлдү.",
    saveDisabled: "Долбоордун демейки электрондук жаңыртуулары өчүрүлдү.",
    saveError: "Электрондук кат тандооңуз сакталган жок.",
  },
  ru: {
    projectActions: "Действия проекта",
    receiveUpdates: "Почтовые обновления по умолчанию для этого проекта",
    manageUpdates: "Управлять почтовыми обновлениями этого проекта",
    viewHistory: "Посмотреть историю почтовых обновлений этого проекта",
    saveEnabled: "Настройка проекта по умолчанию включена.",
    saveDisabled: "Настройка проекта по умолчанию выключена.",
    saveError: "Не удалось сохранить настройку почтовых обновлений.",
  },
};
