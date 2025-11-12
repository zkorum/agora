import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface PolisCsvUploadTranslations {
  uploadTitle: string;
  description: string;
  requiredFiles: string;
  summaryFile: string;
  commentsFile: string;
  votesFile: string;
  fileUploadLabel: string;
  dragDropHint: string;
  maxFileSize: string;
  selectedFile: string;
  removeFile: string;
  errorInvalidFileName: string;
  errorFileTooLarge: string;
  errorAllFilesRequired: string;
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
    fileUploadLabel: "Click or drag file to upload",
    dragDropHint: "Drag and drop your file here",
    maxFileSize: "Max file size: 50MB",
    selectedFile: "Selected file:",
    removeFile: "Remove file",
    errorInvalidFileName: "File must be named exactly: {fileName}",
    errorFileTooLarge: "File size exceeds 50MB limit",
    errorAllFilesRequired: "All three CSV files are required",
  },
  ar: {
    uploadTitle: "استيراد من ملفات Polis CSV",
    description:
      "قم بتحميل ملفات CSV الثلاثة المُصدَّرة من Polis لاستيراد محادثة مع جميع بياناتها.",
    requiredFiles: "الملفات المطلوبة (يجب تحميل جميع الملفات الثلاثة):",
    summaryFile: "ملف الملخص",
    commentsFile: "ملف التعليقات",
    votesFile: "ملف التصويتات",
    fileUploadLabel: "انقر أو اسحب الملف للتحميل",
    dragDropHint: "اسحب وأفلت الملف هنا",
    maxFileSize: "الحد الأقصى لحجم الملف: 50 ميجابايت",
    selectedFile: "الملف المحدد:",
    removeFile: "إزالة الملف",
    errorInvalidFileName: "يجب أن يكون اسم الملف بالضبط: {fileName}",
    errorFileTooLarge: "حجم الملف يتجاوز حد 50 ميجابايت",
    errorAllFilesRequired: "جميع ملفات CSV الثلاثة مطلوبة",
  },
  es: {
    uploadTitle: "Importar desde archivos CSV de Polis",
    description:
      "Cargue los tres archivos CSV exportados de Polis para importar una conversación con todos sus datos.",
    requiredFiles: "Archivos requeridos (deben cargarse los 3):",
    summaryFile: "Archivo de resumen",
    commentsFile: "Archivo de comentarios",
    votesFile: "Archivo de votos",
    fileUploadLabel: "Haga clic o arrastre el archivo para cargar",
    dragDropHint: "Arrastre y suelte su archivo aquí",
    maxFileSize: "Tamaño máximo de archivo: 50MB",
    selectedFile: "Archivo seleccionado:",
    removeFile: "Eliminar archivo",
    errorInvalidFileName: "El archivo debe llamarse exactamente: {fileName}",
    errorFileTooLarge: "El tamaño del archivo supera el límite de 50MB",
    errorAllFilesRequired: "Se requieren los tres archivos CSV",
  },
  fr: {
    uploadTitle: "Importer depuis des fichiers CSV Polis",
    description:
      "Téléchargez les trois fichiers CSV exportés de Polis pour importer une conversation avec toutes ses données.",
    requiredFiles: "Fichiers requis (les 3 doivent être téléchargés) :",
    summaryFile: "Fichier de résumé",
    commentsFile: "Fichier de commentaires",
    votesFile: "Fichier de votes",
    fileUploadLabel: "Cliquez ou faites glisser le fichier pour télécharger",
    dragDropHint: "Glissez et déposez votre fichier ici",
    maxFileSize: "Taille maximale du fichier : 50Mo",
    selectedFile: "Fichier sélectionné :",
    removeFile: "Supprimer le fichier",
    errorInvalidFileName: "Le fichier doit être nommé exactement : {fileName}",
    errorFileTooLarge: "La taille du fichier dépasse la limite de 50Mo",
    errorAllFilesRequired: "Les trois fichiers CSV sont requis",
  },
  "zh-Hans": {
    uploadTitle: "从 Polis CSV 文件导入",
    description: "上传从 Polis 导出的三个 CSV 文件以导入包含所有数据的对话。",
    requiredFiles: "必需文件（必须上传全部 3 个）：",
    summaryFile: "摘要文件",
    commentsFile: "评论文件",
    votesFile: "投票文件",
    fileUploadLabel: "点击或拖动文件上传",
    dragDropHint: "将文件拖放到这里",
    maxFileSize: "最大文件大小：50MB",
    selectedFile: "已选择文件：",
    removeFile: "删除文件",
    errorInvalidFileName: "文件必须命名为：{fileName}",
    errorFileTooLarge: "文件大小超过 50MB 限制",
    errorAllFilesRequired: "需要全部三个 CSV 文件",
  },
  "zh-Hant": {
    uploadTitle: "從 Polis CSV 檔案匯入",
    description: "上傳從 Polis 匯出的三個 CSV 檔案以匯入包含所有資料的對話。",
    requiredFiles: "必需檔案（必須上傳全部 3 個）：",
    summaryFile: "摘要檔案",
    commentsFile: "評論檔案",
    votesFile: "投票檔案",
    fileUploadLabel: "點擊或拖動檔案上傳",
    dragDropHint: "將檔案拖放到這裡",
    maxFileSize: "最大檔案大小：50MB",
    selectedFile: "已選擇檔案：",
    removeFile: "刪除檔案",
    errorInvalidFileName: "檔案必須命名為：{fileName}",
    errorFileTooLarge: "檔案大小超過 50MB 限制",
    errorAllFilesRequired: "需要全部三個 CSV 檔案",
  },
  ja: {
    uploadTitle: "Polis CSV ファイルからインポート",
    description:
      "Polis からエクスポートされた 3 つの CSV ファイルをアップロードして、すべてのデータを含む会話をインポートします。",
    requiredFiles: "必須ファイル（3 つすべてアップロードする必要があります）：",
    summaryFile: "サマリーファイル",
    commentsFile: "コメントファイル",
    votesFile: "投票ファイル",
    fileUploadLabel: "クリックまたはファイルをドラッグしてアップロード",
    dragDropHint: "ファイルをここにドラッグ＆ドロップ",
    maxFileSize: "最大ファイルサイズ：50MB",
    selectedFile: "選択されたファイル：",
    removeFile: "ファイルを削除",
    errorInvalidFileName:
      "ファイル名は正確に次のようにする必要があります：{fileName}",
    errorFileTooLarge: "ファイルサイズが 50MB の制限を超えています",
    errorAllFilesRequired: "3 つの CSV ファイルすべてが必要です",
  },
};
