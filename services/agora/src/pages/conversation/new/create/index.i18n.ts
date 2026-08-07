import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface CreateConversationTranslations {
  importButton: string;
  nextButton: string;
  titlePlaceholder: string;
  titleRequired: string;
  bodyPlaceholder: string;
  activeImportMessage: string;
  viewImportStatus: string;
  githubConfig: string;
  githubRepository: string;
  githubRepositoryPlaceholder: string;
  githubLabel: string;
  githubLabelPlaceholder: string;
  organizationUnavailable: string;
  missingProjectCreateCapability: string;
  missingRequiredCsvFiles: string;
  csvImportError: string;
  polisImportError: string;
}

export const createConversationTranslations: Record<
  SupportedDisplayLanguageCodes,
  CreateConversationTranslations
> = {
  en: {
    importButton: "Import",
    nextButton: "Next",
    titlePlaceholder: "Title (required)",
    titleRequired: "Title is required to continue",
    bodyPlaceholder:
      "Body text. Provide context or relevant resources. Make sure it's aligned with the main question!",
    activeImportMessage:
      "You have an import in progress. Please wait for it to complete before starting a new one.",
    githubConfig: "GitHub Source",
    githubRepository: "Repository",
    githubRepositoryPlaceholder: "owner/repo",
    githubLabel: "Issue Label",
    githubLabelPlaceholder: "roadmap",
    organizationUnavailable:
      "The selected organization is no longer available.",
    missingProjectCreateCapability:
      "You do not have permission to create conversations in this organization's listed projects.",
    missingRequiredCsvFiles: "Missing required CSV files",
    csvImportError: "Error while importing conversation from CSV",
    polisImportError: "Error while trying to import conversation from Polis",
    viewImportStatus: "View Import Status",
  },
  ar: {
    importButton: "استيراد",
    nextButton: "التالي",
    titlePlaceholder: "العنوان (مطلوب)",
    titleRequired: "العنوان مطلوب للمتابعة",
    bodyPlaceholder:
      "نص المحتوى. قدم سياقاً أو موارد ذات صلة. تأكد من أنه متماشٍ مع السؤال الرئيسي!",
    activeImportMessage:
      "لديك عملية استيراد قيد التقدم. يرجى الانتظار حتى تكتمل قبل بدء عملية جديدة.",
    viewImportStatus: "عرض حالة الاستيراد",
    githubConfig: "مصدر GitHub",
    githubRepository: "المستودع",
    githubRepositoryPlaceholder: "owner/repo",
    githubLabel: "تسمية المشكلة",
    githubLabelPlaceholder: "roadmap",
    organizationUnavailable: "المؤسسة المحددة لم تعد متاحة.",
    missingProjectCreateCapability:
      "ليست لديك صلاحية إنشاء محادثات في المشاريع المدرجة لهذه المؤسسة.",
    missingRequiredCsvFiles: "ملفات CSV المطلوبة مفقودة",
    csvImportError: "حدث خطأ أثناء استيراد المحادثة من CSV",
    polisImportError: "حدث خطأ أثناء محاولة استيراد المحادثة من Polis",
  },
  es: {
    importButton: "Importar",
    nextButton: "Siguiente",
    titlePlaceholder: "Título (obligatorio)",
    titleRequired: "Se requiere título para continuar",
    bodyPlaceholder: "Agregue contexto o enlaces útiles",
    activeImportMessage:
      "Tiene una importación en progreso. Espere a que se complete antes de iniciar una nueva.",
    viewImportStatus: "Ver Estado de Importación",
    githubConfig: "Fuente de GitHub",
    githubRepository: "Repositorio",
    githubRepositoryPlaceholder: "owner/repo",
    githubLabel: "Etiqueta de incidencia",
    githubLabelPlaceholder: "roadmap",
    organizationUnavailable:
      "La organización seleccionada ya no está disponible.",
    missingProjectCreateCapability:
      "No tienes permiso para crear conversaciones en los proyectos listados de esta organización.",
    missingRequiredCsvFiles: "Faltan los archivos CSV obligatorios",
    csvImportError: "Error al importar la conversación desde CSV",
    polisImportError: "Error al intentar importar la conversación desde Polis",
  },
  fa: {
    importButton: "وارد کردن",
    nextButton: "بعدی",
    titlePlaceholder: "عنوان (الزامی)",
    titleRequired: "عنوان برای ادامه الزامی است",
    bodyPlaceholder:
      "متن بدنه. زمینه یا منابع مرتبط ارائه دهید. مطمئن شوید با سؤال اصلی هم‌راستاست!",
    activeImportMessage:
      "یک فرآیند وارد کردن در حال انجام است. لطفاً قبل از شروع فرآیند جدید صبر کنید تا تکمیل شود.",
    viewImportStatus: "مشاهده وضعیت وارد کردن",
    githubConfig: "منبع GitHub",
    githubRepository: "مخزن",
    githubRepositoryPlaceholder: "owner/repo",
    githubLabel: "برچسب ایشو",
    githubLabelPlaceholder: "roadmap",
    organizationUnavailable: "سازمان انتخاب‌شده دیگر در دسترس نیست.",
    missingProjectCreateCapability:
      "شما اجازه ایجاد گفتگو در پروژه‌های فهرست‌شده این سازمان را ندارید.",
    missingRequiredCsvFiles: "فایل‌های CSV الزامی موجود نیستند",
    csvImportError: "هنگام وارد کردن گفتگو از CSV خطایی رخ داد",
    polisImportError: "هنگام تلاش برای وارد کردن گفتگو از Polis خطایی رخ داد",
  },
  he: {
    importButton: "ייבוא",
    nextButton: "הבא",
    titlePlaceholder: "כותרת (חובה)",
    titleRequired: "נדרשת כותרת כדי להמשיך",
    bodyPlaceholder:
      "טקסט גוף. ספקו הקשר או משאבים רלוונטיים. וודאו שהוא מתאים לשאלה המרכזית!",
    activeImportMessage:
      "יש לכם ייבוא בתהליך. אנא המתינו לסיומו לפני שתתחילו ייבוא חדש.",
    viewImportStatus: "צפייה בסטטוס ייבוא",
    githubConfig: "מקור GitHub",
    githubRepository: "מאגר",
    githubRepositoryPlaceholder: "owner/repo",
    githubLabel: "תווית משימה",
    githubLabelPlaceholder: "roadmap",
    organizationUnavailable: "הארגון שנבחר אינו זמין עוד.",
    missingProjectCreateCapability:
      "אין לך הרשאה ליצור שיחות בפרויקטים הרשומים של הארגון הזה.",
    missingRequiredCsvFiles: "קובצי ה-CSV הנדרשים חסרים",
    csvImportError: "אירעה שגיאה בייבוא השיחה מ-CSV",
    polisImportError: "אירעה שגיאה בניסיון לייבא את השיחה מ-Polis",
  },
  fr: {
    importButton: "Importer",
    nextButton: "Suivant",
    titlePlaceholder: "Titre (obligatoire)",
    titleRequired: "Le titre est requis pour continuer",
    bodyPlaceholder: "Ajoutez du contexte ou des liens utiles",
    activeImportMessage:
      "Vous avez un import en cours. Veuillez attendre qu'il soit terminé avant d'en démarrer un nouveau.",
    viewImportStatus: "Voir l'État de l'Import",
    githubConfig: "Source GitHub",
    githubRepository: "Dépôt",
    githubRepositoryPlaceholder: "owner/repo",
    githubLabel: "Étiquette de l'issue",
    githubLabelPlaceholder: "roadmap",
    organizationUnavailable:
      "L'organisation sélectionnée n'est plus disponible.",
    missingProjectCreateCapability:
      "Vous n'avez pas l'autorisation de créer des conversations dans les projets listés de cette organisation.",
    missingRequiredCsvFiles: "Fichiers CSV requis manquants",
    csvImportError: "Erreur lors de l'import de la conversation depuis un CSV",
    polisImportError:
      "Erreur lors de la tentative d'import de la conversation depuis Polis",
  },
  "zh-Hans": {
    importButton: "导入",
    nextButton: "下一步",
    titlePlaceholder: "标题（必填）",
    titleRequired: "需要标题才能继续",
    bodyPlaceholder: "正文内容。提供背景或相关资源。确保与主要问题保持一致！",
    activeImportMessage: "您有一个正在进行的导入。请等待完成后再开始新的导入。",
    viewImportStatus: "查看导入状态",
    githubConfig: "GitHub 来源",
    githubRepository: "仓库",
    githubRepositoryPlaceholder: "owner/repo",
    githubLabel: "Issue 标签",
    githubLabelPlaceholder: "roadmap",
    organizationUnavailable: "所选组织已不可用。",
    missingProjectCreateCapability: "你无权在该组织列出的项目中创建对话。",
    missingRequiredCsvFiles: "缺少必需的 CSV 文件",
    csvImportError: "从 CSV 导入对话时出错",
    polisImportError: "尝试从 Polis 导入对话时出错",
  },
  "zh-Hant": {
    importButton: "匯入",
    nextButton: "下一步",
    titlePlaceholder: "標題（必填）",
    titleRequired: "需要標題才能繼續",
    bodyPlaceholder: "正文內容。提供背景或相關資源。確保與主要問題保持一致！",
    activeImportMessage: "您有一個正在進行的匯入。請等待完成後再開始新的匯入。",
    viewImportStatus: "查看匯入狀態",
    githubConfig: "GitHub 來源",
    githubRepository: "儲存庫",
    githubRepositoryPlaceholder: "owner/repo",
    githubLabel: "Issue 標籤",
    githubLabelPlaceholder: "roadmap",
    organizationUnavailable: "所選組織已無法使用。",
    missingProjectCreateCapability: "你沒有權限在此組織列出的專案中建立對話。",
    missingRequiredCsvFiles: "缺少必要的 CSV 檔案",
    csvImportError: "從 CSV 匯入對話時發生錯誤",
    polisImportError: "嘗試從 Polis 匯入對話時發生錯誤",
  },
  ja: {
    importButton: "インポート",
    nextButton: "次へ",
    titlePlaceholder: "タイトル（必須）",
    titleRequired: "続行するにはタイトルが必要です",
    bodyPlaceholder:
      "本文テキスト。背景や関連リソースを提供してください。メインの質問と一致していることを確認してください！",
    activeImportMessage:
      "インポートが進行中です。新しいインポートを開始する前に完了するまでお待ちください。",
    viewImportStatus: "インポート状態を表示",
    githubConfig: "GitHub ソース",
    githubRepository: "リポジトリ",
    githubRepositoryPlaceholder: "owner/repo",
    githubLabel: "Issue ラベル",
    githubLabelPlaceholder: "roadmap",
    organizationUnavailable: "選択した組織は利用できなくなりました。",
    missingProjectCreateCapability:
      "この組織の一覧掲載プロジェクトで会話を作成する権限がありません。",
    missingRequiredCsvFiles: "必要な CSV ファイルがありません",
    csvImportError: "CSV から会話をインポート中にエラーが発生しました",
    polisImportError:
      "Polis から会話をインポートしようとした際にエラーが発生しました",
  },
  ky: {
    importButton: "Импорттоо",
    nextButton: "Кийинки",
    titlePlaceholder: "Аталыш (милдеттүү)",
    titleRequired: "Улантуу үчүн аталыш талап кылынат",
    bodyPlaceholder:
      "Негизги текст. Контекст же тиешелүү ресурстарды бериңиз. Негизги суроого шайкеш экенин текшериңиз!",
    activeImportMessage:
      "Импорт жүрүп жатат. Жаңысын баштоодон мурун аяктаганча күтүңүз.",
    viewImportStatus: "Импорттун абалын көрүү",
    githubConfig: "GitHub булагы",
    githubRepository: "Репозиторий",
    githubRepositoryPlaceholder: "owner/repo",
    githubLabel: "Маселенин энбелгиси",
    githubLabelPlaceholder: "roadmap",
    organizationUnavailable: "Тандалган уюм жеткиликтүү эмес.",
    missingProjectCreateCapability:
      "Бул уюмдун тизмеленген долбоорлорунда талкуу түзүүгө уруксатыңыз жок.",
    missingRequiredCsvFiles: "Талап кылынган CSV файлдары жетишпейт",
    csvImportError: "CSV файлынан талкууну импорттоодо ката кетти",
    polisImportError: "Polis'тен талкууну импорттоо аракетинде ката кетти",
  },
  ru: {
    importButton: "Импорт",
    nextButton: "Далее",
    titlePlaceholder: "Заголовок (обязательно)",
    titleRequired: "Для продолжения необходим заголовок",
    bodyPlaceholder:
      "Основной текст. Предоставьте контекст или полезные ресурсы. Убедитесь, что он соответствует главному вопросу!",
    activeImportMessage:
      "Импорт выполняется. Пожалуйста, дождитесь его завершения перед началом нового.",
    viewImportStatus: "Просмотреть статус импорта",
    githubConfig: "Источник: GitHub",
    githubRepository: "Репозиторий",
    githubRepositoryPlaceholder: "owner/repo",
    githubLabel: "Метка задачи",
    githubLabelPlaceholder: "roadmap",
    organizationUnavailable: "Выбранная организация больше недоступна.",
    missingProjectCreateCapability:
      "У вас нет разрешения создавать обсуждения в перечисленных проектах этой организации.",
    missingRequiredCsvFiles: "Отсутствуют обязательные CSV-файлы",
    csvImportError: "Ошибка при импорте обсуждения из CSV",
    polisImportError: "Ошибка при попытке импортировать обсуждение из Polis",
  },
};
