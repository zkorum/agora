import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface PolisCsvUploadTranslations {
  uploadTitle: string;
  description: string;
  requiredFiles: string;
  summaryFile: string;
  commentsFile: string;
  votesFile: string;
  maxFileSize: string;
  errorInvalidFileName: string;
  errorFileTooLarge: string;
  errorAllFilesRequired: string;
  validationFailed: string;
  serverError: string;
  errorInvalidDroppedFiles: string;
  dropZoneMainText: string;
  dropZoneSubText: string;
  orText: string;
  browseFilesButton: string;
  filesStatusTitle: string;
}

export const polisCsvUploadTranslations: Record<
  SupportedDisplayLanguageCodes,
  PolisCsvUploadTranslations
> = {
  en: {
    uploadTitle: "Import from Polis CSV Files",
    description:
      "Upload the three CSV files exported from Polis to import a conversation with all its data.",
    requiredFiles: "Required Files (all 3 must be uploaded):",
    summaryFile: "Summary File",
    commentsFile: "Comments File",
    votesFile: "Votes File",
    maxFileSize: "Max. File Size: {size}MB",
    errorInvalidFileName: "File must be named exactly: {fileName}",
    errorFileTooLarge: "File size exceeds {size}MB limit",
    errorAllFilesRequired: "All three CSV files are required",
    validationFailed: "Validation failed",
    serverError: "Unable to validate files. Please try again.",
    errorInvalidDroppedFiles:
      "Invalid files detected. Please use: summary.csv, comments.csv, and votes.csv",
    dropZoneMainText: "Click the button below to upload",
    dropZoneSubText: "or drag and drop your 3 CSV files here",
    orText: "or",
    browseFilesButton: "Browse Files",
    filesStatusTitle: "Upload Status",
  },
  ar: {
    uploadTitle: "استيراد من ملفات Polis CSV",
    description:
      "قم بتحميل ملفات CSV الثلاثة المُصدَّرة من Polis لاستيراد محادثة مع جميع بياناتها.",
    requiredFiles: "الملفات المطلوبة (يجب تحميل جميع الملفات الثلاثة):",
    summaryFile: "ملف الملخص",
    commentsFile: "ملف التعليقات",
    votesFile: "ملف التصويتات",
    maxFileSize: "الحد الأقصى لحجم الملف: {size} ميجابايت",
    errorInvalidFileName: "يجب أن يكون اسم الملف بالضبط: {fileName}",
    errorFileTooLarge: "حجم الملف يتجاوز حد {size} ميجابايت",
    errorAllFilesRequired: "جميع ملفات CSV الثلاثة مطلوبة",
    validationFailed: "فشل التحقق",
    serverError: "تعذر التحقق من الملفات. يرجى المحاولة مرة أخرى.",
    errorInvalidDroppedFiles:
      "تم اكتشاف ملفات غير صالحة. يرجى استخدام: summary.csv و comments.csv و votes.csv",
    dropZoneMainText: "انقر على الزر أدناه للتحميل",
    dropZoneSubText: "أو اسحب وأفلت ملفات CSV الثلاثة هنا",
    orText: "أو",
    browseFilesButton: "تصفح الملفات",
    filesStatusTitle: "حالة التحميل",
  },
  es: {
    uploadTitle: "Importar desde archivos CSV de Polis",
    description:
      "Cargue los tres archivos CSV exportados de Polis para importar una conversación con todos sus datos.",
    requiredFiles: "Archivos requeridos (deben cargarse los 3):",
    summaryFile: "Archivo de resumen",
    commentsFile: "Archivo de comentarios",
    votesFile: "Archivo de votos",
    maxFileSize: "Tamaño máximo de archivo: {size}MB",
    errorInvalidFileName: "El archivo debe llamarse exactamente: {fileName}",
    errorFileTooLarge: "El tamaño del archivo supera el límite de {size}MB",
    errorAllFilesRequired: "Se requieren los tres archivos CSV",
    validationFailed: "Validación fallida",
    serverError: "No se pudieron validar los archivos. Inténtelo de nuevo.",
    errorInvalidDroppedFiles:
      "Se detectaron archivos no válidos. Utilice: summary.csv, comments.csv y votes.csv",
    dropZoneMainText: "Haga clic en el botón de abajo para cargar",
    dropZoneSubText: "o arrastre y suelte sus 3 archivos CSV aquí",
    orText: "o",
    browseFilesButton: "Examinar archivos",
    filesStatusTitle: "Estado de carga",
  },
  fr: {
    uploadTitle: "Importer depuis des fichiers CSV Polis",
    description:
      "Téléchargez les trois fichiers CSV exportés de Polis pour importer une conversation avec toutes ses données.",
    requiredFiles: "Fichiers requis (les 3 doivent être téléchargés) :",
    summaryFile: "Fichier de résumé",
    commentsFile: "Fichier de commentaires",
    votesFile: "Fichier de votes",
    maxFileSize: "Taille maximale du fichier : {size}Mo",
    errorInvalidFileName: "Le fichier doit être nommé exactement : {fileName}",
    errorFileTooLarge: "La taille du fichier dépasse la limite de {size}Mo",
    errorAllFilesRequired: "Les trois fichiers CSV sont requis",
    validationFailed: "Échec de la validation",
    serverError: "Impossible de valider les fichiers. Veuillez réessayer.",
    errorInvalidDroppedFiles:
      "Fichiers non valides détectés. Veuillez utiliser : summary.csv, comments.csv et votes.csv",
    dropZoneMainText: "Cliquez sur le bouton ci-dessous pour télécharger",
    dropZoneSubText: "ou faites glisser et déposez vos 3 fichiers CSV ici",
    orText: "ou",
    browseFilesButton: "Parcourir les fichiers",
    filesStatusTitle: "État du téléchargement",
  },
  "zh-Hans": {
    uploadTitle: "从 Polis CSV 文件导入",
    description: "上传从 Polis 导出的三个 CSV 文件以导入包含所有数据的对话。",
    requiredFiles: "必需文件（必须上传全部 3 个）：",
    summaryFile: "摘要文件",
    commentsFile: "评论文件",
    votesFile: "投票文件",
    maxFileSize: "最大文件大小：{size}MB",
    errorInvalidFileName: "文件必须命名为：{fileName}",
    errorFileTooLarge: "文件大小超过 {size}MB 限制",
    errorAllFilesRequired: "需要全部三个 CSV 文件",
    validationFailed: "验证失败",
    serverError: "无法验证文件。请重试。",
    errorInvalidDroppedFiles:
      "检测到无效文件。请使用：summary.csv、comments.csv 和 votes.csv",
    dropZoneMainText: "点击下方按钮上传",
    dropZoneSubText: "或将 3 个 CSV 文件拖放到此处",
    orText: "或",
    browseFilesButton: "浏览文件",
    filesStatusTitle: "上传状态",
  },
  "zh-Hant": {
    uploadTitle: "從 Polis CSV 檔案匯入",
    description: "上傳從 Polis 匯出的三個 CSV 檔案以匯入包含所有資料的對話。",
    requiredFiles: "必需檔案（必須上傳全部 3 個）：",
    summaryFile: "摘要檔案",
    commentsFile: "評論檔案",
    votesFile: "投票檔案",
    maxFileSize: "最大檔案大小：{size}MB",
    errorInvalidFileName: "檔案必須命名為：{fileName}",
    errorFileTooLarge: "檔案大小超過 {size}MB 限制",
    errorAllFilesRequired: "需要全部三個 CSV 檔案",
    validationFailed: "驗證失敗",
    serverError: "無法驗證檔案。請重試。",
    errorInvalidDroppedFiles:
      "偵測到無效檔案。請使用：summary.csv、comments.csv 和 votes.csv",
    dropZoneMainText: "點擊下方按鈕上傳",
    dropZoneSubText: "或將 3 個 CSV 檔案拖放到此處",
    orText: "或",
    browseFilesButton: "瀏覽檔案",
    filesStatusTitle: "上傳狀態",
  },
  ja: {
    uploadTitle: "Polis CSV ファイルからインポート",
    description:
      "Polis からエクスポートされた 3 つの CSV ファイルをアップロードして、すべてのデータを含む会話をインポートします。",
    requiredFiles: "必須ファイル（3 つすべてアップロードする必要があります）：",
    summaryFile: "サマリーファイル",
    commentsFile: "コメントファイル",
    votesFile: "投票ファイル",
    maxFileSize: "最大ファイルサイズ：{size}MB",
    errorInvalidFileName:
      "ファイル名は正確に次のようにする必要があります：{fileName}",
    errorFileTooLarge: "ファイルサイズが {size}MB の制限を超えています",
    errorAllFilesRequired: "3 つの CSV ファイルすべてが必要です",
    validationFailed: "検証に失敗しました",
    serverError: "ファイルを検証できませんでした。もう一度お試しください。",
    errorInvalidDroppedFiles:
      "無効なファイルが検出されました。次を使用してください：summary.csv、comments.csv、votes.csv",
    dropZoneMainText: "下のボタンをクリックしてアップロード",
    dropZoneSubText: "または 3 つの CSV ファイルをここにドラッグアンドドロップ",
    orText: "または",
    browseFilesButton: "ファイルを参照",
    filesStatusTitle: "アップロード状態",
  },
};
