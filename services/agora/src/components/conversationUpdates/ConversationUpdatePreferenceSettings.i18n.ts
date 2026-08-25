import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ConversationUpdatePreferenceSettingsTranslations {
  emailUpdates: string;
  heading: string;
  searchLabel: string;
  tryAgain: string;
  pauseAll: string;
  pauseDescription: string;
  empty: string;
  projects: string;
  noProject: string;
  loadMore: string;
  verifiedEmailRequired: string;
  preferencesUnavailable: string;
  morePreferencesUnavailable: string;
  pauseSaved: string;
  resumeSaved: string;
  preferenceOnSaved: string;
  preferenceOffSaved: string;
  savePreferenceError: string;
}

export const conversationUpdatePreferenceSettingsTranslations: Record<
  SupportedDisplayLanguageCodes,
  ConversationUpdatePreferenceSettingsTranslations
> = {
  en: {
    emailUpdates: "Email Updates",
    heading: "Choose what brings you back",
    searchLabel: "Search projects and conversations",
    tryAgain: "Try again",
    pauseAll: "Pause all Email Updates",
    pauseDescription: "Your project and conversation choices stay saved.",
    empty: "No Email Update preferences match this search.",
    projects: "Projects",
    noProject: "No Project",
    loadMore: "Load more",
    verifiedEmailRequired:
      "Verify an email address before changing Email Update preferences.",
    preferencesUnavailable:
      "Email Update preferences are unavailable right now.",
    morePreferencesUnavailable:
      "More Email Update preferences could not be loaded.",
    pauseSaved: "Email Updates paused.",
    resumeSaved: "Email Updates resumed.",
    preferenceOnSaved: "Email update preference saved: on.",
    preferenceOffSaved: "Email update preference saved: off.",
    savePreferenceError: "Couldn’t save your email update preference.",
  },
  es: {
    emailUpdates: "Novedades por correo",
    heading: "Elige qué te hace volver",
    searchLabel: "Buscar proyectos y conversaciones",
    tryAgain: "Intentar de nuevo",
    pauseAll: "Pausar todas las novedades por correo",
    pauseDescription:
      "Tus opciones de proyectos y conversaciones seguirán guardadas.",
    empty:
      "Ninguna preferencia de seguimiento por correo coincide con esta búsqueda.",
    projects: "Proyectos",
    noProject: "Sin proyecto",
    loadMore: "Cargar más",
    verifiedEmailRequired:
      "Verifica una dirección de correo electrónico antes de cambiar tu preferencia de seguimiento por correo.",
    preferencesUnavailable:
      "Las preferencias de seguimiento por correo no están disponibles ahora.",
    morePreferencesUnavailable:
      "No se pudieron cargar más preferencias de seguimiento por correo.",
    pauseSaved: "Novedades por correo pausadas.",
    resumeSaved: "Novedades por correo reanudadas.",
    preferenceOnSaved:
      "Preferencia de seguimiento por correo guardada: activada.",
    preferenceOffSaved:
      "Preferencia de seguimiento por correo guardada: desactivada.",
    savePreferenceError:
      "No se pudo guardar tu preferencia de seguimiento por correo.",
  },
  fr: {
    emailUpdates: "Nouvelles par e-mail",
    heading: "Choisissez ce qui vous fait revenir",
    searchLabel: "Rechercher des projets et des conversations",
    tryAgain: "Réessayer",
    pauseAll: "Suspendre toutes les nouvelles par e-mail",
    pauseDescription:
      "Vos choix de projets et de conversations restent enregistrés.",
    empty:
      "Aucune préférence de suivi par e-mail ne correspond à cette recherche.",
    projects: "Projets",
    noProject: "Sans projet",
    loadMore: "Charger plus",
    verifiedEmailRequired:
      "Vérifiez une adresse e-mail avant de modifier votre préférence de suivi par e-mail.",
    preferencesUnavailable:
      "Les préférences de suivi par e-mail sont indisponibles pour le moment.",
    morePreferencesUnavailable:
      "Impossible de charger davantage de préférences de suivi par e-mail.",
    pauseSaved: "Nouvelles par e-mail suspendues.",
    resumeSaved: "Nouvelles par e-mail réactivées.",
    preferenceOnSaved: "Préférence de suivi par e-mail enregistrée : activée.",
    preferenceOffSaved:
      "Préférence de suivi par e-mail enregistrée : désactivée.",
    savePreferenceError:
      "Impossible d’enregistrer votre préférence de suivi par e-mail.",
  },
  "zh-Hant": {
    emailUpdates: "電子郵件更新",
    heading: "選擇讓你再次回來的內容",
    searchLabel: "搜尋專案和對話",
    tryAgain: "再試一次",
    pauseAll: "暫停所有電子郵件更新",
    pauseDescription: "你的專案和對話選擇會保留。",
    empty: "沒有符合此搜尋的電子郵件更新偏好。",
    projects: "專案",
    noProject: "無專案",
    loadMore: "載入更多",
    verifiedEmailRequired: "請先驗證電子郵件地址，再變更電子郵件更新偏好。",
    preferencesUnavailable: "目前無法使用電子郵件更新偏好。",
    morePreferencesUnavailable: "無法載入更多電子郵件更新偏好。",
    pauseSaved: "電子郵件更新已暫停。",
    resumeSaved: "電子郵件更新已恢復。",
    preferenceOnSaved: "偏好已儲存：開啟。",
    preferenceOffSaved: "偏好已儲存：關閉。",
    savePreferenceError: "無法儲存你的電子郵件更新偏好。",
  },
  "zh-Hans": {
    emailUpdates: "电子邮件更新",
    heading: "选择让你再次回来的内容",
    searchLabel: "搜索项目和对话",
    tryAgain: "重试",
    pauseAll: "暂停所有电子邮件更新",
    pauseDescription: "你的项目和对话选择会保留。",
    empty: "没有符合此搜索的电子邮件更新偏好。",
    projects: "项目",
    noProject: "无项目",
    loadMore: "加载更多",
    verifiedEmailRequired: "请先验证电子邮件地址，再更改电子邮件更新偏好。",
    preferencesUnavailable: "目前无法使用电子邮件更新偏好。",
    morePreferencesUnavailable: "无法加载更多电子邮件更新偏好。",
    pauseSaved: "电子邮件更新已暂停。",
    resumeSaved: "电子邮件更新已恢复。",
    preferenceOnSaved: "偏好已保存：开启。",
    preferenceOffSaved: "偏好已保存：关闭。",
    savePreferenceError: "无法保存你的电子邮件更新偏好。",
  },
  ja: {
    emailUpdates: "メール更新",
    heading: "再訪のきっかけを選ぶ",
    searchLabel: "プロジェクトと会話を検索",
    tryAgain: "もう一度試す",
    pauseAll: "すべてのメール更新を一時停止",
    pauseDescription: "プロジェクトと会話の設定は保存されたままです。",
    empty: "検索に一致するメール更新設定はありません。",
    projects: "プロジェクト",
    noProject: "プロジェクトなし",
    loadMore: "さらに読み込む",
    verifiedEmailRequired:
      "メール更新設定を変更する前に、メールアドレスを確認してください。",
    preferencesUnavailable: "メール更新設定は現在利用できません。",
    morePreferencesUnavailable: "メール更新設定をさらに読み込めませんでした。",
    pauseSaved: "メール更新を一時停止しました。",
    resumeSaved: "メール更新を再開しました。",
    preferenceOnSaved: "メール更新設定をオンで保存しました。",
    preferenceOffSaved: "メール更新設定をオフで保存しました。",
    savePreferenceError: "メール更新設定を保存できませんでした。",
  },
  ar: {
    emailUpdates: "تحديثات البريد الإلكتروني",
    heading: "اختر ما يعيدك",
    searchLabel: "البحث في المشاريع والمحادثات",
    tryAgain: "حاول مجددًا",
    pauseAll: "إيقاف جميع تحديثات البريد الإلكتروني مؤقتًا",
    pauseDescription: "ستبقى خيارات المشاريع والمحادثات محفوظة.",
    empty: "لا توجد تفضيلات لتحديثات البريد الإلكتروني تطابق هذا البحث.",
    projects: "المشاريع",
    noProject: "بلا مشروع",
    loadMore: "تحميل المزيد",
    verifiedEmailRequired:
      "تحقق من عنوان بريد إلكتروني قبل تغيير تفضيلات التحديثات.",
    preferencesUnavailable: "تفضيلات تحديثات البريد الإلكتروني غير متاحة الآن.",
    morePreferencesUnavailable:
      "تعذر تحميل المزيد من تفضيلات تحديثات البريد الإلكتروني.",
    pauseSaved: "تم إيقاف تحديثات البريد الإلكتروني مؤقتًا.",
    resumeSaved: "تم استئناف تحديثات البريد الإلكتروني.",
    preferenceOnSaved: "تم حفظ التفضيل: مفعّل.",
    preferenceOffSaved: "تم حفظ التفضيل: متوقف.",
    savePreferenceError: "تعذر حفظ تفضيل تحديثات البريد الإلكتروني.",
  },
  fa: {
    emailUpdates: "به‌روزرسانی‌های ایمیلی",
    heading: "انتخاب کنید چه چیزی شما را بازمی‌گرداند",
    searchLabel: "جستجوی پروژه‌ها و گفتگوها",
    tryAgain: "تلاش دوباره",
    pauseAll: "توقف موقت همه به‌روزرسانی‌های ایمیلی",
    pauseDescription: "انتخاب‌های پروژه و گفتگو ذخیره می‌مانند.",
    empty: "هیچ تنظیم به‌روزرسانی ایمیلی با این جستجو مطابقت ندارد.",
    projects: "پروژه‌ها",
    noProject: "بدون پروژه",
    loadMore: "بارگیری بیشتر",
    verifiedEmailRequired:
      "پیش از تغییر تنظیمات، یک نشانی ایمیل را تأیید کنید.",
    preferencesUnavailable: "تنظیمات به‌روزرسانی ایمیلی اکنون در دسترس نیست.",
    morePreferencesUnavailable:
      "تنظیمات بیشتری از به‌روزرسانی ایمیلی بارگیری نشد.",
    pauseSaved: "به‌روزرسانی‌های ایمیلی متوقف شدند.",
    resumeSaved: "به‌روزرسانی‌های ایمیلی از سر گرفته شدند.",
    preferenceOnSaved: "تنظیم ذخیره شد: روشن.",
    preferenceOffSaved: "تنظیم ذخیره شد: خاموش.",
    savePreferenceError: "تنظیم به‌روزرسانی ایمیلی شما ذخیره نشد.",
  },
  he: {
    emailUpdates: "עדכונים בדוא״ל",
    heading: "בחרו מה יחזיר אתכם",
    searchLabel: "חיפוש פרויקטים ושיחות",
    tryAgain: "ניסיון נוסף",
    pauseAll: "השהיית כל העדכונים בדוא״ל",
    pauseDescription: "הבחירות לפרויקטים ולשיחות יישארו שמורות.",
    empty: "אין העדפות לעדכונים בדוא״ל שתואמות לחיפוש.",
    projects: "פרויקטים",
    noProject: "ללא פרויקט",
    loadMore: "טעינת עוד",
    verifiedEmailRequired: "יש לאמת כתובת דוא״ל לפני שינוי העדפות העדכונים.",
    preferencesUnavailable: "העדפות העדכונים בדוא״ל אינן זמינות כרגע.",
    morePreferencesUnavailable: "לא ניתן לטעון העדפות נוספות לעדכונים בדוא״ל.",
    pauseSaved: "העדכונים בדוא״ל הושהו.",
    resumeSaved: "העדכונים בדוא״ל חודשו.",
    preferenceOnSaved: "ההעדפה נשמרה: פעיל.",
    preferenceOffSaved: "ההעדפה נשמרה: כבוי.",
    savePreferenceError: "לא ניתן לשמור את העדפת העדכונים בדוא״ל.",
  },
  ky: {
    emailUpdates: "Электрондук почта жаңыртуулары",
    heading: "Сизди кайра алып келген нерсени тандаңыз",
    searchLabel: "Долбоорлорду жана маектерди издөө",
    tryAgain: "Кайра аракет кылуу",
    pauseAll: "Бардык электрондук почта жаңыртууларын тындыруу",
    pauseDescription: "Долбоор жана маек тандоолоруңуз сакталат.",
    empty: "Бул издөөгө туура келген электрондук почта жөндөөлөрү жок.",
    projects: "Долбоорлор",
    noProject: "Долбоорсуз",
    loadMore: "Дагы жүктөө",
    verifiedEmailRequired:
      "Жөндөөлөрдү өзгөртүүдөн мурун электрондук почта дарегин ырастаңыз.",
    preferencesUnavailable:
      "Электрондук почта жаңыртуу жөндөөлөрү азыр жеткиликсиз.",
    morePreferencesUnavailable:
      "Кошумча электрондук почта жаңыртуу жөндөөлөрү жүктөлгөн жок.",
    pauseSaved: "Электрондук почта жаңыртуулары тындырылды.",
    resumeSaved: "Электрондук почта жаңыртуулары улантылды.",
    preferenceOnSaved: "Жөндөө сакталды: күйүк.",
    preferenceOffSaved: "Жөндөө сакталды: өчүк.",
    savePreferenceError: "Электрондук почта жаңыртуу жөндөөңүз сакталган жок.",
  },
  ru: {
    emailUpdates: "Обновления по электронной почте",
    heading: "Выберите, что поможет вам вернуться",
    searchLabel: "Поиск проектов и обсуждений",
    tryAgain: "Повторить",
    pauseAll: "Приостановить все обновления по электронной почте",
    pauseDescription: "Настройки проектов и обсуждений останутся сохранены.",
    empty:
      "Нет настроек обновлений по электронной почте, соответствующих поиску.",
    projects: "Проекты",
    noProject: "Без проекта",
    loadMore: "Загрузить ещё",
    verifiedEmailRequired:
      "Подтвердите адрес электронной почты перед изменением настроек обновлений.",
    preferencesUnavailable:
      "Настройки обновлений по электронной почте сейчас недоступны.",
    morePreferencesUnavailable:
      "Не удалось загрузить дополнительные настройки обновлений по электронной почте.",
    pauseSaved: "Обновления по электронной почте приостановлены.",
    resumeSaved: "Обновления по электронной почте возобновлены.",
    preferenceOnSaved: "Настройка сохранена: включено.",
    preferenceOffSaved: "Настройка сохранена: выключено.",
    savePreferenceError:
      "Не удалось сохранить настройку обновлений по электронной почте.",
  },
};
