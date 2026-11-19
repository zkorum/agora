import type { locales } from "$lib/paraglide/runtime";

import type { FaqItem } from "./faq-content";

type Locale = (typeof locales)[number];

interface ComparisonCopy {
  question: string;
  answer: string;
  featureLabel: string;
  features: {
    openSource: string;
    opinionMapping: string;
    llmLabels: string;
    wikiSurvey: string;
    listView: string;
    prioritization: string;
    clusterCount: string;
    clusterHistory: string;
    login: string;
    projectPage: string;
    translation: string;
    community: string;
  };
  loginValues: readonly [string, string];
  translationValues: readonly [string, string];
}

const comparisonCopyByLocale: Record<Locale, ComparisonCopy> = {
  en: {
    question: "How is Agora different from Pol.is?",
    answer:
      "Agora is built for collective decision-making, from finding consensus to identifying shared priorities. It’s inspired by Pol.is, but it isn’t a fork of the app. Conversation Mode uses [Red Dwarf](https://github.com/polis-community/red-dwarf), an open-source Python library, to map opinions and surface common ground. Prioritization Mode then lets participants compare proposals and identify what to focus on first. The table compares Agora with the standard Pol.is experience; features may differ in other deployments or forks.",
    featureLabel: "Feature",
    features: {
      openSource: "Open source",
      opinionMapping: "Opinion mapping and consensus building",
      llmLabels: "LLM labeling of opinion groups",
      wikiSurvey: "One-statement-at-a-time (wiki-survey) view",
      listView: "List view, forum-style",
      prioritization: "Prioritization: rank proposals after consensus",
      clusterCount: "Facilitator chooses the number of opinion clusters",
      clusterHistory: "Opinion clusters tracked over time",
      login: "Participant login",
      projectPage: "Branded project page",
      translation: "Multilingual translation",
      community: "Community network",
    },
    loginValues: [
      "✓ Anonymous and/or verified (email, phone or zero-knowledge proof)",
      "Anonymous by default",
    ],
    translationValues: ["✓ Built in, in the page", "Via Google Translate"],
  },
  fr: {
    question: "En quoi Agora diffère-t-il de Pol.is ?",
    answer:
      "Agora est conçu pour la prise de décision collective, de la recherche de consensus à l’identification de priorités communes. Agora s’inspire de Pol.is sans être un fork de l’application. Le mode Conversation utilise [Red Dwarf](https://github.com/polis-community/red-dwarf), une bibliothèque Python open source, pour cartographier les opinions et faire ressortir les points d’accord. Le mode Priorisation permet ensuite de comparer les propositions pour déterminer par quoi commencer. Le tableau compare Agora à l'expérience standard de Pol.is ; les fonctionnalités peuvent varier selon les déploiements ou les forks.",
    featureLabel: "Fonctionnalité",
    features: {
      openSource: "Open source",
      opinionMapping: "Cartographie des opinions et recherche de consensus",
      llmLabels: "Nommage des groupes d'opinion par LLM",
      wikiSurvey: "Vue une proposition à la fois (wiki-survey)",
      listView: "Vue en liste, de type forum",
      prioritization:
        "Priorisation : classer les propositions après le consensus",
      clusterCount: "Choix du nombre de groupes d'opinion par le facilitateur",
      clusterHistory: "Suivi des groupes d'opinion dans le temps",
      login: "Connexion des participants",
      projectPage: "Page de projet personnalisée",
      translation: "Traduction multilingue",
      community: "Réseau communautaire",
    },
    loginValues: [
      "✓ Anonyme et/ou vérifiée (e-mail, téléphone ou preuve à divulgation nulle de connaissance)",
      "Anonyme par défaut",
    ],
    translationValues: ["✓ Intégrée à la page", "Via Google Translate"],
  },
  es: {
    question: "¿En qué se diferencia Agora de Pol.is?",
    answer:
      "Agora está diseñado para la toma de decisiones colectiva, desde la búsqueda de consenso hasta la identificación de prioridades compartidas. Se inspira en Pol.is, pero no es una versión derivada de su aplicación. El modo Conversación utiliza [Red Dwarf](https://github.com/polis-community/red-dwarf), una biblioteca de Python de código abierto, para mapear opiniones y detectar puntos en común. Después, el modo Priorización permite comparar propuestas para decidir por dónde empezar. La tabla compara Agora con la experiencia estándar de Pol.is; las funciones pueden variar en otras instalaciones o forks.",
    featureLabel: "Función",
    features: {
      openSource: "Código abierto",
      opinionMapping: "Mapeo de opiniones y construcción de consenso",
      llmLabels: "Etiquetado de grupos de opinión mediante LLM",
      wikiSurvey: "Vista de una afirmación a la vez (wiki-survey)",
      listView: "Vista de lista, estilo foro",
      prioritization: "Priorización: ordenar propuestas tras el consenso",
      clusterCount: "El facilitador elige el número de grupos de opinión",
      clusterHistory: "Seguimiento de los grupos de opinión en el tiempo",
      login: "Acceso de participantes",
      projectPage: "Página de proyecto personalizada",
      translation: "Traducción multilingüe",
      community: "Red comunitaria",
    },
    loginValues: [
      "✓ Anónimo y/o verificado (correo, teléfono o prueba de conocimiento cero)",
      "Anónimo por defecto",
    ],
    translationValues: [
      "✓ Integrada en la página",
      "Mediante Google Translate",
    ],
  },
  ar: {
    question: "كيف تختلف Agora عن Pol.is؟",
    answer:
      "صُممت Agora لاتخاذ القرارات الجماعية، من بناء التوافق إلى تحديد الأولويات المشتركة. وهي تستلهم Pol.is، لكنها ليست نسخة متفرعة من تطبيقه. يستخدم وضع المحادثة [Red Dwarf](https://github.com/polis-community/red-dwarf)، وهي مكتبة مفتوحة المصدر بلغة Python، لرسم خريطة الآراء وإبراز نقاط الاتفاق. ويتيح وضع تحديد الأولويات للمشاركين بعد ذلك مقارنة المقترحات وتحديد ما ينبغي التركيز عليه أولًا. يقارن الجدول Agora بالتجربة القياسية لـ Pol.is؛ وقد تختلف الميزات في عمليات النشر أو النسخ المعدلة الأخرى.",
    featureLabel: "الميزة",
    features: {
      openSource: "مفتوحة المصدر",
      opinionMapping: "رسم خريطة الآراء وبناء الإجماع",
      llmLabels: "تسمية مجموعات الرأي بنموذج لغوي كبير",
      wikiSurvey: "عرض عبارة واحدة في كل مرة (wiki-survey)",
      listView: "عرض قائمة على نمط المنتديات",
      prioritization: "تحديد الأولويات: ترتيب المقترحات بعد الإجماع",
      clusterCount: "يختار الميسر عدد مجموعات الرأي",
      clusterHistory: "تتبع مجموعات الرأي بمرور الوقت",
      login: "تسجيل دخول المشاركين",
      projectPage: "صفحة مشروع بهوية مخصصة",
      translation: "ترجمة متعددة اللغات",
      community: "شبكة مجتمعية",
    },
    loginValues: [
      "✓ مجهول و/أو موثّق (بريد إلكتروني أو هاتف أو برهان معرفة صفرية)",
      "مجهول افتراضيًا",
    ],
    translationValues: ["✓ مدمجة في الصفحة", "عبر Google Translate"],
  },
  fa: {
    question: "Agora چه تفاوتی با Pol.is دارد؟",
    answer:
      "Agora برای تصمیم‌گیری جمعی طراحی شده است، از رسیدن به توافق تا شناسایی اولویت‌های مشترک. از Pol.is الهام گرفته، اما نسخه‌ای منشعب از برنامهٔ آن نیست. حالت گفت‌وگو از [Red Dwarf](https://github.com/polis-community/red-dwarf)، یک کتابخانهٔ متن‌باز پایتون، برای ترسیم نقشهٔ دیدگاه‌ها و آشکار کردن نقاط توافق استفاده می‌کند. سپس حالت اولویت‌بندی به شرکت‌کنندگان امکان می‌دهد پیشنهادها را مقایسه کنند و مشخص کنند ابتدا روی چه چیزی تمرکز کنند. جدول، Agora را با تجربه استاندارد Pol.is مقایسه می‌کند؛ امکانات در استقرارها یا نسخه‌های منشعب دیگر ممکن است متفاوت باشند.",
    featureLabel: "قابلیت",
    features: {
      openSource: "متن‌باز",
      opinionMapping: "نقشه‌برداری نظرها و ایجاد اجماع",
      llmLabels: "نام‌گذاری گروه‌های نظر با مدل زبانی بزرگ",
      wikiSurvey: "نمایش یک گزاره در هر مرحله (wiki-survey)",
      listView: "نمایش فهرستی به سبک انجمن",
      prioritization: "اولویت‌بندی: رتبه‌بندی پیشنهادها پس از اجماع",
      clusterCount: "انتخاب تعداد گروه‌های نظر توسط تسهیلگر",
      clusterHistory: "پیگیری گروه‌های نظر در طول زمان",
      login: "ورود شرکت‌کنندگان",
      projectPage: "صفحه پروژه با هویت بصری اختصاصی",
      translation: "ترجمه چندزبانه",
      community: "شبکه اجتماعی",
    },
    loginValues: [
      "✓ ناشناس و/یا تأییدشده (ایمیل، تلفن یا برهان دانش صفر)",
      "ناشناس به‌صورت پیش‌فرض",
    ],
    translationValues: ["✓ داخلی، در همان صفحه", "از طریق Google Translate"],
  },
  he: {
    question: "במה Agora שונה מ-Pol.is?",
    answer:
      "Agora נועדה לקבלת החלטות משותפת, מגיבוש הסכמה ועד לזיהוי סדרי עדיפויות משותפים. היא שואבת השראה מ־Pol.is, אך אינה גרסה נגזרת של האפליקציה. מצב שיחה משתמש ב־[Red Dwarf](https://github.com/polis-community/red-dwarf), ספריית Python בקוד פתוח, כדי למפות דעות ולחשוף נקודות הסכמה. לאחר מכן, מצב תעדוף מאפשר למשתתפים להשוות בין הצעות ולהבין במה כדאי להתמקד תחילה. הטבלה משווה את Agora לחוויה הסטנדרטית של Pol.is; התכונות עשויות להשתנות בהתקנות או בגרסאות נגזרות אחרות.",
    featureLabel: "תכונה",
    features: {
      openSource: "קוד פתוח",
      opinionMapping: "מיפוי דעות ובניית קונצנזוס",
      llmLabels: "מתן שמות לקבוצות דעה באמצעות מודל שפה גדול",
      wikiSurvey: "תצוגת אמירה אחת בכל פעם (wiki-survey)",
      listView: "תצוגת רשימה בסגנון פורום",
      prioritization: "תעדוף: דירוג הצעות לאחר קונצנזוס",
      clusterCount: "המנחה בוחר את מספר קבוצות הדעה",
      clusterHistory: "מעקב אחר קבוצות דעה לאורך זמן",
      login: "כניסת משתתפים",
      projectPage: "עמוד פרויקט ממותג",
      translation: "תרגום רב-לשוני",
      community: "רשת קהילתית",
    },
    loginValues: [
      "✓ אנונימית ו/או מאומתת (דוא״ל, טלפון או הוכחת אפס ידע)",
      "אנונימית כברירת מחדל",
    ],
    translationValues: ["✓ מובנה בתוך העמוד", "באמצעות Google Translate"],
  },
  ja: {
    question: "AgoraとPol.isはどう違いますか？",
    answer:
      "Agoraは、合意形成から共通の優先事項の特定まで、集団での意思決定を支援するために設計されています。Pol.isから着想を得ていますが、アプリそのものをフォークしたものではありません。会話モードでは、オープンソースのPythonライブラリ[Red Dwarf](https://github.com/polis-community/red-dwarf)を使って意見をマッピングし、共通点を明らかにします。優先順位付けモードでは、参加者が提案を比較し、何から取り組むべきかを見極めます。表はAgoraと標準的なPol.isを比較したもので、他の導入環境や派生版では機能が異なる場合があります。",
    featureLabel: "機能",
    features: {
      openSource: "オープンソース",
      opinionMapping: "意見マッピングと合意形成",
      llmLabels: "LLMによる意見グループの命名",
      wikiSurvey: "ステートメントを1つずつ表示（wiki-survey）",
      listView: "フォーラム形式の一覧表示",
      prioritization: "優先順位付け：合意後に提案を順位付け",
      clusterCount: "ファシリテーターが意見グループ数を選択",
      clusterHistory: "意見グループの変化を時系列で追跡",
      login: "参加者のログイン",
      projectPage: "ブランドに合わせたプロジェクトページ",
      translation: "多言語翻訳",
      community: "コミュニティネットワーク",
    },
    loginValues: [
      "✓ 匿名および／または認証済み（メール、電話、ゼロ知識証明）",
      "デフォルトは匿名",
    ],
    translationValues: ["✓ ページ内に組み込み", "Google Translate経由"],
  },
  "zh-hans": {
    question: "Agora 与 Pol.is 有何不同？",
    answer:
      "Agora 专为集体决策而设计，帮助群体从形成共识走向确定共同的优先事项。它受到 Pol.is 的启发，但不是 Pol.is 应用的分支。对话模式使用开源 Python 库 [Red Dwarf](https://github.com/polis-community/red-dwarf) 绘制意见图谱，找出共同点。随后，参与者可以在优先级排序模式中比较提案，确定首先要关注什么。下表将 Agora 与标准 Pol.is 体验进行比较；其他部署或分支版本的功能可能有所不同。",
    featureLabel: "功能",
    features: {
      openSource: "开源",
      opinionMapping: "意见地图与共识构建",
      llmLabels: "使用大语言模型为意见群体命名",
      wikiSurvey: "每次显示一条陈述（wiki-survey）",
      listView: "论坛式列表视图",
      prioritization: "优先级排序：共识后对提案排序",
      clusterCount: "引导者选择意见群体数量",
      clusterHistory: "追踪意见群体随时间的变化",
      login: "参与者登录",
      projectPage: "自定义品牌项目页面",
      translation: "多语言翻译",
      community: "社区网络",
    },
    loginValues: ["✓ 匿名和／或已验证（邮箱、电话或零知识证明）", "默认匿名"],
    translationValues: ["✓ 页面内置", "通过 Google Translate"],
  },
  "zh-hant": {
    question: "Agora 與 Pol.is 有何不同？",
    answer:
      "Agora 專為集體決策而設計，協助群體從形成共識走向確定共同的優先事項。它受到 Pol.is 的啟發，但不是 Pol.is 應用程式的分支。對話模式使用開放原始碼 Python 函式庫 [Red Dwarf](https://github.com/polis-community/red-dwarf) 繪製意見圖譜，找出共同點。接著，參與者可以在優先順序排序模式中比較提案，確定應先關注什麼。下表將 Agora 與標準 Pol.is 體驗進行比較；其他部署或分支版本的功能可能有所不同。",
    featureLabel: "功能",
    features: {
      openSource: "開源",
      opinionMapping: "意見地圖與共識建立",
      llmLabels: "使用大型語言模型為意見群體命名",
      wikiSurvey: "每次顯示一條陳述（wiki-survey）",
      listView: "論壇式清單檢視",
      prioritization: "優先順序排序：共識後對提案排序",
      clusterCount: "引導者選擇意見群體數量",
      clusterHistory: "追蹤意見群體隨時間的變化",
      login: "參與者登入",
      projectPage: "自訂品牌專案頁面",
      translation: "多語言翻譯",
      community: "社群網路",
    },
    loginValues: [
      "✓ 匿名和／或已驗證（電子郵件、電話或零知識證明）",
      "預設匿名",
    ],
    translationValues: ["✓ 頁面內建", "透過 Google Translate"],
  },
  ky: {
    question: "Agora Pol.isтен эмнеси менен айырмаланат?",
    answer:
      "Agora консенсуска келүүдөн жалпы артыкчылыктарды аныктоого чейинки жамааттык чечим кабыл алуу үчүн иштелип чыккан. Ал Pol.isтен шыктанган, бирок анын тиркемесинин өзгөртүлгөн нускасы эмес. Талкуу режими пикирлерди картага түшүрүп, жалпы негизди табуу үчүн Python тилиндеги ачык булактуу [Red Dwarf](https://github.com/polis-community/red-dwarf) китепканасын колдонот. Андан соң Артыкчылык берүү режими катышуучуларга сунуштарды салыштырып, биринчи эмнеге көңүл буруу керектигин аныктоого жардам берет. Таблица Agoraны Pol.isтин стандарттуу версиясы менен салыштырат; башка орнотууларда же өзгөртүлгөн версияларда мүмкүнчүлүктөр айырмаланышы мүмкүн.",
    featureLabel: "Мүмкүнчүлүк",
    features: {
      openSource: "Ачык булактуу",
      opinionMapping: "Пикирлерди картага түшүрүү жана консенсус түзүү",
      llmLabels: "LLM аркылуу пикир топторуна ат коюу",
      wikiSurvey: "Бир учурда бир пикир көрсөтүү (wiki-survey)",
      listView: "Форум сыяктуу тизме көрүнүшү",
      prioritization: "Артыкчылык берүү: консенсустан кийин сунуштарды иреттөө",
      clusterCount: "Фасилитатор пикир топторунун санын тандайт",
      clusterHistory: "Пикир топторун убакыт боюнча көзөмөлдөө",
      login: "Катышуучулардын кирүүсү",
      projectPage: "Брендге ылайыкташтырылган долбоор барагы",
      translation: "Көп тилдүү котормо",
      community: "Коомчулук тармагы",
    },
    loginValues: [
      "✓ Анонимдүү жана/же текшерилген (электрондук почта, телефон же нөлдүк билим далили)",
      "Демейкиде анонимдүү",
    ],
    translationValues: [
      "✓ Барактын ичинде орнотулган",
      "Google Translate аркылуу",
    ],
  },
  ru: {
    question: "Чем Agora отличается от Pol.is?",
    answer:
      "Agora создана для коллективного принятия решений — от поиска консенсуса до определения общих приоритетов. Она вдохновлена Pol.is, но не является ответвлением его приложения. В режиме обсуждения используется [Red Dwarf](https://github.com/polis-community/red-dwarf), библиотека Python с открытым исходным кодом, которая помогает картировать мнения и находить точки соприкосновения. Затем в режиме приоритизации участники могут сравнить предложения и определить, чему стоит уделить внимание в первую очередь. Таблица сравнивает Agora со стандартной версией Pol.is; в других установках или форках возможности могут отличаться.",
    featureLabel: "Возможность",
    features: {
      openSource: "Открытый исходный код",
      opinionMapping: "Картирование мнений и поиск консенсуса",
      llmLabels: "Названия групп мнений с помощью LLM",
      wikiSurvey: "Просмотр по одному высказыванию (wiki-survey)",
      listView: "Просмотр списка в стиле форума",
      prioritization:
        "Приоритизация: ранжирование предложений после консенсуса",
      clusterCount: "Фасилитатор выбирает число групп мнений",
      clusterHistory: "Отслеживание групп мнений во времени",
      login: "Вход участников",
      projectPage: "Брендированная страница проекта",
      translation: "Многоязычный перевод",
      community: "Сеть сообществ",
    },
    loginValues: [
      "✓ Анонимный и/или подтверждённый (почта, телефон или доказательство с нулевым разглашением)",
      "Анонимный по умолчанию",
    ],
    translationValues: ["✓ Встроен в страницу", "Через Google Translate"],
  },
};

export function getComparisonFaq(locale: Locale): FaqItem {
  const copy = comparisonCopyByLocale[locale];
  const features = copy.features;

  return {
    question: copy.question,
    answer: copy.answer,
    comparison: {
      firstColumnLabel: copy.featureLabel,
      columns: ["Agora", "Pol.is"],
      rows: [
        {
          feature: features.openSource,
          values: ["✓ AGPL-3.0 / MPL-2.0", "✓ AGPL-3.0"],
        },
        { feature: features.opinionMapping, values: ["✓", "✓"] },
        { feature: features.llmLabels, values: ["✓", "–"] },
        { feature: features.wikiSurvey, values: ["✓", "✓"] },
        { feature: features.listView, values: ["✓", "–"] },
        { feature: features.prioritization, values: ["✓", "–"] },
        { feature: features.clusterCount, values: ["✓", "–"] },
        { feature: features.clusterHistory, values: ["✓", "–"] },
        { feature: features.login, values: copy.loginValues },
        { feature: features.projectPage, values: ["✓", "–"] },
        { feature: features.translation, values: copy.translationValues },
        { feature: features.community, values: ["✓", "–"] },
      ],
    },
  };
}
