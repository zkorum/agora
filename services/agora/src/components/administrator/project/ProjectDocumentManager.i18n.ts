import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ProjectDocumentManagerTranslations {
  title: string;
  description: string;
  publicationWarningTitle: string;
  publicationWarningBody: string;
  chooseFilesTitle: string;
  chooseFilesDescription: string;
  participantFileLabel: string;
  participantFileHint: string;
  ownerFileLabel: string;
  ownerFileHint: string;
  dropFile: string;
  removeFile: string;
  detailsTitle: string;
  detailsDescription: string;
  defaultLanguageLabel: string;
  nameLabel: string;
  downloadFileNameLabel: string;
  additionalNamesTitle: string;
  languageLabel: string;
  addName: string;
  upload: string;
  remove: string;
  empty: string;
  allowedFormats: string;
  uploadComplete: string;
  uploadFailed: string;
  deleteComplete: string;
  deleteFailed: string;
  ownerVersionAvailable: string;
  invalidFile: string;
  invalidName: string;
  mismatchedFiles: string;
  invalidDownloadFileName: string;
  loadFailed: string;
  retry: string;
  deleteTitle: string;
  deleteMessage: string;
  cancel: string;
}

const en: ProjectDocumentManagerTranslations = {
  title: "Project documents",
  description:
    "Upload participant versions available to everyone and optional private facilitator versions, and provide a display name in each relevant language.",
  publicationWarningTitle: "Review before publishing",
  publicationWarningBody:
    "Participant files are downloadable. Do not include names, contact details, account or participant identifiers, raw votes or survey responses, small demographic groups, secrets, or hidden unsuppressed data. Interactive HTML runs the uploaded scripts in an isolated frame; upload only trusted, self-contained reports. External resources and network APIs are blocked. Apply the same care to private facilitator files.",
  chooseFilesTitle: "Choose files",
  chooseFilesDescription:
    "The participant file is required and available to everyone. The optional facilitator file is an additional version available only to project facilitators. Both files must use the same format.",
  participantFileLabel: "Participant download (required)",
  participantFileHint:
    "The privacy-safe version available to everyone, even when a facilitator version is also provided.",
  ownerFileLabel: "Facilitator download (optional)",
  ownerFileHint:
    "An additional private version available only to project facilitators. Facilitators can open and download both versions; participants never receive this file.",
  dropFile: "Drag and drop or click to browse files",
  removeFile: "Remove selected file",
  detailsTitle: "Document details",
  detailsDescription:
    "The display name appears in Agora. The download filename is the name saved to a person's device.",
  defaultLanguageLabel: "Default name language",
  nameLabel: "Display name",
  downloadFileNameLabel: "Download filename",
  additionalNamesTitle: "Names in other languages",
  languageLabel: "Language",
  addName: "Add translated name",
  upload: "Upload document",
  remove: "Remove",
  empty: "No documents have been uploaded.",
  allowedFormats:
    "HTML, PDF, plain text, Markdown, CSV, and JSON. Maximum {size} MB.",
  uploadComplete: "Document uploaded",
  uploadFailed: "Document upload failed",
  deleteComplete: "Document removed",
  deleteFailed: "Document could not be removed",
  ownerVersionAvailable: "Private facilitator version included",
  invalidFile: "Choose a non-empty file in one of the supported formats.",
  invalidName: "Enter a document name for every language.",
  mismatchedFiles:
    "Participant and facilitator files must use the same extension.",
  invalidDownloadFileName:
    "Every downloaded filename must preserve the uploaded file extension.",
  loadFailed: "Documents could not be loaded.",
  retry: "Retry",
  deleteTitle: "Remove document?",
  deleteMessage: "This removes both participant and facilitator versions.",
  cancel: "Cancel",
};

export const projectDocumentManagerTranslations: Readonly<
  Record<SupportedDisplayLanguageCodes, ProjectDocumentManagerTranslations>
