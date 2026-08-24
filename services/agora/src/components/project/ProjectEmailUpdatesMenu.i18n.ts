import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ProjectEmailUpdatesMenuTranslations {
  projectActions: string;
  receiveUpdates: string;
  preferenceOn: string;
  preferenceOnPaused: string;
  preferenceOff: string;
  preferenceDefault: string;
  sendUpdate: string;
  sendUpdateDescription: string;
  updateHistory: string;
  updateHistoryDescription: string;
  saveError: string;
}

export const projectEmailUpdatesMenuTranslations: Record<
  SupportedDisplayLanguageCodes,
  ProjectEmailUpdatesMenuTranslations
> = {
  en: {
    projectActions: "Project actions",
    receiveUpdates: "Receive Email Updates",
    preferenceOn: "On for this project",
    preferenceOnPaused: "On for this project, but paused in account settings",
    preferenceOff: "Off for this project",
    preferenceDefault: "Using your account default",
    sendUpdate: "Send Email Update",
    sendUpdateDescription: "Compose an update for this project",
    updateHistory: "Email Update History",
    updateHistoryDescription: "View updates sent for this project",
    saveError: "Could not save your Email Update preference",
  },
  ar: {
    projectActions: "إجراءات المشروع",
    receiveUpdates: "تلقي التحديثات عبر البريد الإلكتروني",
    preferenceOn: "مفعّل لهذا المشروع",
    preferenceOnPaused:
      "مفعّل لهذا المشروع، لكنه متوقف مؤقتًا في إعدادات الحساب",
    preferenceOff: "متوقف لهذا المشروع",
    preferenceDefault: "استخدام الإعداد الافتراضي لحسابك",
    sendUpdate: "إرسال تحديث بالبريد الإلكتروني",
    sendUpdateDescription: "إنشاء تحديث لهذا المشروع",
    updateHistory: "سجل التحديثات عبر البريد الإلكتروني",
    updateHistoryDescription: "عرض التحديثات المرسلة لهذا المشروع",
    saveError: "تعذر حفظ تفضيل التحديثات عبر البريد الإلكتروني",
  },
  es: {
    projectActions: "Acciones del proyecto",
    receiveUpdates: "Recibir novedades por correo",
    preferenceOn: "Activadas para este proyecto",
    preferenceOnPaused:
      "Activadas para este proyecto, pero pausadas en la cuenta",
    preferenceOff: "Desactivadas para este proyecto",
    preferenceDefault: "Usando la configuración predeterminada de la cuenta",
    sendUpdate: "Enviar novedad por correo",
    sendUpdateDescription: "Redactar una novedad para este proyecto",
    updateHistory: "Historial de novedades por correo",
    updateHistoryDescription: "Ver las novedades enviadas para este proyecto",
    saveError: "No se pudo guardar la preferencia de correo",
  },
  fa: {
    projectActions: "اقدامات پروژه",
    receiveUpdates: "دریافت به‌روزرسانی‌های ایمیلی",
    preferenceOn: "برای این پروژه روشن است",
    preferenceOnPaused:
      "برای این پروژه روشن است، اما در تنظیمات حساب متوقف شده",
    preferenceOff: "برای این پروژه خاموش است",
    preferenceDefault: "استفاده از تنظیم پیش‌فرض حساب",
    sendUpdate: "ارسال به‌روزرسانی ایمیلی",
    sendUpdateDescription: "نوشتن به‌روزرسانی برای این پروژه",
    updateHistory: "تاریخچه به‌روزرسانی‌های ایمیلی",
    updateHistoryDescription: "مشاهده به‌روزرسانی‌های ارسال‌شده برای این پروژه",
    saveError: "ذخیره ترجیح به‌روزرسانی ایمیلی ممکن نشد",
  },
  fr: {
    projectActions: "Actions du projet",
    receiveUpdates: "Recevoir les actualités par e-mail",
    preferenceOn: "Activées pour ce projet",
    preferenceOnPaused:
      "Activées pour ce projet, mais suspendues dans le compte",
    preferenceOff: "Désactivées pour ce projet",
    preferenceDefault: "Paramètre par défaut du compte",
    sendUpdate: "Envoyer une actualité par e-mail",
    sendUpdateDescription: "Rédiger une actualité pour ce projet",
    updateHistory: "Historique des actualités par e-mail",
    updateHistoryDescription: "Voir les actualités envoyées pour ce projet",
    saveError: "Impossible d’enregistrer la préférence d’e-mail",
  },
  "zh-Hans": {
    projectActions: "项目操作",
    receiveUpdates: "接收电子邮件更新",
    preferenceOn: "已为此项目开启",
    preferenceOnPaused: "已为此项目开启，但在账户设置中暂停",
    preferenceOff: "已为此项目关闭",
    preferenceDefault: "使用账户默认设置",
    sendUpdate: "发送电子邮件更新",
    sendUpdateDescription: "为此项目撰写更新",
    updateHistory: "电子邮件更新历史",
    updateHistoryDescription: "查看此项目已发送的更新",
    saveError: "无法保存电子邮件更新偏好",
  },
  "zh-Hant": {
    projectActions: "專案操作",
    receiveUpdates: "接收電子郵件更新",
    preferenceOn: "已為此專案開啟",
    preferenceOnPaused: "已為此專案開啟，但在帳戶設定中暫停",
    preferenceOff: "已為此專案關閉",
    preferenceDefault: "使用帳戶預設設定",
    sendUpdate: "傳送電子郵件更新",
    sendUpdateDescription: "為此專案撰寫更新",
    updateHistory: "電子郵件更新歷史",
    updateHistoryDescription: "查看此專案已傳送的更新",
    saveError: "無法儲存電子郵件更新偏好",
  },
  he: {
    projectActions: "פעולות פרויקט",
    receiveUpdates: "קבלת עדכונים בדוא״ל",
    preferenceOn: "פעיל לפרויקט הזה",
    preferenceOnPaused: "פעיל לפרויקט הזה, אך מושהה בהגדרות החשבון",
    preferenceOff: "כבוי לפרויקט הזה",
    preferenceDefault: "שימוש בברירת המחדל של החשבון",
    sendUpdate: "שליחת עדכון בדוא״ל",
    sendUpdateDescription: "כתיבת עדכון לפרויקט הזה",
    updateHistory: "היסטוריית עדכונים בדוא״ל",
    updateHistoryDescription: "הצגת עדכונים שנשלחו עבור הפרויקט הזה",
    saveError: "לא ניתן לשמור את העדפת העדכונים בדוא״ל",
  },
  ja: {
    projectActions: "プロジェクト操作",
    receiveUpdates: "メール更新を受け取る",
    preferenceOn: "このプロジェクトでオン",
    preferenceOnPaused:
      "このプロジェクトでオンですが、アカウント設定で一時停止中",
    preferenceOff: "このプロジェクトでオフ",
    preferenceDefault: "アカウントの既定設定を使用",
    sendUpdate: "メール更新を送信",
    sendUpdateDescription: "このプロジェクトの更新を作成",
    updateHistory: "メール更新履歴",
    updateHistoryDescription: "このプロジェクトで送信した更新を表示",
    saveError: "メール更新の設定を保存できませんでした",
  },
  ky: {
    projectActions: "Долбоор аракеттери",
    receiveUpdates: "Электрондук почта жаңыртууларын алуу",
    preferenceOn: "Бул долбоор үчүн күйгүзүлгөн",
    preferenceOnPaused:
      "Бул долбоор үчүн күйгүзүлгөн, бирок аккаунтта токтотулган",
    preferenceOff: "Бул долбоор үчүн өчүрүлгөн",
    preferenceDefault: "Аккаунттун демейки жөндөөсү колдонулууда",
    sendUpdate: "Электрондук жаңыртуу жөнөтүү",
    sendUpdateDescription: "Бул долбоор үчүн жаңыртуу түзүү",
    updateHistory: "Электрондук жаңыртуулардын тарыхы",
    updateHistoryDescription: "Бул долбоор үчүн жөнөтүлгөн жаңыртууларды көрүү",
    saveError: "Электрондук жаңыртуу жөндөөсүн сактоо мүмкүн болгон жок",
  },
  ru: {
    projectActions: "Действия проекта",
    receiveUpdates: "Получать обновления по почте",
    preferenceOn: "Включено для этого проекта",
    preferenceOnPaused: "Включено для проекта, но приостановлено в аккаунте",
    preferenceOff: "Выключено для этого проекта",
    preferenceDefault: "Используются настройки аккаунта",
    sendUpdate: "Отправить обновление по почте",
    sendUpdateDescription: "Подготовить обновление для этого проекта",
    updateHistory: "История почтовых обновлений",
    updateHistoryDescription: "Посмотреть обновления, отправленные для проекта",
    saveError: "Не удалось сохранить настройку почтовых обновлений",
  },
};
