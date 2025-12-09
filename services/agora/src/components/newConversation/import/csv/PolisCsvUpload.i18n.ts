import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface PolisCsvUploadTranslations {
  uploadTitle: string;
  description: string;
  summaryFile: string;
  commentsFile: string;
  votesFile: string;
  maxFileSize: string;
  errorFileTooLarge: string;
  errorAllFilesRequired: string;
  validationFailed: string;
  serverError: string;
  unknownError: string;
  noValidationResult: string;
  dropZoneMainText: string;
  dropZoneSubText: string;
  browseFilesButton: string;
  uploadStatusTitle: string;
  summaryDropZoneLabel: string;
  commentsDropZoneLabel: string;
  votesDropZoneLabel: string;
  dropOrClickText: string;
}

export const polisCsvUploadTranslations: Record<
  SupportedDisplayLanguageCodes,
  PolisCsvUploadTranslations
> = {
  en: {
    uploadTitle: "Import from Polis CSV Files",
    description:
      "Upload the three CSV files exported from Polis. Drop each file in its designated area below.",
    summaryFile: "Summary File",
    commentsFile: "Comments File",
    votesFile: "Votes File",
    maxFileSize: "Max. File Size: {size}MB",
    errorFileTooLarge: "File size exceeds {size}MB limit",
    errorAllFilesRequired: "All three CSV files are required",
    validationFailed: "Validation failed",
    serverError: "Unable to validate files. Please try again.",
    unknownError: "File validation failed. Please check the file format.",
    noValidationResult: "No validation result received from server.",
    dropZoneMainText: "Drop file here or click to browse",
    dropZoneSubText: "Any .csv file",
    browseFilesButton: "Browse Files",
    uploadStatusTitle: "Upload Status",
    summaryDropZoneLabel: "1. Summary CSV",
    commentsDropZoneLabel: "2. Comments CSV",
    votesDropZoneLabel: "3. Votes CSV",
    dropOrClickText: "Drop here or click",
  },
  ar: {
    uploadTitle: "استيراد من ملفات Polis CSV",
    description:
      "قم بتحميل ملفات CSV الثلاثة المُصدَّرة من Polis. أسقط كل ملف في المنطقة المخصصة أدناه.",
    summaryFile: "ملف الملخص",
    commentsFile: "ملف التعليقات",
    votesFile: "ملف التصويتات",
    maxFileSize: "الحد الأقصى لحجم الملف: {size} ميجابايت",
    errorFileTooLarge: "حجم الملف يتجاوز حد {size} ميجابايت",
    errorAllFilesRequired: "جميع ملفات CSV الثلاثة مطلوبة",
    validationFailed: "فشل التحقق",
    serverError: "تعذر التحقق من الملفات. يرجى المحاولة مرة أخرى.",
    unknownError: "فشل التحقق من الملف. يرجى التحقق من تنسيق الملف.",
    noValidationResult: "لم يتم استلام نتيجة التحقق من الخادم.",
    dropZoneMainText: "أسقط الملف هنا أو انقر للتصفح",
    dropZoneSubText: "أي ملف .csv",
    browseFilesButton: "تصفح الملفات",
    uploadStatusTitle: "حالة التحميل",
    summaryDropZoneLabel: "1. ملخص CSV",
    commentsDropZoneLabel: "2. تعليقات CSV",
    votesDropZoneLabel: "3. تصويتات CSV",
    dropOrClickText: "أسقط هنا أو انقر",
  },
  es: {
    uploadTitle: "Importar desde archivos CSV de Polis",
    description:
      "Cargue los tres archivos CSV exportados de Polis. Suelte cada archivo en su área designada a continuación.",
    summaryFile: "Archivo de resumen",
    commentsFile: "Archivo de comentarios",
    votesFile: "Archivo de votos",
    maxFileSize: "Tamaño máximo de archivo: {size}MB",
    errorFileTooLarge: "El tamaño del archivo supera el límite de {size}MB",
    errorAllFilesRequired: "Se requieren los tres archivos CSV",
    validationFailed: "Validación fallida",
    serverError: "No se pudieron validar los archivos. Inténtelo de nuevo.",
    unknownError:
      "La validación del archivo falló. Verifique el formato del archivo.",
    noValidationResult: "No se recibió resultado de validación del servidor.",
    dropZoneMainText: "Suelte el archivo aquí o haga clic para explorar",
    dropZoneSubText: "Cualquier archivo .csv",
    browseFilesButton: "Examinar archivos",
    uploadStatusTitle: "Estado de carga",
    summaryDropZoneLabel: "1. Resumen CSV",
    commentsDropZoneLabel: "2. Comentarios CSV",
    votesDropZoneLabel: "3. Votos CSV",
    dropOrClickText: "Suelte aquí o haga clic",
  },
  fr: {
    uploadTitle: "Importer depuis des fichiers CSV Polis",
    description:
      "Téléchargez les trois fichiers CSV exportés de Polis. Déposez chaque fichier dans sa zone désignée ci-dessous.",
    summaryFile: "Fichier de résumé",
    commentsFile: "Fichier de commentaires",
    votesFile: "Fichier de votes",
    maxFileSize: "Taille maximale du fichier : {size}Mo",
    errorFileTooLarge: "La taille du fichier dépasse la limite de {size}Mo",
    errorAllFilesRequired: "Les trois fichiers CSV sont requis",
    validationFailed: "Échec de la validation",
    serverError: "Impossible de valider les fichiers. Veuillez réessayer.",
    unknownError:
      "La validation du fichier a échoué. Vérifiez le format du fichier.",
    noValidationResult: "Aucun résultat de validation reçu du serveur.",
    dropZoneMainText: "Déposez le fichier ici ou cliquez pour parcourir",
    dropZoneSubText: "Tout fichier .csv",
    browseFilesButton: "Parcourir les fichiers",
    uploadStatusTitle: "État du téléchargement",
    summaryDropZoneLabel: "1. Résumé CSV",
    commentsDropZoneLabel: "2. Commentaires CSV",
    votesDropZoneLabel: "3. Votes CSV",
    dropOrClickText: "Déposez ici ou cliquez",
  },
  "zh-Hans": {
    uploadTitle: "从 Polis CSV 文件导入",
    description:
      "上传从 Polis 导出的三个 CSV 文件。将每个文件拖到下面的指定区域。",
    summaryFile: "摘要文件",
    commentsFile: "评论文件",
    votesFile: "投票文件",
    maxFileSize: "最大文件大小：{size}MB",
    errorFileTooLarge: "文件大小超过 {size}MB 限制",
    errorAllFilesRequired: "需要全部三个 CSV 文件",
    validationFailed: "验证失败",
    serverError: "无法验证文件。请重试。",
    unknownError: "文件验证失败。请检查文件格式。",
    noValidationResult: "未收到服务器的验证结果。",
    dropZoneMainText: "将文件拖到此处或点击浏览",
    dropZoneSubText: "任何 .csv 文件",
    browseFilesButton: "浏览文件",
    uploadStatusTitle: "上传状态",
    summaryDropZoneLabel: "1. 摘要 CSV",
    commentsDropZoneLabel: "2. 评论 CSV",
    votesDropZoneLabel: "3. 投票 CSV",
    dropOrClickText: "拖到此处或点击",
  },
  "zh-Hant": {
    uploadTitle: "從 Polis CSV 檔案匯入",
    description:
      "上傳從 Polis 匯出的三個 CSV 檔案。將每個檔案拖到下面的指定區域。",
    summaryFile: "摘要檔案",
    commentsFile: "評論檔案",
    votesFile: "投票檔案",
    maxFileSize: "最大檔案大小：{size}MB",
    errorFileTooLarge: "檔案大小超過 {size}MB 限制",
    errorAllFilesRequired: "需要全部三個 CSV 檔案",
    validationFailed: "驗證失敗",
    serverError: "無法驗證檔案。請重試。",
    unknownError: "檔案驗證失敗。請檢查檔案格式。",
    noValidationResult: "未收到伺服器的驗證結果。",
    dropZoneMainText: "將檔案拖到此處或點擊瀏覽",
    dropZoneSubText: "任何 .csv 檔案",
    browseFilesButton: "瀏覽檔案",
    uploadStatusTitle: "上傳狀態",
    summaryDropZoneLabel: "1. 摘要 CSV",
    commentsDropZoneLabel: "2. 評論 CSV",
    votesDropZoneLabel: "3. 投票 CSV",
    dropOrClickText: "拖到此處或點擊",
  },
  ja: {
    uploadTitle: "Polis CSV ファイルからインポート",
    description:
      "Polis からエクスポートされた 3 つの CSV ファイルをアップロードします。各ファイルを下の指定されたエリアにドロップしてください。",
    summaryFile: "サマリーファイル",
    commentsFile: "コメントファイル",
    votesFile: "投票ファイル",
    maxFileSize: "最大ファイルサイズ：{size}MB",
    errorFileTooLarge: "ファイルサイズが {size}MB の制限を超えています",
    errorAllFilesRequired: "3 つの CSV ファイルすべてが必要です",
    validationFailed: "検証に失敗しました",
    serverError: "ファイルを検証できませんでした。もう一度お試しください。",
    unknownError:
      "ファイルの検証に失敗しました。ファイル形式を確認してください。",
    noValidationResult: "サーバーから検証結果を受信できませんでした。",
    dropZoneMainText: "ファイルをここにドロップするかクリックして参照",
    dropZoneSubText: "任意の .csv ファイル",
    browseFilesButton: "ファイルを参照",
    uploadStatusTitle: "アップロード状態",
    summaryDropZoneLabel: "1. サマリー CSV",
    commentsDropZoneLabel: "2. コメント CSV",
    votesDropZoneLabel: "3. 投票 CSV",
    dropOrClickText: "ここにドロップまたはクリック",
  },
};
