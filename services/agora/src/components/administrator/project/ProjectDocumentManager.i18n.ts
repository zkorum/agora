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
    "Upload participant-restricted project documents and provide a display name in each relevant language.",
  publicationWarningTitle: "Review before publishing",
  publicationWarningBody:
    "Participant files are downloadable. Do not include names, contact details, account or participant identifiers, raw votes or survey responses, small demographic groups, secrets, or hidden unsuppressed data. HTML can run scripts, but remote resources and network requests are blocked; upload only trusted, self-contained reports. Apply the same care to private owner files.",
  chooseFilesTitle: "Choose files",
  chooseFilesDescription:
    "The participant file is required. The owner-only file is an optional replacement for project owners. When both are provided, they must use the same format.",
  participantFileLabel: "Participant download (required)",
  participantFileHint:
    "The privacy-safe version available to people who participated in any consultation in this project. Project owners also receive this file when no owner-only file is provided.",
  ownerFileLabel: "Owner-only download (optional)",
  ownerFileHint:
    "A replacement version available only to project owners. Participants never receive this file.",
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
  ownerVersionAvailable: "Private owner version included",
  invalidFile: "Choose a non-empty file in one of the supported formats.",
  invalidName: "Enter a document name for every language.",
  mismatchedFiles: "Participant and owner files must use the same extension.",
  invalidDownloadFileName:
    "Every downloaded filename must preserve the uploaded file extension.",
  loadFailed: "Documents could not be loaded.",
  retry: "Retry",
  deleteTitle: "Remove document?",
  deleteMessage: "This removes both participant and owner versions.",
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
      "Sube documentos restringidos a participantes e indica un nombre en cada idioma pertinente.",
    publicationWarningTitle: "Revisa antes de publicar",
    publicationWarningBody:
      "Los archivos para participantes se pueden descargar. No incluyas nombres, datos de contacto, identificadores de cuenta o participante, votos o respuestas sin agregar, grupos demográficos pequeños, secretos ni datos ocultos sin anonimizar. El HTML puede ejecutar scripts, pero los recursos remotos y las solicitudes de red están bloqueados; sube solo informes autónomos de confianza. Aplica el mismo cuidado a los archivos privados.",
    participantFileLabel: "Archivo anonimizado para participantes",
    participantFileHint:
      "Obligatorio. Disponible solo para participantes identificados y responsables del proyecto.",
    ownerFileLabel: "Archivo privado para responsables",
    ownerFileHint:
      "Opcional. Si se proporciona, los responsables reciben esta versión.",
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
    ownerVersionAvailable: "Incluye una versión privada para responsables",
    invalidFile: "Elige un archivo no vacío en un formato compatible.",
    invalidName: "Indica un nombre para el documento en cada idioma.",
    mismatchedFiles: "Ambos archivos deben usar la misma extensión.",
    invalidDownloadFileName:
      "Cada nombre de descarga debe conservar la extensión del archivo.",
    loadFailed: "No se pudieron cargar los documentos.",
    retry: "Reintentar",
    deleteTitle: "¿Eliminar el documento?",
    deleteMessage:
      "Se eliminarán las versiones para participantes y responsables.",
    cancel: "Cancelar",
  },
  fr: {
    ...en,
    title: "Documents du projet",
    description:
      "Importez des documents réservés aux participants et indiquez un nom dans chaque langue utile.",
    publicationWarningTitle: "Vérifier avant publication",
    publicationWarningBody:
      "Les fichiers participants sont téléchargeables. N'incluez pas de noms, coordonnées, identifiants de compte ou de participant, votes ou réponses bruts, petits groupes démographiques, secrets ou données masquées non anonymisées. Le HTML peut exécuter des scripts, mais les ressources distantes et les requêtes réseau sont bloquées ; importez uniquement des rapports autonomes fiables. Appliquez les mêmes précautions aux fichiers privés.",
    participantFileLabel: "Fichier anonymisé pour les participants",
    participantFileHint:
      "Obligatoire. Accessible uniquement aux participants connectés et aux porteurs du projet.",
    ownerFileLabel: "Fichier privé des porteurs",
    ownerFileHint:
      "Facultatif. S'il est fourni, les porteurs reçoivent cette version.",
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
    ownerVersionAvailable: "Version privée des porteurs incluse",
    invalidFile: "Choisissez un fichier non vide dans un format accepté.",
    invalidName: "Saisissez un nom de document pour chaque langue.",
    mismatchedFiles: "Les deux fichiers doivent avoir la même extension.",
    invalidDownloadFileName:
      "Chaque nom de téléchargement doit conserver l'extension du fichier.",
    loadFailed: "Les documents n'ont pas pu être chargés.",
    retry: "Réessayer",
    deleteTitle: "Supprimer le document ?",
    deleteMessage: "Les versions participants et porteurs seront supprimées.",
    cancel: "Annuler",
  },
  "zh-Hant": {
    ...en,
    title: "專案文件",
    description: "上傳僅限參與者的專案文件，並為相關語言提供顯示名稱。",
    publicationWarningTitle: "發布前請檢查",
    publicationWarningBody:
      "參與者檔案可供下載。請勿包含姓名、聯絡資料、帳戶或參與者識別碼、原始投票或問卷回覆、小型人口群組、密鑰或未經匿名化的隱藏資料。HTML 可執行腳本，但遠端資源與網路請求會被封鎖；請只上傳可信且自包含的報告。私人負責人檔案也應採取相同標準。",
    participantFileLabel: "參與者匿名化檔案",
    participantFileHint: "必填。僅供已登入的參與者和專案負責人使用。",
    ownerFileLabel: "負責人私人檔案",
    ownerFileHint: "選填。提供後，專案負責人將取得此版本。",
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
    ownerVersionAvailable: "包含負責人私人版本",
    invalidFile: "請選擇支援格式的非空白檔案。",
    invalidName: "請為每種語言輸入文件名稱。",
    mismatchedFiles: "兩個檔案必須使用相同副檔名。",
    invalidDownloadFileName: "每個下載檔名都必須保留上傳檔案的副檔名。",
    loadFailed: "無法載入文件。",
    retry: "重試",
    deleteTitle: "移除文件？",
    deleteMessage: "這將移除參與者和負責人版本。",
    cancel: "取消",
  },
  "zh-Hans": {
    ...en,
    title: "项目文档",
    description: "上传仅限参与者的项目文档，并为相关语言提供显示名称。",
    publicationWarningTitle: "发布前请检查",
    publicationWarningBody:
      "参与者文件可供下载。请勿包含姓名、联系方式、账户或参与者标识、原始投票或问卷回答、小型人口群体、密钥或未经匿名化的隐藏数据。HTML 可以运行脚本，但远程资源和网络请求会被阻止；请仅上传可信且自包含的报告。私密负责人文件也应遵循相同标准。",
    participantFileLabel: "参与者匿名化文件",
    participantFileHint: "必填。仅供已登录的参与者和项目负责人使用。",
    ownerFileLabel: "负责人私密文件",
    ownerFileHint: "选填。提供后，项目负责人将获得此版本。",
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
    ownerVersionAvailable: "包含负责人私密版本",
    invalidFile: "请选择受支持格式的非空文件。",
    invalidName: "请为每种语言输入文档名称。",
    mismatchedFiles: "两个文件必须使用相同扩展名。",
    invalidDownloadFileName: "每个下载文件名都必须保留上传文件的扩展名。",
    loadFailed: "无法加载文档。",
    retry: "重试",
    deleteTitle: "移除文档？",
    deleteMessage: "这将移除参与者和负责人版本。",
    cancel: "取消",
  },
  ja: {
    ...en,
    title: "プロジェクト文書",
    description:
      "参加者限定の文書をアップロードし、必要な言語ごとに名前を設定します。",
    publicationWarningTitle: "公開前に確認",
    publicationWarningBody:
      "参加者向けファイルはダウンロードできます。氏名、連絡先、アカウントや参加者の識別子、生の投票や調査回答、少人数の属性グループ、秘密情報、匿名化されていない非表示データを含めないでください。HTML はスクリプトを実行できますが、外部リソースとネットワーク通信は遮断されます。信頼できる自己完結型のレポートのみアップロードしてください。所有者向け非公開ファイルにも同じ注意が必要です。",
    participantFileLabel: "参加者向け匿名化ファイル",
    participantFileHint:
      "必須。ログイン済み参加者とプロジェクト所有者のみ利用できます。",
    ownerFileLabel: "所有者向け非公開ファイル",
    ownerFileHint: "任意。指定すると所有者にはこの版が提供されます。",
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
    ownerVersionAvailable: "所有者向け非公開版あり",
    invalidFile: "対応形式の空でないファイルを選択してください。",
    invalidName: "各言語の文書名を入力してください。",
    mismatchedFiles: "両方のファイルで同じ拡張子を使用してください。",
    invalidDownloadFileName:
      "すべてのダウンロード名でアップロードした拡張子を維持してください。",
    loadFailed: "文書を読み込めませんでした。",
    retry: "再試行",
    deleteTitle: "文書を削除しますか？",
    deleteMessage: "参加者版と所有者版の両方が削除されます。",
    cancel: "キャンセル",
  },
  ar: {
    ...en,
    title: "مستندات المشروع",
    description: "ارفع مستندات مخصصة للمشاركين وأضف اسم عرض بكل لغة ذات صلة.",
    publicationWarningTitle: "راجع قبل النشر",
    publicationWarningBody:
      "يمكن تنزيل ملفات المشاركين. لا تُضمّن أسماء أو بيانات اتصال أو معرّفات حسابات أو مشاركين أو أصواتًا أو إجابات خامًا أو مجموعات سكانية صغيرة أو أسرارًا أو بيانات مخفية غير منقحة. يمكن لملفات HTML تشغيل البرامج النصية، لكن الموارد البعيدة وطلبات الشبكة محظورة؛ ارفع فقط تقارير موثوقة ومكتفية ذاتيًا. طبّق العناية نفسها على ملفات المالكين الخاصة.",
    participantFileLabel: "ملف منقح للمشاركين",
    participantFileHint: "مطلوب. متاح فقط للمشاركين المسجلين ومالكي المشروع.",
    ownerFileLabel: "ملف خاص للمالكين",
    ownerFileHint: "اختياري. عند توفيره يحصل مالكو المشروع على هذه النسخة.",
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
    ownerVersionAvailable: "توجد نسخة خاصة للمالكين",
    invalidFile: "اختر ملفًا غير فارغ بأحد التنسيقات المدعومة.",
    invalidName: "أدخل اسمًا للمستند بكل لغة.",
    mismatchedFiles: "يجب أن يستخدم الملفان الامتداد نفسه.",
    invalidDownloadFileName: "يجب أن يحتفظ كل اسم تنزيل بامتداد الملف المرفوع.",
    loadFailed: "تعذر تحميل المستندات.",
    retry: "إعادة المحاولة",
    deleteTitle: "إزالة المستند؟",
    deleteMessage: "سيؤدي هذا إلى إزالة نسختي المشاركين والمالكين.",
    cancel: "إلغاء",
  },
  fa: {
    ...en,
    title: "اسناد پروژه",
    description:
      "اسناد ویژه شرکت‌کنندگان را بارگذاری و نام آن‌ها را به زبان‌های مرتبط وارد کنید.",
    publicationWarningTitle: "پیش از انتشار بررسی کنید",
    publicationWarningBody:
      "فایل‌های شرکت‌کنندگان قابل دانلود هستند. نام، اطلاعات تماس، شناسه حساب یا شرکت‌کننده، رأی یا پاسخ خام، گروه‌های جمعیتی کوچک، اطلاعات محرمانه یا داده پنهان پالایش‌نشده را وارد نکنید. HTML می‌تواند اسکریپت اجرا کند، اما منابع راه دور و درخواست‌های شبکه مسدود هستند؛ فقط گزارش‌های مستقل و قابل اعتماد را بارگذاری کنید. همین دقت را برای فایل‌های خصوصی مالکان نیز به کار ببرید.",
    participantFileLabel: "فایل پالایش‌شده شرکت‌کنندگان",
    participantFileHint:
      "الزامی. فقط برای شرکت‌کنندگان واردشده و مالکان پروژه در دسترس است.",
    ownerFileLabel: "فایل خصوصی مالکان",
    ownerFileHint: "اختیاری. در صورت ارائه، مالکان این نسخه را دریافت می‌کنند.",
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
    ownerVersionAvailable: "نسخه خصوصی مالکان موجود است",
    invalidFile: "یک فایل غیرخالی با قالب پشتیبانی‌شده انتخاب کنید.",
    invalidName: "برای هر زبان نام سند را وارد کنید.",
    mismatchedFiles: "هر دو فایل باید پسوند یکسان داشته باشند.",
    invalidDownloadFileName:
      "هر نام دانلود باید پسوند فایل بارگذاری‌شده را حفظ کند.",
    loadFailed: "اسناد بارگیری نشدند.",
    retry: "تلاش دوباره",
    deleteTitle: "سند حذف شود؟",
    deleteMessage: "نسخه‌های شرکت‌کنندگان و مالکان حذف خواهند شد.",
    cancel: "لغو",
  },
  he: {
    ...en,
    title: "מסמכי הפרויקט",
    description: "העלאת מסמכים המוגבלים למשתתפים ומתן שם בכל שפה רלוונטית.",
    publicationWarningTitle: "בדיקה לפני פרסום",
    publicationWarningBody:
      "קובצי המשתתפים ניתנים להורדה. אין לכלול שמות, פרטי קשר, מזהי חשבון או משתתף, הצבעות או תשובות גולמיות, קבוצות דמוגרפיות קטנות, סודות או נתונים מוסתרים שלא עברו הסרה. HTML יכול להריץ סקריפטים, אך משאבים מרוחקים ובקשות רשת חסומים; יש להעלות רק דוחות עצמאיים ממקור מהימן. יש לנקוט אותה זהירות בקבצים הפרטיים לבעלים.",
    participantFileLabel: "קובץ מצונזר למשתתפים",
    participantFileHint: "חובה. זמין רק למשתתפים מחוברים ולבעלי הפרויקט.",
    ownerFileLabel: "קובץ פרטי לבעלים",
    ownerFileHint: "אופציונלי. אם סופק, בעלי הפרויקט יקבלו גרסה זו.",
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
    ownerVersionAvailable: "כלולה גרסה פרטית לבעלים",
    invalidFile: "יש לבחור קובץ שאינו ריק באחד הפורמטים הנתמכים.",
    invalidName: "יש להזין שם מסמך לכל שפה.",
    mismatchedFiles: "שני הקבצים חייבים להשתמש באותה סיומת.",
    invalidDownloadFileName: "כל שם להורדה חייב לשמור על סיומת הקובץ שהועלה.",
    loadFailed: "לא ניתן לטעון את המסמכים.",
    retry: "ניסיון חוזר",
    deleteTitle: "להסיר את המסמך?",
    deleteMessage: "הפעולה תסיר את גרסאות המשתתפים והבעלים.",
    cancel: "ביטול",
  },
  ky: {
    ...en,
    title: "Долбоордун документтери",
    description:
      "Катышуучуларга арналган документтерди жүктөп, керектүү тилдерде ат бериңиз.",
    publicationWarningTitle: "Жарыялоодон мурун текшериңиз",
    publicationWarningBody:
      "Катышуучулардын файлдарын жүктөп алууга болот. Аты-жөндөрдү, байланыш маалыматтарын, аккаунт же катышуучу идентификаторлорун, чийки добуштарды же сурамжылоо жоопторун, чакан демографиялык топторду, сырларды же жашырылган тазаланбаган маалыматтарды кошпоңуз. HTML скрипттерди иштете алат, бирок тышкы ресурстар жана тармактык сурамдар бөгөттөлөт; ишенимдүү жана өз алдынча отчетторду гана жүктөңүз. Ээлердин купуя файлдарына да ушундай талап коюңуз.",
    participantFileLabel: "Катышуучулар үчүн жашырылган файл",
    participantFileHint:
      "Милдеттүү. Кирген катышуучуларга жана долбоор ээлерине гана жеткиликтүү.",
    ownerFileLabel: "Ээлер үчүн купуя файл",
    ownerFileHint: "Милдеттүү эмес. Берилсе, ээлер ушул версияны алышат.",
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
    ownerVersionAvailable: "Ээлер үчүн купуя версия бар",
    invalidFile: "Колдоого алынган форматтагы бош эмес файлды тандаңыз.",
    invalidName: "Ар бир тил үчүн документтин аталышын киргизиңиз.",
    mismatchedFiles: "Эки файлдын кеңейтүүсү бирдей болушу керек.",
    invalidDownloadFileName:
      "Ар бир жүктөө аталышы файлдын кеңейтүүсүн сакташы керек.",
    loadFailed: "Документтер жүктөлгөн жок.",
    retry: "Кайра аракет кылуу",
    deleteTitle: "Документ өчүрүлсүнбү?",
    deleteMessage: "Катышуучу жана ээ версиялары тең өчүрүлөт.",
    cancel: "Жокко чыгаруу",
  },
  ru: {
    ...en,
    title: "Документы проекта",
    description:
      "Загрузите документы для участников и укажите название на нужных языках.",
    publicationWarningTitle: "Проверьте перед публикацией",
    publicationWarningBody:
      "Файлы для участников можно скачать. Не включайте имена, контактные данные, идентификаторы учетных записей или участников, необработанные голоса или ответы, малые демографические группы, секреты или скрытые необезличенные данные. HTML может выполнять скрипты, но внешние ресурсы и сетевые запросы блокируются; загружайте только доверенные автономные отчеты. Соблюдайте те же требования для закрытых файлов владельцев.",
    participantFileLabel: "Обезличенный файл для участников",
    participantFileHint:
      "Обязательно. Доступен только вошедшим участникам и владельцам проекта.",
    ownerFileLabel: "Закрытый файл для владельцев",
    ownerFileHint: "Необязательно. Если указан, владельцы получают эту версию.",
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
    ownerVersionAvailable: "Добавлена закрытая версия для владельцев",
    invalidFile: "Выберите непустой файл поддерживаемого формата.",
    invalidName: "Укажите название документа для каждого языка.",
    mismatchedFiles: "Оба файла должны иметь одинаковое расширение.",
    invalidDownloadFileName:
      "Каждое имя скачивания должно сохранять расширение загруженного файла.",
    loadFailed: "Не удалось загрузить документы.",
    retry: "Повторить",
    deleteTitle: "Удалить документ?",
    deleteMessage: "Будут удалены версии для участников и владельцев.",
    cancel: "Отмена",
  },
};
