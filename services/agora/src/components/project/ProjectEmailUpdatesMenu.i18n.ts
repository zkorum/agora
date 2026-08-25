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
    receiveUpdates: "Receive email updates for this project",
    manageUpdates: "Manage email updates for this project",
    viewHistory: "View email update history for this project",
    saveEnabled: "Email updates are on for this project.",
    saveDisabled: "Email updates are off for this project.",
    saveError: "Couldn’t save your email update preference.",
  },
  ar: {
    projectActions: "إجراءات المشروع",
    receiveUpdates: "تلقي تحديثات البريد الإلكتروني لهذا المشروع",
    manageUpdates: "إدارة تحديثات البريد الإلكتروني لهذا المشروع",
    viewHistory: "عرض سجل تحديثات البريد الإلكتروني لهذا المشروع",
    saveEnabled: "تم تفعيل تحديثات البريد الإلكتروني لهذا المشروع.",
    saveDisabled: "تم إيقاف تحديثات البريد الإلكتروني لهذا المشروع.",
    saveError: "تعذر حفظ تفضيل تحديثات البريد الإلكتروني.",
  },
  es: {
    projectActions: "Acciones del proyecto",
    receiveUpdates: "Seguir el proyecto por correo",
    manageUpdates: "Gestionar el seguimiento del proyecto por correo",
    viewHistory: "Ver el historial de novedades del proyecto",
    saveEnabled: "El seguimiento del proyecto por correo está activado.",
    saveDisabled: "El seguimiento del proyecto por correo está desactivado.",
    saveError:
      "No se pudo guardar tu preferencia de seguimiento por correo.",
  },
  fa: {
    projectActions: "اقدامات پروژه",
    receiveUpdates: "دریافت به‌روزرسانی‌های ایمیلی برای این پروژه",
    manageUpdates: "مدیریت به‌روزرسانی‌های ایمیلی این پروژه",
    viewHistory: "مشاهده تاریخچه به‌روزرسانی‌های ایمیلی این پروژه",
    saveEnabled: "به‌روزرسانی‌های ایمیلی برای این پروژه روشن شد.",
    saveDisabled: "به‌روزرسانی‌های ایمیلی برای این پروژه خاموش شد.",
    saveError: "ذخیره ترجیح به‌روزرسانی ایمیلی ممکن نشد.",
  },
  fr: {
    projectActions: "Actions du projet",
    receiveUpdates: "Suivre le projet par e-mail",
    manageUpdates: "Gérer le suivi du projet par e-mail",
    viewHistory: "Voir l’historique des nouvelles du projet",
    saveEnabled: "Le suivi du projet par e-mail est activé.",
    saveDisabled: "Le suivi du projet par e-mail est désactivé.",
    saveError:
      "Impossible d’enregistrer votre préférence de suivi par e-mail.",
  },
  "zh-Hans": {
    projectActions: "项目操作",
    receiveUpdates: "接收此项目的电子邮件更新",
    manageUpdates: "管理此项目的电子邮件更新",
    viewHistory: "查看此项目的电子邮件更新历史",
    saveEnabled: "已开启此项目的电子邮件更新。",
    saveDisabled: "已关闭此项目的电子邮件更新。",
    saveError: "无法保存您的电子邮件更新偏好。",
  },
  "zh-Hant": {
    projectActions: "專案操作",
    receiveUpdates: "接收此專案的電子郵件更新",
    manageUpdates: "管理此專案的電子郵件更新",
    viewHistory: "查看此專案的電子郵件更新歷史",
    saveEnabled: "已開啟此專案的電子郵件更新。",
    saveDisabled: "已關閉此專案的電子郵件更新。",
    saveError: "無法儲存您的電子郵件更新偏好。",
  },
  he: {
    projectActions: "פעולות פרויקט",
    receiveUpdates: "קבלת עדכונים בדוא״ל לפרויקט הזה",
    manageUpdates: "ניהול עדכונים בדוא״ל לפרויקט הזה",
    viewHistory: "הצגת היסטוריית העדכונים בדוא״ל של הפרויקט הזה",
    saveEnabled: "עדכונים בדוא״ל הופעלו לפרויקט הזה.",
    saveDisabled: "עדכונים בדוא״ל כובו לפרויקט הזה.",
    saveError: "לא ניתן לשמור את העדפת העדכונים בדוא״ל.",
  },
  ja: {
    projectActions: "プロジェクト操作",
    receiveUpdates: "このプロジェクトのメール更新を受け取る",
    manageUpdates: "このプロジェクトのメール更新を管理する",
    viewHistory: "このプロジェクトのメール更新履歴を表示する",
    saveEnabled: "このプロジェクトのメール更新をオンにしました。",
    saveDisabled: "このプロジェクトのメール更新をオフにしました。",
    saveError: "メール更新の設定を保存できませんでした。",
  },
  ky: {
    projectActions: "Долбоор аракеттери",
    receiveUpdates: "Бул долбоор боюнча электрондук каттарды алуу",
    manageUpdates: "Бул долбоордун электрондук каттарын башкаруу",
    viewHistory: "Бул долбоордун электрондук кат тарыхын көрүү",
    saveEnabled: "Бул долбоор үчүн электрондук каттар күйгүзүлдү.",
    saveDisabled: "Бул долбоор үчүн электрондук каттар өчүрүлдү.",
    saveError: "Электрондук кат тандооңуз сакталган жок.",
  },
  ru: {
    projectActions: "Действия проекта",
    receiveUpdates: "Получать обновления этого проекта по почте",
    manageUpdates: "Управлять почтовыми обновлениями этого проекта",
    viewHistory: "Посмотреть историю почтовых обновлений этого проекта",
    saveEnabled: "Почтовые обновления этого проекта включены.",
    saveDisabled: "Почтовые обновления этого проекта выключены.",
    saveError: "Не удалось сохранить настройку почтовых обновлений.",
  },
};
