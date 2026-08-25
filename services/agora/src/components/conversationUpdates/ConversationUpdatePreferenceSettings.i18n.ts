import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ConversationUpdatePreferenceSettingsTranslations {
  emailUpdates: string;
  heading: string;
  description: string;
  searchLabel: string;
  tryAgain: string;
  pauseAll: string;
  pauseDescription: string;
  saving: string;
  pausedDescription: string;
  empty: string;
  projects: string;
  projectsDescription: string;
  noProject: string;
  noProjectDescription: string;
  projectUnavailable: string;
  conversationUnavailable: string;
  receiveEmailUpdatesFor: string;
  loadMore: string;
  projectOn: string;
  projectOff: string;
  projectUnset: string;
  conversationOn: string;
  conversationOff: string;
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
    description:
      "Keep your choices specific. Project preferences apply by default, while a conversation choice can make an exception.",
    searchLabel: "Search projects and conversations",
    tryAgain: "Try again",
    pauseAll: "Pause all Email Updates",
    pauseDescription: "Your project and conversation choices stay saved.",
    saving: "Saving...",
    pausedDescription:
      "All Email Updates are paused. Your choices below remain saved and can still be changed.",
    empty: "No Email Update preferences match this search.",
    projects: "Projects",
    projectsDescription: "Set a default, then adjust individual conversations.",
    noProject: "No Project",
    noProjectDescription:
      "These conversations each have their own explicit choice.",
    projectUnavailable: "This project preference is temporarily unavailable.",
    conversationUnavailable:
      "This conversation preference is temporarily unavailable.",
    receiveEmailUpdatesFor: "Receive Email Updates for {name}",
    loadMore: "Load more",
    projectOn: "On for this project",
    projectOff: "Off for this project",
    projectUnset: "No project choice saved",
    conversationOn: "On for this conversation",
    conversationOff: "Off for this conversation",
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
    description:
      "Define tus opciones con precisión. Las preferencias del proyecto se aplican de forma predeterminada, pero puedes hacer excepciones por conversación.",
    searchLabel: "Buscar proyectos y conversaciones",
    tryAgain: "Intentar de nuevo",
    pauseAll: "Pausar todas las novedades por correo",
    pauseDescription:
      "Tus opciones de proyectos y conversaciones seguirán guardadas.",
    saving: "Guardando...",
    pausedDescription:
      "Todas las novedades por correo están pausadas. Tus opciones siguen guardadas y puedes modificarlas.",
    empty:
      "Ninguna preferencia de seguimiento por correo coincide con esta búsqueda.",
    projects: "Proyectos",
    projectsDescription:
      "Define una opción predeterminada y ajusta cada conversación.",
    noProject: "Sin proyecto",
    noProjectDescription:
      "Cada una de estas conversaciones tiene su propia opción.",
    projectUnavailable:
      "La preferencia de seguimiento por correo de este proyecto no está disponible temporalmente.",
    conversationUnavailable:
      "La preferencia de seguimiento por correo de esta conversación no está disponible temporalmente.",
    receiveEmailUpdatesFor: "Seguir {name} por correo",
    loadMore: "Cargar más",
    projectOn: "Seguimiento activado para este proyecto",
    projectOff: "Seguimiento desactivado para este proyecto",
    projectUnset: "Sin preferencia de seguimiento para el proyecto",
    conversationOn: "Seguimiento activado para esta conversación",
    conversationOff: "Seguimiento desactivado para esta conversación",
    verifiedEmailRequired:
      "Verifica una dirección de correo electrónico antes de cambiar tu preferencia de seguimiento por correo.",
    preferencesUnavailable:
      "Las preferencias de seguimiento por correo no están disponibles ahora.",
    morePreferencesUnavailable:
      "No se pudieron cargar más preferencias de seguimiento por correo.",
    pauseSaved: "Novedades por correo pausadas.",
    resumeSaved: "Novedades por correo reanudadas.",
    preferenceOnSaved: "Preferencia de seguimiento por correo guardada: activada.",
    preferenceOffSaved:
      "Preferencia de seguimiento por correo guardada: desactivada.",
    savePreferenceError:
      "No se pudo guardar tu preferencia de seguimiento por correo.",
  },
  fr: {
    emailUpdates: "Nouvelles par e-mail",
    heading: "Choisissez ce qui vous fait revenir",
    description:
      "Précisez vos choix. Les préférences du projet s’appliquent par défaut, mais chaque conversation peut faire exception.",
    searchLabel: "Rechercher des projets et des conversations",
    tryAgain: "Réessayer",
    pauseAll: "Suspendre toutes les nouvelles par e-mail",
    pauseDescription:
      "Vos choix de projets et de conversations restent enregistrés.",
    saving: "Enregistrement...",
    pausedDescription:
      "Toutes les nouvelles par e-mail sont suspendues. Vos choix restent enregistrés et peuvent encore être modifiés.",
    empty:
      "Aucune préférence de suivi par e-mail ne correspond à cette recherche.",
    projects: "Projets",
    projectsDescription:
      "Définissez un choix par défaut, puis ajustez chaque conversation.",
    noProject: "Sans projet",
    noProjectDescription:
      "Chacune de ces conversations possède son propre choix explicite.",
    projectUnavailable:
      "La préférence de suivi par e-mail de ce projet est temporairement indisponible.",
    conversationUnavailable:
      "La préférence de suivi par e-mail de cette conversation est temporairement indisponible.",
    receiveEmailUpdatesFor: "Suivre {name} par e-mail",
    loadMore: "Charger plus",
    projectOn: "Suivi activé pour ce projet",
    projectOff: "Suivi désactivé pour ce projet",
    projectUnset: "Aucune préférence de suivi pour le projet",
    conversationOn: "Suivi activé pour cette conversation",
    conversationOff: "Suivi désactivé pour cette conversation",
    verifiedEmailRequired:
      "Vérifiez une adresse e-mail avant de modifier votre préférence de suivi par e-mail.",
    preferencesUnavailable:
      "Les préférences de suivi par e-mail sont indisponibles pour le moment.",
    morePreferencesUnavailable:
      "Impossible de charger davantage de préférences de suivi par e-mail.",
    pauseSaved: "Nouvelles par e-mail suspendues.",
    resumeSaved: "Nouvelles par e-mail réactivées.",
    preferenceOnSaved:
      "Préférence de suivi par e-mail enregistrée : activée.",
    preferenceOffSaved:
      "Préférence de suivi par e-mail enregistrée : désactivée.",
    savePreferenceError:
      "Impossible d’enregistrer votre préférence de suivi par e-mail.",
  },
  "zh-Hant": {
    emailUpdates: "電子郵件更新",
    heading: "選擇讓你再次回來的內容",
    description:
      "請明確設定你的選擇。專案偏好會預設套用，而個別對話可以例外設定。",
    searchLabel: "搜尋專案和對話",
    tryAgain: "再試一次",
    pauseAll: "暫停所有電子郵件更新",
    pauseDescription: "你的專案和對話選擇會保留。",
    saving: "儲存中...",
    pausedDescription:
      "所有電子郵件更新都已暫停。下方選擇仍會保留，也可以繼續修改。",
    empty: "沒有符合此搜尋的電子郵件更新偏好。",
    projects: "專案",
    projectsDescription: "先設定預設值，再調整個別對話。",
    noProject: "無專案",
    noProjectDescription: "這些對話各自有明確的選擇。",
    projectUnavailable: "此專案偏好暫時無法使用。",
    conversationUnavailable: "此對話偏好暫時無法使用。",
    receiveEmailUpdatesFor: "接收 {name} 的電子郵件更新",
    loadMore: "載入更多",
    projectOn: "此專案已開啟",
    projectOff: "此專案已關閉",
    projectUnset: "尚未儲存專案選擇",
    conversationOn: "此對話已開啟",
    conversationOff: "此對話已關閉",
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
    description:
      "请明确设置你的选择。项目偏好会默认应用，而单个对话可以例外设置。",
    searchLabel: "搜索项目和对话",
    tryAgain: "重试",
    pauseAll: "暂停所有电子邮件更新",
    pauseDescription: "你的项目和对话选择会保留。",
    saving: "正在保存...",
    pausedDescription:
      "所有电子邮件更新都已暂停。下方选择仍会保留，也可以继续修改。",
    empty: "没有符合此搜索的电子邮件更新偏好。",
    projects: "项目",
    projectsDescription: "先设置默认值，再调整单个对话。",
    noProject: "无项目",
    noProjectDescription: "这些对话各自有明确的选择。",
    projectUnavailable: "此项目偏好暂时不可用。",
    conversationUnavailable: "此对话偏好暂时不可用。",
    receiveEmailUpdatesFor: "接收 {name} 的电子邮件更新",
    loadMore: "加载更多",
    projectOn: "此项目已开启",
    projectOff: "此项目已关闭",
    projectUnset: "尚未保存项目选择",
    conversationOn: "此对话已开启",
    conversationOff: "此对话已关闭",
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
    description:
      "受信設定を細かく選べます。プロジェクトの設定が標準で適用され、会話ごとに例外を設定できます。",
    searchLabel: "プロジェクトと会話を検索",
    tryAgain: "もう一度試す",
    pauseAll: "すべてのメール更新を一時停止",
    pauseDescription: "プロジェクトと会話の設定は保存されたままです。",
    saving: "保存中...",
    pausedDescription:
      "すべてのメール更新を一時停止しています。以下の設定は保存され、引き続き変更できます。",
    empty: "検索に一致するメール更新設定はありません。",
    projects: "プロジェクト",
    projectsDescription: "標準設定を決めてから、会話ごとに調整します。",
    noProject: "プロジェクトなし",
    noProjectDescription: "これらの会話には個別の設定があります。",
    projectUnavailable: "このプロジェクトの設定は一時的に利用できません。",
    conversationUnavailable: "この会話の設定は一時的に利用できません。",
    receiveEmailUpdatesFor: "{name} のメール更新を受信",
    loadMore: "さらに読み込む",
    projectOn: "このプロジェクトではオン",
    projectOff: "このプロジェクトではオフ",
    projectUnset: "プロジェクトの設定は未保存",
    conversationOn: "この会話ではオン",
    conversationOff: "この会話ではオフ",
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
    description:
      "حدّد خياراتك بدقة. تُطبّق تفضيلات المشروع افتراضيًا، ويمكن لخيار المحادثة أن يكون استثناءً.",
    searchLabel: "البحث في المشاريع والمحادثات",
    tryAgain: "حاول مجددًا",
    pauseAll: "إيقاف جميع تحديثات البريد الإلكتروني مؤقتًا",
    pauseDescription: "ستبقى خيارات المشاريع والمحادثات محفوظة.",
    saving: "جارٍ الحفظ...",
    pausedDescription:
      "جميع تحديثات البريد الإلكتروني متوقفة مؤقتًا. ستبقى خياراتك أدناه محفوظة ويمكنك تعديلها.",
    empty: "لا توجد تفضيلات لتحديثات البريد الإلكتروني تطابق هذا البحث.",
    projects: "المشاريع",
    projectsDescription: "عيّن خيارًا افتراضيًا، ثم عدّل كل محادثة.",
    noProject: "بلا مشروع",
    noProjectDescription: "لكل محادثة من هذه المحادثات خيارها الخاص.",
    projectUnavailable: "تفضيل هذا المشروع غير متاح مؤقتًا.",
    conversationUnavailable: "تفضيل هذه المحادثة غير متاح مؤقتًا.",
    receiveEmailUpdatesFor: "تلقي تحديثات البريد الإلكتروني من {name}",
    loadMore: "تحميل المزيد",
    projectOn: "مفعّلة لهذا المشروع",
    projectOff: "متوقفة لهذا المشروع",
    projectUnset: "لم يُحفظ خيار للمشروع",
    conversationOn: "مفعّلة لهذه المحادثة",
    conversationOff: "متوقفة لهذه المحادثة",
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
    description:
      "انتخاب‌هایتان را دقیق تنظیم کنید. تنظیمات پروژه به‌طور پیش‌فرض اعمال می‌شوند و هر گفتگو می‌تواند استثنا باشد.",
    searchLabel: "جستجوی پروژه‌ها و گفتگوها",
    tryAgain: "تلاش دوباره",
    pauseAll: "توقف موقت همه به‌روزرسانی‌های ایمیلی",
    pauseDescription: "انتخاب‌های پروژه و گفتگو ذخیره می‌مانند.",
    saving: "در حال ذخیره...",
    pausedDescription:
      "همه به‌روزرسانی‌های ایمیلی موقتاً متوقف شده‌اند. انتخاب‌های زیر ذخیره می‌مانند و همچنان قابل تغییرند.",
    empty: "هیچ تنظیم به‌روزرسانی ایمیلی با این جستجو مطابقت ندارد.",
    projects: "پروژه‌ها",
    projectsDescription: "یک پیش‌فرض تعیین کنید و سپس هر گفتگو را تنظیم کنید.",
    noProject: "بدون پروژه",
    noProjectDescription: "هر یک از این گفتگوها انتخاب مشخص خود را دارد.",
    projectUnavailable: "تنظیم این پروژه موقتاً در دسترس نیست.",
    conversationUnavailable: "تنظیم این گفتگو موقتاً در دسترس نیست.",
    receiveEmailUpdatesFor: "دریافت به‌روزرسانی ایمیلی برای {name}",
    loadMore: "بارگیری بیشتر",
    projectOn: "برای این پروژه روشن است",
    projectOff: "برای این پروژه خاموش است",
    projectUnset: "انتخابی برای پروژه ذخیره نشده است",
    conversationOn: "برای این گفتگو روشن است",
    conversationOff: "برای این گفتگو خاموش است",
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
    description:
      "הגדירו את הבחירות במדויק. העדפות הפרויקט חלות כברירת מחדל, ואפשר להגדיר חריגה לכל שיחה.",
    searchLabel: "חיפוש פרויקטים ושיחות",
    tryAgain: "ניסיון נוסף",
    pauseAll: "השהיית כל העדכונים בדוא״ל",
    pauseDescription: "הבחירות לפרויקטים ולשיחות יישארו שמורות.",
    saving: "בשמירה...",
    pausedDescription:
      "כל העדכונים בדוא״ל מושהים. הבחירות שלמטה נשארות שמורות ועדיין אפשר לשנות אותן.",
    empty: "אין העדפות לעדכונים בדוא״ל שתואמות לחיפוש.",
    projects: "פרויקטים",
    projectsDescription: "הגדירו ברירת מחדל ואז התאימו כל שיחה.",
    noProject: "ללא פרויקט",
    noProjectDescription: "לכל אחת מהשיחות האלה יש בחירה מפורשת משלה.",
    projectUnavailable: "העדפת הפרויקט אינה זמינה זמנית.",
    conversationUnavailable: "העדפת השיחה אינה זמינה זמנית.",
    receiveEmailUpdatesFor: "קבלת עדכונים בדוא״ל עבור {name}",
    loadMore: "טעינת עוד",
    projectOn: "פעיל בפרויקט הזה",
    projectOff: "כבוי בפרויקט הזה",
    projectUnset: "לא נשמרה בחירה לפרויקט",
    conversationOn: "פעיל בשיחה הזאת",
    conversationOff: "כבוי בשיחה הזאת",
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
    description:
      "Тандоолоруңузду тактаңыз. Долбоордун жөндөөлөрү демейки боюнча колдонулат, ал эми маекке өзгөчө тандоо коюуга болот.",
    searchLabel: "Долбоорлорду жана маектерди издөө",
    tryAgain: "Кайра аракет кылуу",
    pauseAll: "Бардык электрондук почта жаңыртууларын тындыруу",
    pauseDescription: "Долбоор жана маек тандоолоруңуз сакталат.",
    saving: "Сакталууда...",
    pausedDescription:
      "Бардык электрондук почта жаңыртуулары тындырылды. Төмөнкү тандоолоруңуз сакталат жана аларды өзгөртө аласыз.",
    empty: "Бул издөөгө туура келген электрондук почта жөндөөлөрү жок.",
    projects: "Долбоорлор",
    projectsDescription:
      "Демейки тандоону коюп, андан кийин ар бир маекти жөндөңүз.",
    noProject: "Долбоорсуз",
    noProjectDescription: "Бул маектердин ар биринин өзүнчө тандоосу бар.",
    projectUnavailable: "Бул долбоордун жөндөөсү убактылуу жеткиликсиз.",
    conversationUnavailable: "Бул маектин жөндөөсү убактылуу жеткиликсиз.",
    receiveEmailUpdatesFor: "{name} үчүн электрондук почта жаңыртууларын алуу",
    loadMore: "Дагы жүктөө",
    projectOn: "Бул долбоор үчүн күйүк",
    projectOff: "Бул долбоор үчүн өчүк",
    projectUnset: "Долбоор тандоосу сакталган эмес",
    conversationOn: "Бул маек үчүн күйүк",
    conversationOff: "Бул маек үчүн өчүк",
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
    description:
      "Настройте выбор точно. Настройки проекта применяются по умолчанию, а для отдельного обсуждения можно сделать исключение.",
    searchLabel: "Поиск проектов и обсуждений",
    tryAgain: "Повторить",
    pauseAll: "Приостановить все обновления по электронной почте",
    pauseDescription: "Настройки проектов и обсуждений останутся сохранены.",
    saving: "Сохранение...",
    pausedDescription:
      "Все обновления по электронной почте приостановлены. Настройки ниже сохранены, и их по-прежнему можно менять.",
    empty:
      "Нет настроек обновлений по электронной почте, соответствующих поиску.",
    projects: "Проекты",
    projectsDescription:
      "Задайте настройку по умолчанию, затем измените отдельные обсуждения.",
    noProject: "Без проекта",
    noProjectDescription:
      "Для каждого из этих обсуждений задан отдельный выбор.",
    projectUnavailable: "Настройка этого проекта временно недоступна.",
    conversationUnavailable: "Настройка этого обсуждения временно недоступна.",
    receiveEmailUpdatesFor:
      "Получать обновления по электронной почте для {name}",
    loadMore: "Загрузить ещё",
    projectOn: "Включено для этого проекта",
    projectOff: "Выключено для этого проекта",
    projectUnset: "Настройка проекта не сохранена",
    conversationOn: "Включено для этого обсуждения",
    conversationOff: "Выключено для этого обсуждения",
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
