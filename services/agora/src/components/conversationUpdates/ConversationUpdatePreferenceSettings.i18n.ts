import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ConversationUpdatePreferenceSettingsTranslations {
  sectionDescription: string;
  preferenceHierarchyDescription: string;
  recommendationDescription: string;
  searchLabel: string;
  tryAgain: string;
  receiveEmailUpdates: string;
  updatesOnDescription: string;
  updatesPausedDescription: string;
  empty: string;
  noProject: string;
  loadMore: string;
  loadingMore: string;
  showMore: string;
  verifiedEmailRequired: string;
  preferencesUnavailable: string;
  morePreferencesUnavailable: string;
  savePreferenceSuccess: string;
  savePreferenceError: string;
}

export const conversationUpdatePreferenceSettingsTranslations: Record<
  SupportedDisplayLanguageCodes,
  ConversationUpdatePreferenceSettingsTranslations
> = {
  en: {
    sectionDescription:
      "Occasional email updates from facilitators keep you informed about selected projects and conversations and invite you to participate again. No advertising, fundraising, political campaigning, or unrelated promotion.",
    preferenceHierarchyDescription:
      "A project setting is the default for its conversations. Individual conversation choices override it.",
    recommendationDescription:
      "We recommend keeping them on so you don’t miss important developments. You can change this anytime.",
    searchLabel: "Search projects and conversations",
    tryAgain: "Try again",
    receiveEmailUpdates: "Receive Email Updates",
    updatesOnDescription:
      "You’ll receive updates from your selected projects and conversations.",
    updatesPausedDescription:
      "All Email Updates are paused. Your project and conversation choices stay saved.",
    empty: "No Email Update preferences match this search.",
    noProject: "No Project",
    loadMore: "Load more",
    loadingMore: "Loading more preferences",
    showMore: "Show more",
    verifiedEmailRequired:
      "Verify an email address before changing Email Update preferences.",
    preferencesUnavailable:
      "Email Update preferences are unavailable right now.",
    morePreferencesUnavailable:
      "More Email Update preferences could not be loaded.",
    savePreferenceSuccess: "Your email update preference was saved.",
    savePreferenceError: "Couldn’t save your email update preference.",
  },
  de: {
    sectionDescription:
      "Gelegentliche E-Mail-Updates von Moderationsleitern informieren Sie über ausgewählte Projekte und Diskussionen und laden Sie erneut zur Teilnahme ein. Keine Werbung, Spendenaufrufe, politische Kampagnen oder nicht verwandte Promotion.",
    preferenceHierarchyDescription:
      "Eine Projekteinstellung ist der Standard für deren Diskussionen. Einzelne Diskussionsauswahlen überschreiben dies.",
    recommendationDescription:
      "Wir empfehlen, diese aktiviert zu lassen, damit Sie keine wichtigen Entwicklungen verpassen. Dies können Sie jederzeit ändern.",
    searchLabel: "Projekte und Diskussionen suchen",
    tryAgain: "Erneut versuchen",
    receiveEmailUpdates: "E-Mail-Updates erhalten",
    updatesOnDescription:
      "Sie erhalten Aktualisierungen Ihrer ausgewählten Projekte und Diskussionen.",
    updatesPausedDescription:
      "Alle E-Mail-Updates sind pausiert. Ihre Projekt- und Diskussionsauswahlen bleiben gespeichert.",
    empty: "Keine E-Mail-Update-Präferenzen entsprechen dieser Suche.",
    noProject: "Kein Projekt",
    loadMore: "Mehr laden",
    loadingMore: "Mehr Präferenzen laden",
    showMore: "Mehr anzeigen",
    verifiedEmailRequired:
      "Bitte verifizieren Sie eine E-Mail-Adresse, bevor Sie die E-Mail-Update-Präferenzen ändern.",
    preferencesUnavailable:
      "Die E-Mail-Update-Präferenzen sind momentan nicht verfügbar.",
    morePreferencesUnavailable:
      "Weitere E-Mail-Update-Präferenzen konnten nicht geladen werden.",
    savePreferenceSuccess: "Ihre E-Mail-Update-Präferenz wurde gespeichert.",
    savePreferenceError:
      "Die Speicherung Ihrer E-Mail-Update-Präferenz war nicht möglich.",
  },
  hi: {
    sectionDescription:
      "संचालकों से कभी-कभार ईमेल अपडेट आपको चुनी हुई परियोजनाओं और चर्चाओं के बारे में सूचित रखते हैं और आपको फिर से भाग लेने के लिए आमंत्रित करते हैं। कोई विज्ञापन, धन उगाही, राजनीतिक अभियान, या असंबंधित प्रचार नहीं।",
    preferenceHierarchyDescription:
      "एक परियोजना सेटिंग अपनी चर्चाओं के लिए डिफ़ॉल्ट होती है। व्यक्तिगत चर्चा विकल्प इसे ओवरराइड करते हैं।",
    recommendationDescription:
      "हम सलाह देते हैं कि आप इन्हें चालू रखें ताकि आप महत्वपूर्ण विकास न चूकें। आप इसे कभी भी बदल सकते हैं।",
    searchLabel: "परियोजनाएं और चर्चाएं खोजें",
    tryAgain: "फिर से प्रयास करें",
    receiveEmailUpdates: "ईमेल अपडेट प्राप्त करें",
    updatesOnDescription:
      "आपको अपनी चुनी हुई परियोजनाओं और चर्चाओं से अपडेट प्राप्त होंगे।",
    updatesPausedDescription:
      "सभी ईमेल अपडेट रोक दिए गए हैं। आपकी परियोजना और चर्चा के विकल्प सहेजे रहेंगे।",
    empty: "इस खोज से कोई ईमेल अपडेट प्राथमिकता मेल नहीं खाती।",
    noProject: "कोई परियोजना नहीं",
    loadMore: "और लोड करें",
    loadingMore: "अधिक प्राथमिकताएं लोड हो रही हैं",
    showMore: "और दिखाएं",
    verifiedEmailRequired:
      "ईमेल अपडेट प्राथमिकताएं बदलने से पहले एक ईमेल पता सत्यापित करें।",
    preferencesUnavailable: "ईमेल अपडेट प्राथमिकताएं अभी उपलब्ध नहीं हैं।",
    morePreferencesUnavailable:
      "अधिक ईमेल अपडेट प्राथमिकताएं लोड नहीं हो सकीं।",
    savePreferenceSuccess: "आपकी ईमेल अपडेट प्राथमिकता सहेज ली गई है।",
    savePreferenceError: "आपकी ईमेल अपडेट प्राथमिकता सहेजी नहीं जा सकी।",
  },
  es: {
    sectionDescription:
      "Las novedades ocasionales por correo de quienes facilitan los proyectos y las conversaciones le permiten mantenerse al día y le invitan a volver a participar. Sin publicidad, recaudación de fondos, campañas políticas ni promociones no relacionadas.",
    preferenceHierarchyDescription:
      "La configuración de un proyecto se aplica de forma predeterminada a sus conversaciones. Las opciones de cada conversación la sustituyen.",
    recommendationDescription:
      "Le recomendamos mantenerlas activadas para no perderse novedades importantes. Puede cambiar esta opción cuando quiera.",
    searchLabel: "Buscar proyectos y conversaciones",
    tryAgain: "Intentar de nuevo",
    receiveEmailUpdates: "Recibir novedades por correo",
    updatesOnDescription:
      "Recibirá novedades de los proyectos y las conversaciones que haya seleccionado.",
    updatesPausedDescription:
      "Todas las novedades por correo están pausadas. Sus opciones de proyectos y conversaciones siguen guardadas.",
    empty:
      "Ninguna preferencia de seguimiento por correo coincide con esta búsqueda.",
    noProject: "Sin proyecto",
    loadMore: "Cargar más",
    loadingMore: "Cargando más preferencias",
    showMore: "Mostrar más",
    verifiedEmailRequired:
      "Verifique una dirección de correo electrónico antes de cambiar su preferencia de seguimiento por correo.",
    preferencesUnavailable:
      "Las preferencias de seguimiento por correo no están disponibles ahora.",
    morePreferencesUnavailable:
      "No se pudieron cargar más preferencias de seguimiento por correo.",
    savePreferenceSuccess:
      "Se guardó su preferencia de seguimiento por correo.",
    savePreferenceError:
      "No se pudo guardar su preferencia de seguimiento por correo.",
  },
  fr: {
    sectionDescription:
      "Les nouvelles occasionnelles par e-mail des facilitateurs vous tiennent informé des projets et conversations sélectionnés et vous invitent à participer à nouveau. Sans publicité, appel aux dons, campagne politique ni promotion sans rapport.",
    preferenceHierarchyDescription:
      "Le réglage d’un projet s’applique par défaut à ses conversations. Le choix de chaque conversation le remplace.",
    recommendationDescription:
      "Nous vous recommandons de les garder activées pour ne manquer aucune évolution importante. Vous pouvez modifier ce choix à tout moment.",
    searchLabel: "Rechercher des projets et des conversations",
    tryAgain: "Réessayer",
    receiveEmailUpdates: "Recevoir les nouvelles par e-mail",
    updatesOnDescription:
      "Vous recevrez les nouvelles des projets et conversations sélectionnés.",
    updatesPausedDescription:
      "Toutes les nouvelles par e-mail sont suspendues. Vos choix de projets et de conversations restent enregistrés.",
    empty:
      "Aucune préférence de suivi par e-mail ne correspond à cette recherche.",
    noProject: "Sans projet",
    loadMore: "Charger plus",
    loadingMore: "Chargement de préférences supplémentaires",
    showMore: "Afficher plus",
    verifiedEmailRequired:
      "Vérifiez une adresse e-mail avant de modifier votre préférence de suivi par e-mail.",
    preferencesUnavailable:
      "Les préférences de suivi par e-mail sont indisponibles pour le moment.",
    morePreferencesUnavailable:
      "Impossible de charger davantage de préférences de suivi par e-mail.",
    savePreferenceSuccess:
      "Votre préférence de suivi par e-mail a été enregistrée.",
    savePreferenceError:
      "Impossible d’enregistrer votre préférence de suivi par e-mail.",
  },
  "zh-Hant": {
    sectionDescription:
      "協作者傳送的不定期電子郵件動態，讓你掌握所選專案和對話的消息並再次參與。不包含廣告、募款、政治宣傳或無關推廣。",
    preferenceHierarchyDescription:
      "專案設定是其中對話的預設值。個別對話的選擇會優先套用。",
    recommendationDescription:
      "建議保持開啟，以免錯過重要進展。你可以隨時變更此選項。",
    searchLabel: "搜尋專案和對話",
    tryAgain: "再試一次",
    receiveEmailUpdates: "接收電子郵件更新",
    updatesOnDescription: "你會收到所選專案和對話的更新。",
    updatesPausedDescription:
      "所有電子郵件更新都已暫停。你的專案和對話選擇會保留。",
    empty: "沒有符合此搜尋的電子郵件更新偏好。",
    noProject: "無專案",
    loadMore: "載入更多",
    loadingMore: "正在載入更多偏好設定",
    showMore: "顯示更多",
    verifiedEmailRequired: "請先驗證電子郵件地址，再變更電子郵件更新偏好。",
    preferencesUnavailable: "目前無法使用電子郵件更新偏好。",
    morePreferencesUnavailable: "無法載入更多電子郵件更新偏好。",
    savePreferenceSuccess: "你的電子郵件更新偏好已儲存。",
    savePreferenceError: "無法儲存你的電子郵件更新偏好。",
  },
  "zh-Hans": {
    sectionDescription:
      "协作者发送的不定期邮件动态，让你掌握所选项目和对话的消息并再次参与。不包含广告、募款、政治宣传或无关推广。",
    preferenceHierarchyDescription:
      "项目设置是其中对话的默认值。单个对话的选择会优先应用。",
    recommendationDescription:
      "建议保持开启，以免错过重要进展。你可以随时更改此选项。",
    searchLabel: "搜索项目和对话",
    tryAgain: "重试",
    receiveEmailUpdates: "接收电子邮件更新",
    updatesOnDescription: "你会收到所选项目和对话的更新。",
    updatesPausedDescription:
      "所有电子邮件更新都已暂停。你的项目和对话选择会保留。",
    empty: "没有符合此搜索的电子邮件更新偏好。",
    noProject: "无项目",
    loadMore: "加载更多",
    loadingMore: "正在加载更多偏好设置",
    showMore: "显示更多",
    verifiedEmailRequired: "请先验证电子邮件地址，再更改电子邮件更新偏好。",
    preferencesUnavailable: "目前无法使用电子邮件更新偏好。",
    morePreferencesUnavailable: "无法加载更多电子邮件更新偏好。",
    savePreferenceSuccess: "你的电子邮件更新偏好已保存。",
    savePreferenceError: "无法保存你的电子邮件更新偏好。",
  },
  ja: {
    sectionDescription:
      "ファシリテーターから届く不定期のメール更新で、選択したプロジェクトや会話の情報を確認し、再び参加できます。広告、資金集め、政治運動、無関係な宣伝は含まれません。",
    preferenceHierarchyDescription:
      "プロジェクトの設定は、その会話に適用される既定値です。会話ごとの選択が優先されます。",
    recommendationDescription:
      "重要な進展を見逃さないよう、オンのままにすることをおすすめします。この設定はいつでも変更できます。",
    searchLabel: "プロジェクトと会話を検索",
    tryAgain: "もう一度試す",
    receiveEmailUpdates: "メール更新を受け取る",
    updatesOnDescription: "選択したプロジェクトと会話の更新を受け取ります。",
    updatesPausedDescription:
      "すべてのメール更新は一時停止されています。プロジェクトと会話の選択内容は保存されたままです。",
    empty: "検索に一致するメール更新設定はありません。",
    noProject: "プロジェクトなし",
    loadMore: "さらに読み込む",
    loadingMore: "さらに設定を読み込んでいます",
    showMore: "さらに表示",
    verifiedEmailRequired:
      "メール更新設定を変更する前に、メールアドレスを確認してください。",
    preferencesUnavailable: "メール更新設定は現在利用できません。",
    morePreferencesUnavailable: "メール更新設定をさらに読み込めませんでした。",
    savePreferenceSuccess: "メール更新設定を保存しました。",
    savePreferenceError: "メール更新設定を保存できませんでした。",
  },
  ar: {
    sectionDescription:
      "تبقيك تحديثات البريد الإلكتروني العرضية من الميسّرين على اطلاع بالمشاريع والمحادثات المحددة وتدعوك للمشاركة مجددًا. لا إعلانات أو جمع تبرعات أو حملات سياسية أو ترويج غير ذي صلة.",
    preferenceHierarchyDescription:
      "إعداد المشروع هو الإعداد الافتراضي لمحادثاته، وتكون لاختيارات المحادثات الفردية الأولوية عليه.",
    recommendationDescription:
      "نوصي بإبقائها مفعّلة حتى لا تفوتك التطورات المهمة. يمكنك تغيير هذا الخيار في أي وقت.",
    searchLabel: "البحث في المشاريع والمحادثات",
    tryAgain: "حاول مجددًا",
    receiveEmailUpdates: "تلقي تحديثات البريد الإلكتروني",
    updatesOnDescription: "ستتلقى تحديثات من المشاريع والمحادثات التي اخترتها.",
    updatesPausedDescription:
      "جميع تحديثات البريد الإلكتروني متوقفة مؤقتًا. ستبقى خيارات المشاريع والمحادثات محفوظة.",
    empty: "لا توجد تفضيلات لتحديثات البريد الإلكتروني تطابق هذا البحث.",
    noProject: "بلا مشروع",
    loadMore: "تحميل المزيد",
    loadingMore: "جارٍ تحميل المزيد من التفضيلات",
    showMore: "عرض المزيد",
    verifiedEmailRequired:
      "تحقق من عنوان بريد إلكتروني قبل تغيير تفضيلات التحديثات.",
    preferencesUnavailable: "تفضيلات تحديثات البريد الإلكتروني غير متاحة الآن.",
    morePreferencesUnavailable:
      "تعذر تحميل المزيد من تفضيلات تحديثات البريد الإلكتروني.",
    savePreferenceSuccess: "تم حفظ تفضيل تحديثات البريد الإلكتروني.",
    savePreferenceError: "تعذر حفظ تفضيل تحديثات البريد الإلكتروني.",
  },
  fa: {
    sectionDescription:
      "به‌روزرسانی‌های ایمیلی گاه‌به‌گاه تسهیل‌گران، شما را از پروژه‌ها و گفت‌وگوهای انتخاب‌شده باخبر می‌کند و برای مشارکت دوباره دعوت می‌کند. بدون تبلیغات، جمع‌آوری کمک مالی، کارزار سیاسی یا ترویج نامرتبط.",
    preferenceHierarchyDescription:
      "تنظیم پروژه، پیش‌فرض گفتگوهای آن است و انتخاب هر گفتگوی جداگانه بر آن اولویت دارد.",
    recommendationDescription:
      "پیشنهاد می‌کنیم آن‌ها را روشن نگه دارید تا رویدادهای مهم را از دست ندهید. هر زمان بخواهید می‌توانید این گزینه را تغییر دهید.",
    searchLabel: "جستجوی پروژه‌ها و گفتگوها",
    tryAgain: "تلاش دوباره",
    receiveEmailUpdates: "دریافت به‌روزرسانی‌های ایمیلی",
    updatesOnDescription:
      "به‌روزرسانی‌های پروژه‌ها و گفتگوهای انتخاب‌شده را دریافت خواهید کرد.",
    updatesPausedDescription:
      "همهٔ به‌روزرسانی‌های ایمیلی موقتاً متوقف شده‌اند. انتخاب‌های شما برای پروژه‌ها و گفتگوها ذخیره می‌مانند.",
    empty: "هیچ تنظیم به‌روزرسانی ایمیلی با این جستجو مطابقت ندارد.",
    noProject: "بدون پروژه",
    loadMore: "بارگیری بیشتر",
    loadingMore: "در حال بارگیری تنظیمات بیشتر",
    showMore: "نمایش بیشتر",
    verifiedEmailRequired:
      "پیش از تغییر تنظیمات، یک نشانی ایمیل را تأیید کنید.",
    preferencesUnavailable: "تنظیمات به‌روزرسانی ایمیلی اکنون در دسترس نیست.",
    morePreferencesUnavailable:
      "تنظیمات بیشتری از به‌روزرسانی ایمیلی بارگیری نشد.",
    savePreferenceSuccess: "تنظیم به‌روزرسانی ایمیلی شما ذخیره شد.",
    savePreferenceError: "تنظیم به‌روزرسانی ایمیلی شما ذخیره نشد.",
  },
  he: {
    sectionDescription:
      "עדכונים מזדמנים בדוא״ל מהמנחים משאירים אתכם מעודכנים בפרויקטים ובשיחות שבחרתם ומזמינים אתכם להשתתף שוב. ללא פרסום, גיוס תרומות, תעמולה פוליטית או קידום שאינו קשור.",
    preferenceHierarchyDescription:
      "הגדרת הפרויקט היא ברירת המחדל לשיחות שבו. בחירה בשיחה מסוימת גוברת עליה.",
    recommendationDescription:
      "מומלץ להשאיר אותם פעילים כדי לא להחמיץ התפתחויות חשובות. אפשר לשנות זאת בכל עת.",
    searchLabel: "חיפוש פרויקטים ושיחות",
    tryAgain: "ניסיון נוסף",
    receiveEmailUpdates: "קבלת עדכונים בדוא״ל",
    updatesOnDescription: "תקבלו עדכונים מהפרויקטים ומהשיחות שבחרתם.",
    updatesPausedDescription:
      "כל העדכונים בדוא״ל מושהים. הבחירות שלכם בפרויקטים ובשיחות יישארו שמורות.",
    empty: "אין העדפות לעדכונים בדוא״ל שתואמות לחיפוש.",
    noProject: "ללא פרויקט",
    loadMore: "טעינת עוד",
    loadingMore: "טעינת העדפות נוספות",
    showMore: "הצגת עוד",
    verifiedEmailRequired: "יש לאמת כתובת דוא״ל לפני שינוי העדפות העדכונים.",
    preferencesUnavailable: "העדפות העדכונים בדוא״ל אינן זמינות כרגע.",
    morePreferencesUnavailable: "לא ניתן לטעון העדפות נוספות לעדכונים בדוא״ל.",
    savePreferenceSuccess: "העדפת העדכונים בדוא״ל נשמרה.",
    savePreferenceError: "לא ניתן לשמור את העדפת העדכונים בדוא״ל.",
  },
  ky: {
    sectionDescription:
      "Фасилитаторлордун маал-маалы менен келген электрондук каттары сизди тандалган долбоорлор жана талкуулар тууралуу кабардар кылып, кайра катышууга чакырат. Жарнама, каражат чогултуу, саясий үгүт же тиешеси жок илгерилетүү болбойт.",
    preferenceHierarchyDescription:
      "Долбоордун жөндөөсү андагы маектер үчүн баштапкы тандоо болот. Ар бир маекке өзүнчө жасалган тандоо андан жогору турат.",
    recommendationDescription:
      "Маанилүү өзгөрүүлөрдү өткөрүп жибербөө үчүн аларды күйгүзүп коюуну сунуштайбыз. Муну каалаган убакта өзгөртө аласыз.",
    searchLabel: "Долбоорлорду жана маектерди издөө",
    tryAgain: "Кайра аракет кылуу",
    receiveEmailUpdates: "Электрондук почта жаңыртууларын алуу",
    updatesOnDescription:
      "Тандалган долбоорлор жана маектер боюнча жаңыртууларды аласыз.",
    updatesPausedDescription:
      "Бардык электрондук почта жаңыртуулары тындырылды. Долбоор жана маек тандоолоруңуз сакталат.",
    empty: "Бул издөөгө туура келген электрондук почта жөндөөлөрү жок.",
    noProject: "Долбоорсуз",
    loadMore: "Дагы жүктөө",
    loadingMore: "Дагы жөндөөлөр жүктөлүүдө",
    showMore: "Дагы көрсөтүү",
    verifiedEmailRequired:
      "Жөндөөлөрдү өзгөртүүдөн мурун электрондук почта дарегин ырастаңыз.",
    preferencesUnavailable:
      "Электрондук почта жаңыртуу жөндөөлөрү азыр жеткиликсиз.",
    morePreferencesUnavailable:
      "Кошумча электрондук почта жаңыртуу жөндөөлөрү жүктөлгөн жок.",
    savePreferenceSuccess: "Электрондук почта жаңыртуу жөндөөңүз сакталды.",
    savePreferenceError: "Электрондук почта жаңыртуу жөндөөңүз сакталган жок.",
  },
  ru: {
    sectionDescription:
      "Периодические письма от фасилитаторов помогают следить за выбранными проектами и обсуждениями и приглашают снова участвовать. Без рекламы, сбора средств, политической агитации и несвязанного продвижения.",
    preferenceHierarchyDescription:
      "Настройка проекта применяется к его обсуждениям по умолчанию. Выбор для отдельного обсуждения имеет приоритет.",
    recommendationDescription:
      "Рекомендуем оставить их включёнными, чтобы не пропустить важные события. Вы можете изменить этот выбор в любое время.",
    searchLabel: "Поиск проектов и обсуждений",
    tryAgain: "Повторить",
    receiveEmailUpdates: "Получать обновления по электронной почте",
    updatesOnDescription:
      "Вы будете получать обновления по выбранным проектам и обсуждениям.",
    updatesPausedDescription:
      "Все обновления по электронной почте приостановлены. Ваш выбор проектов и обсуждений сохранится.",
    empty:
      "Нет настроек обновлений по электронной почте, соответствующих поиску.",
    noProject: "Без проекта",
    loadMore: "Загрузить ещё",
    loadingMore: "Загрузка дополнительных настроек",
    showMore: "Показать ещё",
    verifiedEmailRequired:
      "Подтвердите адрес электронной почты перед изменением настроек обновлений.",
    preferencesUnavailable:
      "Настройки обновлений по электронной почте сейчас недоступны.",
    morePreferencesUnavailable:
      "Не удалось загрузить дополнительные настройки обновлений по электронной почте.",
    savePreferenceSuccess:
      "Настройка обновлений по электронной почте сохранена.",
    savePreferenceError:
      "Не удалось сохранить настройку обновлений по электронной почте.",
  },
};