> = {
  en,
  es: {
    ...en,
    title: "Documentos del proyecto",
    description:
      "Suba versiones para participantes disponibles para todo el mundo y versiones privadas opcionales para facilitadores, e indique un nombre en cada idioma pertinente.",
    publicationWarningTitle: "Revise antes de publicar",
    publicationWarningBody:
      "Los archivos para participantes se pueden descargar. No incluya nombres, datos de contacto, identificadores de cuenta o participante, votos o respuestas sin agregar, grupos demográficos pequeños, secretos ni datos ocultos sin anonimizar. El HTML interactivo ejecuta los scripts subidos en un marco aislado; suba solo informes autónomos de confianza. Se bloquean los recursos externos y las API de red. Aplique el mismo cuidado a los archivos privados para facilitadores.",
    chooseFilesDescription:
      "El archivo para participantes es obligatorio y está disponible para todo el mundo. El archivo opcional para facilitadores es una versión adicional disponible únicamente para quienes facilitan el proyecto. Ambos archivos deben usar el mismo formato.",
    participantFileLabel: "Archivo anonimizado para participantes",
    participantFileHint:
      "La versión preparada para proteger la privacidad y disponible para todo el mundo, incluso si también se proporciona una versión para facilitadores.",
    ownerFileLabel: "Archivo privado para facilitadores (opcional)",
    ownerFileHint:
      "Una versión privada adicional, disponible únicamente para quienes facilitan el proyecto. Estas personas pueden acceder a ambas versiones; los participantes nunca reciben este archivo.",
    defaultLanguageLabel: "Idioma predeterminado del nombre",
    nameLabel: "Nombre del documento",
    downloadFileNameLabel: "Nombre del archivo descargado",
    additionalNamesTitle: "Nombres en otros idiomas",
    languageLabel: "Idioma",
    addName: "Añadir nombre traducido",
    upload: "Subir documento",
    remove: "Eliminar",
    empty: "No se ha subido ningún documento.",
    allowedFormats: "HTML, PDF, texto, Markdown, CSV y JSON. Máximo {size} MB.",
    uploadComplete: "Documento subido",
    uploadFailed: "Error al subir el documento",
    deleteComplete: "Documento eliminado",
    deleteFailed: "No se pudo eliminar el documento",
    ownerVersionAvailable: "Incluye una versión privada para facilitadores",
    invalidFile: "Elija un archivo no vacío en un formato compatible.",
    invalidName: "Indique un nombre para el documento en cada idioma.",
    mismatchedFiles:
      "Los archivos para participantes y facilitadores deben usar la misma extensión.",
    invalidDownloadFileName:
      "Cada nombre de descarga debe conservar la extensión del archivo.",
    loadFailed: "No se pudieron cargar los documentos.",
    retry: "Reintentar",
    deleteTitle: "¿Eliminar el documento?",
    deleteMessage:
      "Se eliminarán las versiones para participantes y facilitadores.",
    cancel: "Cancelar",
  },
  fr: {
    ...en,
    title: "Documents du projet",
    description:
      "Importez des versions participants accessibles à tout le monde et, si nécessaire, des versions privées pour les facilitateurs, puis indiquez un nom dans chaque langue utile.",
    publicationWarningTitle: "Vérifier avant publication",
    publicationWarningBody:
      "Les fichiers participants sont téléchargeables. N'incluez pas de noms, coordonnées, identifiants de compte ou de participant, votes ou réponses bruts, petits groupes démographiques, secrets ou données masquées non anonymisées. Le HTML interactif exécute les scripts importés dans un cadre isolé ; importez uniquement des rapports autonomes fiables. Les ressources externes et les API réseau sont bloquées. Appliquez les mêmes précautions aux fichiers privés destinés aux facilitateurs.",
    chooseFilesDescription:
      "Le fichier participants est obligatoire et accessible à tout le monde. Le fichier facultatif pour les facilitateurs est une version supplémentaire réservée aux facilitateurs du projet. Les deux fichiers doivent avoir le même format.",
    participantFileLabel: "Fichier anonymisé pour les participants",
    participantFileHint:
      "La version respectueuse de la vie privée accessible à tout le monde, même lorsqu'une version pour les facilitateurs est également fournie.",
    ownerFileLabel: "Fichier privé pour les facilitateurs (facultatif)",
    ownerFileHint:
      "Une version privée supplémentaire réservée aux facilitateurs du projet. Ceux-ci ont accès aux deux versions ; les participants ne reçoivent jamais ce fichier.",
    defaultLanguageLabel: "Langue principale du nom",
    nameLabel: "Nom du document",
    downloadFileNameLabel: "Nom du fichier téléchargé",
    additionalNamesTitle: "Noms dans d'autres langues",
    languageLabel: "Langue",
    addName: "Ajouter un nom traduit",
    upload: "Importer le document",
    remove: "Supprimer",
    empty: "Aucun document n'a été importé.",
    allowedFormats:
      "HTML, PDF, texte, Markdown, CSV et JSON. Maximum {size} Mo.",
    uploadComplete: "Document importé",
    uploadFailed: "Échec de l'importation du document",
    deleteComplete: "Document supprimé",
    deleteFailed: "Le document n'a pas pu être supprimé",
    ownerVersionAvailable: "Version privée pour les facilitateurs incluse",
    invalidFile: "Choisissez un fichier non vide dans un format accepté.",
    invalidName: "Saisissez un nom de document pour chaque langue.",
    mismatchedFiles:
      "Les fichiers participants et facilitateurs doivent avoir la même extension.",
    invalidDownloadFileName:
      "Chaque nom de téléchargement doit conserver l'extension du fichier.",
    loadFailed: "Les documents n'ont pas pu être chargés.",
    retry: "Réessayer",
    deleteTitle: "Supprimer le document ?",
    deleteMessage:
      "Les versions participants et facilitateurs seront supprimées.",
    cancel: "Annuler",
  },
  "zh-Hant": {
    ...en,
    title: "專案文件",
    description:
      "上傳所有人皆可存取的參與者版本和選填的引導員私人版本，並為每種相關語言提供顯示名稱。",
    publicationWarningTitle: "發布前請檢查",
    publicationWarningBody:
      "參與者檔案可供下載。請勿包含姓名、聯絡資料、帳戶或參與者識別碼、原始投票或問卷回覆、小型人口群組、密鑰或未經匿名化的隱藏資料。互動式 HTML 會在隔離框架中執行上傳的腳本；請只上傳可信且自包含的報告。外部資源與網路 API 會被封鎖。引導員私人檔案也應採取相同標準。",
    chooseFilesDescription:
      "參與者檔案為必填項目，所有人皆可存取。選填的引導員檔案是僅供專案引導員存取的附加版本。兩個檔案必須使用相同格式。",
    participantFileLabel: "參與者匿名化檔案",
    participantFileHint:
      "這是保護隱私且所有人皆可存取的版本，即使同時提供引導員版本也不例外。",
    ownerFileLabel: "引導員私人檔案（選填）",
    ownerFileHint:
      "僅供專案引導員存取的附加私人版本。引導員可存取兩個版本；參與者不會收到此檔案。",
    defaultLanguageLabel: "預設名稱語言",
    nameLabel: "文件名稱",
    downloadFileNameLabel: "下載檔名",
    additionalNamesTitle: "其他語言名稱",
    languageLabel: "語言",
    addName: "新增翻譯名稱",
    upload: "上傳文件",
    remove: "移除",
    empty: "尚未上傳文件。",
    allowedFormats:
      "HTML、PDF、純文字、Markdown、CSV 與 JSON。上限 {size} MB。",
    uploadComplete: "文件已上傳",
    uploadFailed: "文件上傳失敗",
    deleteComplete: "文件已移除",
    deleteFailed: "無法移除文件",
    ownerVersionAvailable: "包含引導員私人版本",
    invalidFile: "請選擇支援格式的非空白檔案。",
    invalidName: "請為每種語言輸入文件名稱。",
    mismatchedFiles: "參與者檔案和引導員檔案必須使用相同副檔名。",
    invalidDownloadFileName: "每個下載檔名都必須保留上傳檔案的副檔名。",
    loadFailed: "無法載入文件。",
    retry: "重試",
    deleteTitle: "移除文件？",
    deleteMessage: "這將移除參與者版本和引導員版本。",
    cancel: "取消",
  },
  "zh-Hans": {
    ...en,
    title: "项目文档",
    description:
      "上传所有人均可访问的参与者版本和可选的引导员私密版本，并为每种相关语言提供显示名称。",
    publicationWarningTitle: "发布前请检查",
    publicationWarningBody:
      "参与者文件可供下载。请勿包含姓名、联系方式、账户或参与者标识、原始投票或问卷回答、小型人口群体、密钥或未经匿名化的隐藏数据。交互式 HTML 会在隔离框架中运行上传的脚本；请仅上传可信且自包含的报告。外部资源和网络 API 会被阻止。引导员私密文件也应遵循相同标准。",
    chooseFilesDescription:
      "参与者文件为必填项，所有人均可访问。可选的引导员文件是仅供项目引导员访问的附加版本。两个文件必须使用相同格式。",
    participantFileLabel: "参与者匿名化文件",
    participantFileHint:
      "这是保护隐私且所有人均可访问的版本，即使同时提供引导员版本也不例外。",
    ownerFileLabel: "引导员私密文件（选填）",
    ownerFileHint:
      "仅供项目引导员访问的附加私密版本。引导员可访问两个版本；参与者不会收到此文件。",
    defaultLanguageLabel: "默认名称语言",
    nameLabel: "文档名称",
    downloadFileNameLabel: "下载文件名",
    additionalNamesTitle: "其他语言名称",
    languageLabel: "语言",
    addName: "添加翻译名称",
    upload: "上传文档",
    remove: "移除",
    empty: "尚未上传文档。",
    allowedFormats:
      "HTML、PDF、纯文本、Markdown、CSV 和 JSON。上限 {size} MB。",
    uploadComplete: "文档已上传",
    uploadFailed: "文档上传失败",
    deleteComplete: "文档已移除",
    deleteFailed: "无法移除文档",
    ownerVersionAvailable: "包含引导员私密版本",
    invalidFile: "请选择受支持格式的非空文件。",
    invalidName: "请为每种语言输入文档名称。",
    mismatchedFiles: "参与者文件和引导员文件必须使用相同扩展名。",
    invalidDownloadFileName: "每个下载文件名都必须保留上传文件的扩展名。",
    loadFailed: "无法加载文档。",
    retry: "重试",
    deleteTitle: "移除文档？",
    deleteMessage: "这将移除参与者版本和引导员版本。",
    cancel: "取消",
  },
  ja: {
    ...en,
    title: "プロジェクト文書",
    description:
      "誰でも利用できる参加者版と、任意の非公開ファシリテーター版をアップロードし、必要な言語ごとに表示名を設定します。",
    publicationWarningTitle: "公開前に確認",
    publicationWarningBody:
      "参加者向けファイルはダウンロードできます。氏名、連絡先、アカウントや参加者の識別子、生の投票や調査回答、少人数の属性グループ、秘密情報、匿名化されていない非表示データを含めないでください。対話型 HTML は隔離されたフレーム内でアップロードされたスクリプトを実行します。信頼できる自己完結型レポートのみを使用してください。外部リソースとネットワーク API は遮断されます。ファシリテーター向け非公開ファイルにも同じ注意が必要です。",
    chooseFilesDescription:
      "参加者向けファイルは必須で、誰でも利用できます。任意のファシリテーター向けファイルは、プロジェクトのファシリテーターのみが利用できる追加版です。両方のファイルで同じ形式を使用してください。",
    participantFileLabel: "参加者向け匿名化ファイル",
    participantFileHint:
      "ファシリテーター版も提供されている場合を含め、誰でも利用できる、プライバシーに配慮した版です。",
    ownerFileLabel: "ファシリテーター向け非公開ファイル（任意）",
    ownerFileHint:
      "プロジェクトのファシリテーターのみが利用できる追加の非公開版です。ファシリテーターは両方の版を利用できますが、参加者にこのファイルが提供されることはありません。",
    defaultLanguageLabel: "既定の名前の言語",
    nameLabel: "文書名",
    downloadFileNameLabel: "ダウンロードファイル名",
    additionalNamesTitle: "他の言語での名前",
    languageLabel: "言語",
    addName: "翻訳名を追加",
    upload: "文書をアップロード",
    remove: "削除",
    empty: "文書はまだありません。",
    allowedFormats:
      "HTML、PDF、プレーンテキスト、Markdown、CSV、JSON。最大 {size} MB。",
    uploadComplete: "文書をアップロードしました",
    uploadFailed: "文書のアップロードに失敗しました",
    deleteComplete: "文書を削除しました",
    deleteFailed: "文書を削除できませんでした",
    ownerVersionAvailable: "ファシリテーター向け非公開版あり",
    invalidFile: "対応形式の空でないファイルを選択してください。",
    invalidName: "各言語の文書名を入力してください。",
    mismatchedFiles:
      "参加者向けファイルとファシリテーター向けファイルでは、同じ拡張子を使用してください。",
    invalidDownloadFileName:
      "すべてのダウンロード名でアップロードした拡張子を維持してください。",
    loadFailed: "文書を読み込めませんでした。",
    retry: "再試行",
    deleteTitle: "文書を削除しますか？",
    deleteMessage: "参加者版とファシリテーター版の両方が削除されます。",
    cancel: "キャンセル",
  },
  ar: {
    ...en,
    title: "مستندات المشروع",
    description:
      "ارفع نسخ المشاركين المتاحة للجميع ونسخ الميسّرين الخاصة الاختيارية، وأضف اسم عرض بكل لغة ذات صلة.",
    publicationWarningTitle: "راجع قبل النشر",
    publicationWarningBody:
      "يمكن تنزيل ملفات المشاركين. لا تُضمّن أسماء أو بيانات اتصال أو معرّفات حسابات أو مشاركين أو أصواتًا أو إجابات خامًا أو مجموعات سكانية صغيرة أو أسرارًا أو بيانات مخفية غير منقحة. يشغّل HTML التفاعلي البرامج النصية المرفوعة داخل إطار معزول؛ ارفع فقط تقارير موثوقة ومكتفية ذاتيًا. تُحظر الموارد الخارجية وواجهات الشبكة. طبّق العناية نفسها على ملفات الميسّرين الخاصة.",
    chooseFilesDescription:
      "ملف المشاركين مطلوب ومتاح للجميع. ملف الميسّرين الاختياري هو نسخة إضافية لا تتاح إلا لميسّري المشروع. يجب أن يستخدم الملفان التنسيق نفسه.",
    participantFileLabel: "ملف منقح للمشاركين",
    participantFileHint:
      "النسخة الآمنة من ناحية الخصوصية والمتاحة للجميع، حتى عند توفير نسخة للميسّرين أيضًا.",
    ownerFileLabel: "ملف خاص بالميسّرين (اختياري)",
    ownerFileHint:
      "نسخة خاصة إضافية لميسّري المشروع فقط. يمكن للميسّرين الوصول إلى النسختين، ولا يتلقى المشاركون هذا الملف أبدًا.",
    defaultLanguageLabel: "لغة الاسم الافتراضية",
    nameLabel: "اسم المستند",
    downloadFileNameLabel: "اسم الملف عند التنزيل",
    additionalNamesTitle: "الأسماء بلغات أخرى",
    languageLabel: "اللغة",
    addName: "إضافة اسم مترجم",
    upload: "رفع المستند",
    remove: "إزالة",
    empty: "لم تُرفع أي مستندات.",
    allowedFormats:
      "HTML وPDF ونص عادي وMarkdown وCSV وJSON. الحد الأقصى {size} ميغابايت.",
    uploadComplete: "تم رفع المستند",
    uploadFailed: "فشل رفع المستند",
    deleteComplete: "تمت إزالة المستند",
    deleteFailed: "تعذرت إزالة المستند",
    ownerVersionAvailable: "توجد نسخة خاصة للميسّرين",
    invalidFile: "اختر ملفًا غير فارغ بأحد التنسيقات المدعومة.",
    invalidName: "أدخل اسمًا للمستند بكل لغة.",
    mismatchedFiles:
      "يجب أن يستخدم ملف المشاركين وملف الميسّرين الامتداد نفسه.",
    invalidDownloadFileName: "يجب أن يحتفظ كل اسم تنزيل بامتداد الملف المرفوع.",
    loadFailed: "تعذر تحميل المستندات.",
    retry: "إعادة المحاولة",
    deleteTitle: "إزالة المستند؟",
    deleteMessage: "سيؤدي هذا إلى إزالة نسختي المشاركين والميسّرين.",
    cancel: "إلغاء",
  },
  fa: {
    ...en,
    title: "اسناد پروژه",
    description:
      "نسخه‌های شرکت‌کنندگان را که برای همه در دسترس‌اند و نسخه‌های خصوصی و اختیاری تسهیل‌گران را بارگذاری کنید و برای هر زبان مرتبط نام نمایشی وارد کنید.",
    publicationWarningTitle: "پیش از انتشار بررسی کنید",
    publicationWarningBody:
      "فایل‌های شرکت‌کنندگان قابل دانلود هستند. نام، اطلاعات تماس، شناسه حساب یا شرکت‌کننده، رأی یا پاسخ خام، گروه‌های جمعیتی کوچک، اطلاعات محرمانه یا داده پنهان پالایش‌نشده را وارد نکنید. HTML تعاملی اسکریپت‌های بارگذاری‌شده را در یک قاب جداگانه اجرا می‌کند؛ فقط گزارش‌های مستقل و قابل اعتماد را بارگذاری کنید. منابع خارجی و APIهای شبکه مسدود هستند. همین دقت را برای فایل‌های خصوصی تسهیل‌گران نیز به کار ببرید.",
    chooseFilesDescription:
      "فایل شرکت‌کنندگان الزامی و برای همه در دسترس است. فایل اختیاری تسهیل‌گران نسخه‌ای اضافی است که فقط تسهیل‌گران پروژه به آن دسترسی دارند. هر دو فایل باید قالب یکسانی داشته باشند.",
    participantFileLabel: "فایل پالایش‌شده شرکت‌کنندگان",
    participantFileHint:
      "نسخه‌ای ایمن از نظر حریم خصوصی که برای همه در دسترس است، حتی اگر نسخه تسهیل‌گران نیز ارائه شده باشد.",
    ownerFileLabel: "فایل خصوصی تسهیل‌گران (اختیاری)",
    ownerFileHint:
      "نسخه‌ای خصوصی و اضافی که فقط برای تسهیل‌گران پروژه در دسترس است. تسهیل‌گران به هر دو نسخه دسترسی دارند؛ شرکت‌کنندگان هرگز این فایل را دریافت نمی‌کنند.",
    defaultLanguageLabel: "زبان پیش‌فرض نام",
    nameLabel: "نام سند",
    downloadFileNameLabel: "نام فایل دانلودی",
    additionalNamesTitle: "نام‌ها به زبان‌های دیگر",
    languageLabel: "زبان",
    addName: "افزودن نام ترجمه‌شده",
    upload: "بارگذاری سند",
    remove: "حذف",
    empty: "هنوز سندی بارگذاری نشده است.",
    allowedFormats:
      "HTML، PDF، متن ساده، Markdown، CSV و JSON. حداکثر {size} مگابایت.",
    uploadComplete: "سند بارگذاری شد",
    uploadFailed: "بارگذاری سند ناموفق بود",
    deleteComplete: "سند حذف شد",
    deleteFailed: "سند حذف نشد",
    ownerVersionAvailable: "نسخه خصوصی تسهیل‌گران موجود است",
    invalidFile: "یک فایل غیرخالی با قالب پشتیبانی‌شده انتخاب کنید.",
    invalidName: "برای هر زبان نام سند را وارد کنید.",
    mismatchedFiles:
      "فایل‌های شرکت‌کنندگان و تسهیل‌گران باید پسوند یکسانی داشته باشند.",
    invalidDownloadFileName:
      "هر نام دانلود باید پسوند فایل بارگذاری‌شده را حفظ کند.",
    loadFailed: "اسناد بارگیری نشدند.",
    retry: "تلاش دوباره",
    deleteTitle: "سند حذف شود؟",
    deleteMessage: "نسخه‌های شرکت‌کنندگان و تسهیل‌گران حذف خواهند شد.",
    cancel: "لغو",
  },
  he: {
    ...en,
    title: "מסמכי הפרויקט",
    description:
      "העלאת גרסאות למשתתפים הזמינות לכולם וגרסאות פרטיות אופציונליות למנחים, ומתן שם תצוגה בכל שפה רלוונטית.",
    publicationWarningTitle: "בדיקה לפני פרסום",
    publicationWarningBody:
      "קובצי המשתתפים ניתנים להורדה. אין לכלול שמות, פרטי קשר, מזהי חשבון או משתתף, הצבעות או תשובות גולמיות, קבוצות דמוגרפיות קטנות, סודות או נתונים מוסתרים שלא עברו הסרה. HTML אינטראקטיבי מריץ את הסקריפטים שהועלו במסגרת מבודדת; יש להעלות רק דוחות עצמאיים ממקור מהימן. משאבים חיצוניים וממשקי רשת חסומים. יש לנקוט אותה זהירות בקבצים הפרטיים למנחים.",
    chooseFilesDescription:
      "קובץ המשתתפים הוא חובה וזמין לכולם. קובץ המנחים האופציונלי הוא גרסה נוספת הזמינה רק למנחי הפרויקט. שני הקבצים חייבים להיות באותו פורמט.",
    participantFileLabel: "קובץ מצונזר למשתתפים",
    participantFileHint:
      "גרסה השומרת על הפרטיות וזמינה לכולם, גם אם מסופקת גם גרסה למנחים.",
    ownerFileLabel: "קובץ פרטי למנחים (אופציונלי)",
    ownerFileHint:
      "גרסה פרטית נוספת הזמינה רק למנחי הפרויקט. למנחים יש גישה לשתי הגרסאות; המשתתפים לעולם אינם מקבלים את הקובץ הזה.",
    defaultLanguageLabel: "שפת ברירת המחדל של השם",
    nameLabel: "שם המסמך",
    downloadFileNameLabel: "שם הקובץ בהורדה",
    additionalNamesTitle: "שמות בשפות אחרות",
    languageLabel: "שפה",
    addName: "הוספת שם מתורגם",
    upload: "העלאת מסמך",
    remove: "הסרה",
    empty: "טרם הועלו מסמכים.",
    allowedFormats: "HTML, PDF, טקסט פשוט, Markdown, CSV ו-JSON. עד {size} MB.",
    uploadComplete: "המסמך הועלה",
    uploadFailed: "העלאת המסמך נכשלה",
    deleteComplete: "המסמך הוסר",
    deleteFailed: "לא ניתן להסיר את המסמך",
    ownerVersionAvailable: "כלולה גרסה פרטית למנחים",
    invalidFile: "יש לבחור קובץ שאינו ריק באחד הפורמטים הנתמכים.",
    invalidName: "יש להזין שם מסמך לכל שפה.",
    mismatchedFiles: "קובצי המשתתפים והמנחים חייבים להשתמש באותה סיומת.",
    invalidDownloadFileName: "כל שם להורדה חייב לשמור על סיומת הקובץ שהועלה.",
    loadFailed: "לא ניתן לטעון את המסמכים.",
    retry: "ניסיון חוזר",
    deleteTitle: "להסיר את המסמך?",
    deleteMessage: "הפעולה תסיר את גרסאות המשתתפים והמנחים.",
    cancel: "ביטול",
  },
  ky: {
    ...en,
    title: "Долбоордун документтери",
    description:
      "Баарына жеткиликтүү катышуучу версияларын жана фасилитаторлор үчүн милдеттүү эмес купуя версияларды жүктөп, керектүү тилдерде көрсөтүлүүчү аталышын бериңиз.",
    publicationWarningTitle: "Жарыялоодон мурун текшериңиз",
    publicationWarningBody:
      "Катышуучулардын файлдарын жүктөп алууга болот. Аты-жөндөрдү, байланыш маалыматтарын, аккаунт же катышуучу идентификаторлорун, чийки добуштарды же сурамжылоо жоопторун, чакан демографиялык топторду, сырларды же жашырылган тазаланбаган маалыматтарды кошпоңуз. Интерактивдүү HTML жүктөлгөн скрипттерди обочолонгон алкакта иштетет; ишенимдүү жана өз алдынча отчетторду гана жүктөңүз. Тышкы ресурстар жана тармак API'лери бөгөттөлөт. Фасилитаторлордун купуя файлдарына да ушундай талап коюңуз.",
    chooseFilesDescription:
      "Катышуучулар үчүн файл милдеттүү жана баарына жеткиликтүү. Милдеттүү эмес фасилитатор файлы долбоордун фасилитаторлоруна гана жеткиликтүү болгон кошумча версия. Эки файл тең бирдей форматта болушу керек.",
    participantFileLabel: "Катышуучулар үчүн анонимдештирилген файл",
    participantFileHint:
      "Купуялуулукту коргогон жана баарына жеткиликтүү версия, фасилитаторлор үчүн версия да берилген учурда дагы.",
    ownerFileLabel: "Фасилитаторлор үчүн купуя файл (милдеттүү эмес)",
    ownerFileHint:
      "Долбоордун фасилитаторлоруна гана жеткиликтүү кошумча купуя версия. Фасилитаторлор эки версияга тең кире алышат; катышуучулар бул файлды эч качан алышпайт.",
    defaultLanguageLabel: "Аталыштын негизги тили",
    nameLabel: "Документтин аталышы",
    downloadFileNameLabel: "Жүктөлүүчү файлдын аталышы",
    additionalNamesTitle: "Башка тилдердеги аталыштар",
    languageLabel: "Тил",
    addName: "Которулган аталышты кошуу",
    upload: "Документти жүктөө",
    remove: "Өчүрүү",
    empty: "Документтер жүктөлө элек.",
    allowedFormats:
      "HTML, PDF, жөнөкөй текст, Markdown, CSV жана JSON. Эң көбү {size} МБ.",
    uploadComplete: "Документ жүктөлдү",
    uploadFailed: "Документ жүктөлгөн жок",
    deleteComplete: "Документ өчүрүлдү",
    deleteFailed: "Документти өчүрүү мүмкүн болгон жок",
    ownerVersionAvailable: "Фасилитаторлор үчүн купуя версия бар",
    invalidFile: "Колдоого алынган форматтагы бош эмес файлды тандаңыз.",
    invalidName: "Ар бир тил үчүн документтин аталышын киргизиңиз.",
    mismatchedFiles:
      "Катышуучулар менен фасилитаторлордун файлдарынын кеңейтүүсү бирдей болушу керек.",
    invalidDownloadFileName:
      "Ар бир жүктөө аталышы файлдын кеңейтүүсүн сакташы керек.",
    loadFailed: "Документтер жүктөлгөн жок.",
    retry: "Кайра аракет кылуу",
    deleteTitle: "Документ өчүрүлсүнбү?",
    deleteMessage:
      "Катышуучулар жана фасилитаторлор үчүн версиялар тең өчүрүлөт.",
    cancel: "Жокко чыгаруу",
  },
  ru: {
    ...en,
    title: "Документы проекта",
    description:
      "Загрузите доступные всем версии для участников и необязательные закрытые версии для фасилитаторов, затем укажите название на нужных языках.",
    publicationWarningTitle: "Проверьте перед публикацией",
    publicationWarningBody:
      "Файлы для участников можно скачать. Не включайте имена, контактные данные, идентификаторы учетных записей или участников, необработанные голоса или ответы, малые демографические группы, секреты или скрытые необезличенные данные. Интерактивный HTML выполняет загруженные скрипты в изолированном фрейме; загружайте только доверенные автономные отчёты. Внешние ресурсы и сетевые API блокируются. Соблюдайте те же требования для закрытых файлов фасилитаторов.",
    chooseFilesDescription:
      "Файл для участников обязателен и доступен всем. Необязательный файл для фасилитаторов представляет собой дополнительную версию, доступную только фасилитаторам проекта. Оба файла должны иметь одинаковый формат.",
    participantFileLabel: "Обезличенный файл для участников",
    participantFileHint:
      "Подготовленная с учётом конфиденциальности версия, доступная всем, даже если также предоставлена версия для фасилитаторов.",
    ownerFileLabel: "Закрытый файл для фасилитаторов (необязательно)",
    ownerFileHint:
      "Дополнительная закрытая версия, доступная только фасилитаторам проекта. Фасилитаторы имеют доступ к обеим версиям; участники никогда не получают этот файл.",
    defaultLanguageLabel: "Основной язык названия",
    nameLabel: "Название документа",
    downloadFileNameLabel: "Имя скачиваемого файла",
    additionalNamesTitle: "Названия на других языках",
    languageLabel: "Язык",
    addName: "Добавить перевод названия",
    upload: "Загрузить документ",
    remove: "Удалить",
    empty: "Документы еще не загружены.",
    allowedFormats:
      "HTML, PDF, простой текст, Markdown, CSV и JSON. Максимум {size} МБ.",
    uploadComplete: "Документ загружен",
    uploadFailed: "Не удалось загрузить документ",
    deleteComplete: "Документ удален",
    deleteFailed: "Не удалось удалить документ",
    ownerVersionAvailable: "Добавлена закрытая версия для фасилитаторов",
    invalidFile: "Выберите непустой файл поддерживаемого формата.",
    invalidName: "Укажите название документа для каждого языка.",
    mismatchedFiles:
      "Файлы для участников и фасилитаторов должны иметь одинаковое расширение.",
    invalidDownloadFileName:
      "Каждое имя скачивания должно сохранять расширение загруженного файла.",
    loadFailed: "Не удалось загрузить документы.",
    retry: "Повторить",
    deleteTitle: "Удалить документ?",
    deleteMessage: "Будут удалены версии для участников и фасилитаторов.",
    cancel: "Отмена",
  },
};
