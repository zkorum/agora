import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ImportStatusViewTranslations {
  loadingStatus: string;
  errorLoadingStatus: string;
  importId: string;
  status: string;
  createdAt: string;
  status_processing: string;
  status_completed: string;
  status_failed: string;
  processingMessage: string;
  completedMessage: string;
  failedMessage: string;
  viewConversation: string;
  // Failure reason translations
  failureReasonProcessingError: string;
  failureReasonTimeout: string;
  failureReasonInvalidDataFormat: string;
}

export const importStatusViewTranslations: Record<
  SupportedDisplayLanguageCodes,
  ImportStatusViewTranslations
> = {
  en: {
    loadingStatus: "Loading import status...",
    errorLoadingStatus: "Failed to load import status",
    importId: "Import ID",
    status: "Status",
    createdAt: "Created At",
    status_processing: "Processing",
    status_completed: "Completed",
    status_failed: "Failed",
    processingMessage:
      "Your import is being processed. This may take a few seconds to a few minutes depending on the size of your import.",
    completedMessage: "Your import has completed successfully!",
    failedMessage: "Import failed. Please try again or contact support.",
    viewConversation: "View Conversation",
    failureReasonProcessingError: "A processing error occurred",
    failureReasonTimeout: "The operation timed out",
    failureReasonInvalidDataFormat: "The data format was invalid",
  },
  ar: {
    loadingStatus: "جاري تحميل حالة الاستيراد...",
    errorLoadingStatus: "فشل تحميل حالة الاستيراد",
    importId: "معرّف الاستيراد",
    status: "الحالة",
    createdAt: "تاريخ الإنشاء",
    status_processing: "قيد المعالجة",
    status_completed: "مكتمل",
    status_failed: "فشل",
    processingMessage:
      "جاري معالجة الاستيراد. قد يستغرق ذلك من بضع ثوانٍ إلى بضع دقائق حسب حجم الاستيراد.",
    completedMessage: "اكتمل الاستيراد بنجاح!",
    failedMessage: "فشل الاستيراد. يرجى المحاولة مرة أخرى أو الاتصال بالدعم.",
    viewConversation: "عرض المحادثة",
    failureReasonProcessingError: "حدث خطأ في المعالجة",
    failureReasonTimeout: "انتهت مهلة العملية",
    failureReasonInvalidDataFormat: "تنسيق البيانات غير صالح",
  },
  es: {
    loadingStatus: "Cargando estado de importación...",
    errorLoadingStatus: "Error al cargar el estado de importación",
    importId: "ID de Importación",
    status: "Estado",
    createdAt: "Creado el",
    status_processing: "Procesando",
    status_completed: "Completado",
    status_failed: "Fallido",
    processingMessage:
      "Su importación se está procesando. Esto puede tomar desde unos segundos hasta varios minutos dependiendo del tamaño de su importación.",
    completedMessage: "¡Su importación se completó exitosamente!",
    failedMessage:
      "La importación falló. Intente nuevamente o contacte con soporte.",
    viewConversation: "Ver Conversación",
    failureReasonProcessingError: "Ocurrió un error de procesamiento",
    failureReasonTimeout: "La operación expiró",
    failureReasonInvalidDataFormat: "El formato de datos no es válido",
  },
  fr: {
    loadingStatus: "Chargement du statut d'importation...",
    errorLoadingStatus: "Échec du chargement du statut d'importation",
    importId: "ID d'Importation",
    status: "Statut",
    createdAt: "Créé le",
    status_processing: "En cours",
    status_completed: "Terminé",
    status_failed: "Échoué",
    processingMessage:
      "Votre import est en cours de traitement. Cela peut prendre de quelques secondes à quelques minutes selon la taille de votre import.",
    completedMessage: "Votre importation s'est terminée avec succès !",
    failedMessage:
      "L'importation a échoué. Veuillez réessayer ou contacter le support.",
    viewConversation: "Voir la Conversation",
    failureReasonProcessingError: "Une erreur de traitement s'est produite",
    failureReasonTimeout: "L'opération a expiré",
    failureReasonInvalidDataFormat: "Le format des données est invalide",
  },
  "zh-Hans": {
    loadingStatus: "加载导入状态中...",
    errorLoadingStatus: "加载导入状态失败",
    importId: "导入 ID",
    status: "状态",
    createdAt: "创建时间",
    status_processing: "处理中",
    status_completed: "已完成",
    status_failed: "失败",
    processingMessage:
      "您的导入正在处理中。根据导入大小，这可能需要几秒到几分钟的时间。",
    completedMessage: "您的导入已成功完成！",
    failedMessage: "导入失败。请重试或联系支持。",
    viewConversation: "查看对话",
    failureReasonProcessingError: "处理时发生错误",
    failureReasonTimeout: "操作超时",
    failureReasonInvalidDataFormat: "数据格式无效",
  },
  "zh-Hant": {
    loadingStatus: "載入匯入狀態中...",
    errorLoadingStatus: "載入匯入狀態失敗",
    importId: "匯入 ID",
    status: "狀態",
    createdAt: "建立時間",
    status_processing: "處理中",
    status_completed: "已完成",
    status_failed: "失敗",
    processingMessage:
      "您的匯入正在處理中。根據匯入大小，這可能需要幾秒到幾分鐘的時間。",
    completedMessage: "您的匯入已成功完成！",
    failedMessage: "匯入失敗。請重試或聯絡支援。",
    viewConversation: "查看對話",
    failureReasonProcessingError: "處理時發生錯誤",
    failureReasonTimeout: "操作逾時",
    failureReasonInvalidDataFormat: "資料格式無效",
  },
  ja: {
    loadingStatus: "インポートステータスを読み込み中...",
    errorLoadingStatus: "インポートステータスの読み込みに失敗しました",
    importId: "インポート ID",
    status: "ステータス",
    createdAt: "作成日時",
    status_processing: "処理中",
    status_completed: "完了",
    status_failed: "失敗",
    processingMessage:
      "インポートを処理中です。インポートのサイズによって、数秒から数分かかる場合があります。",
    completedMessage: "インポートが正常に完了しました！",
    failedMessage:
      "インポートに失敗しました。再試行するか、サポートにお問い合わせください。",
    viewConversation: "会話を表示",
    failureReasonProcessingError: "処理中にエラーが発生しました",
    failureReasonTimeout: "操作がタイムアウトしました",
    failureReasonInvalidDataFormat: "データ形式が無効です",
  },
};
