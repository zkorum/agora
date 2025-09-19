import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface AsyncStateHandlerTestTranslations {
  asyncStateHandler: string;
  asyncStateHandlerDescription: string;
  simulateLoading: string;
  simulateError: string;
  simulateEmpty: string;
  simulateSuccess: string;
  simulateRetrying: string;
  resetState: string;
  basicExample: string;
  configApiExample: string;
  customRetryExample: string;
  functionEmptyExample: string;
  withCustomSlots: string;
  currentState: string;
  sampleData: string;
  customErrorMessage: string;
  customLoadingText: string;
  customEmptyText: string;
  customRetryText: string;
}

export const asyncStateHandlerTestTranslations: Record<
  SupportedDisplayLanguageCodes,
  AsyncStateHandlerTestTranslations
> = {
  en: {
    asyncStateHandler: "Async State Handler",
    asyncStateHandlerDescription:
      "Test the AsyncStateHandler component with different async states, customizations, and slot overrides to see how it handles loading, error, empty, and success states.",
    simulateLoading: "Loading",
    simulateError: "Error",
    simulateEmpty: "Empty",
    simulateSuccess: "Success",
    simulateRetrying: "Retrying",
    resetState: "Reset",
    basicExample: "Basic Example",
    configApiExample: "Config API Example",
    customRetryExample: "Custom Retry Example",
    functionEmptyExample: "Function Empty Example",
    withCustomSlots: "With Custom Slots",
    currentState: "Current State",
    sampleData: "Sample data loaded successfully!",
    customErrorMessage: "Custom Error Title",
    customLoadingText: "Custom loading message",
    customEmptyText: "Custom empty state message",
    customRetryText: "Try Again",
  },
  ar: {
    asyncStateHandler: "معالج الحالة غير المتزامنة",
    asyncStateHandlerDescription:
      "اختبر مكون AsyncStateHandler مع حالات غير متزامنة مختلفة وتخصيصات وتجاوزات للفتحات لترى كيف يتعامل مع حالات التحميل والخطأ والفارغة والنجاح.",
    simulateLoading: "تحميل",
    simulateError: "خطأ",
    simulateEmpty: "فارغ",
    simulateSuccess: "نجح",
    simulateRetrying: "إعادة المحاولة",
    resetState: "إعادة تعيين",
    basicExample: "مثال أساسي",
    configApiExample: "مثال واجهة التكوين",
    customRetryExample: "مثال إعادة المحاولة المخصص",
    functionEmptyExample: "مثال الوظيفة الفارغة",
    withCustomSlots: "مع فتحات مخصصة",
    currentState: "الحالة الحالية",
    sampleData: "تم تحميل البيانات النموذجية بنجاح!",
    customErrorMessage: "عنوان خطأ مخصص",
    customLoadingText: "رسالة تحميل مخصصة",
    customEmptyText: "رسالة حالة فارغة مخصصة",
    customRetryText: "حاول مرة أخرى",
  },
  es: {
    asyncStateHandler: "Manejador de Estado Asíncrono",
    asyncStateHandlerDescription:
      "Prueba el componente AsyncStateHandler con diferentes estados asíncronos, personalizaciones y anulaciones de slots para ver cómo maneja los estados de carga, error, vacío y éxito.",
    simulateLoading: "Cargando",
    simulateError: "Error",
    simulateEmpty: "Vacío",
    simulateSuccess: "Éxito",
    simulateRetrying: "Reintentando",
    resetState: "Restablecer",
    basicExample: "Ejemplo Básico",
    configApiExample: "Ejemplo de API de Configuración",
    customRetryExample: "Ejemplo de Reintento Personalizado",
    functionEmptyExample: "Ejemplo de Función Vacía",
    withCustomSlots: "Con Slots Personalizados",
    currentState: "Estado Actual",
    sampleData: "¡Datos de muestra cargados exitosamente!",
    customErrorMessage: "Título de Error Personalizado",
    customLoadingText: "Mensaje de carga personalizado",
    customEmptyText: "Mensaje de estado vacío personalizado",
    customRetryText: "Intentar de Nuevo",
  },
  fr: {
    asyncStateHandler: "Gestionnaire d'État Asynchrone",
    asyncStateHandlerDescription:
      "Testez le composant AsyncStateHandler avec différents états asynchrones, personnalisations et remplacements de slots pour voir comment il gère les états de chargement, d'erreur, vide et de succès.",
    simulateLoading: "Chargement",
    simulateError: "Erreur",
    simulateEmpty: "Vide",
    simulateSuccess: "Succès",
    simulateRetrying: "Nouvelle tentative",
    resetState: "Réinitialiser",
    basicExample: "Exemple de Base",
    configApiExample: "Exemple d'API de Configuration",
    customRetryExample: "Exemple de Nouvelle Tentative Personnalisée",
    functionEmptyExample: "Exemple de Fonction Vide",
    withCustomSlots: "Avec Slots Personnalisés",
    currentState: "État Actuel",
    sampleData: "Données d'exemple chargées avec succès!",
    customErrorMessage: "Titre d'Erreur Personnalisé",
    customLoadingText: "Message de chargement personnalisé",
    customEmptyText: "Message d'état vide personnalisé",
    customRetryText: "Essayer à Nouveau",
  },
  "zh-Hans": {
    asyncStateHandler: "异步状态处理器",
    asyncStateHandlerDescription:
      "测试 AsyncStateHandler 组件的不同异步状态、自定义和插槽覆盖，以查看它如何处理加载、错误、空和成功状态。",
    simulateLoading: "加载中",
    simulateError: "错误",
    simulateEmpty: "空",
    simulateSuccess: "成功",
    simulateRetrying: "重试中",
    resetState: "重置",
    basicExample: "基本示例",
    configApiExample: "配置API示例",
    customRetryExample: "自定义重试示例",
    functionEmptyExample: "函数空状态示例",
    withCustomSlots: "使用自定义插槽",
    currentState: "当前状态",
    sampleData: "示例数据加载成功！",
    customErrorMessage: "自定义错误标题",
    customLoadingText: "自定义加载消息",
    customEmptyText: "自定义空状态消息",
    customRetryText: "重试",
  },
  "zh-Hant": {
    asyncStateHandler: "異步狀態處理器",
    asyncStateHandlerDescription:
      "測試 AsyncStateHandler 組件的不同異步狀態、自定義和插槽覆蓋，以查看它如何處理載入、錯誤、空和成功狀態。",
    simulateLoading: "載入中",
    simulateError: "錯誤",
    simulateEmpty: "空",
    simulateSuccess: "成功",
    simulateRetrying: "重試中",
    resetState: "重設",
    basicExample: "基本範例",
    configApiExample: "配置API範例",
    customRetryExample: "自定義重試範例",
    functionEmptyExample: "函數空狀態範例",
    withCustomSlots: "使用自定義插槽",
    currentState: "當前狀態",
    sampleData: "範例資料載入成功！",
    customErrorMessage: "自定義錯誤標題",
    customLoadingText: "自定義載入訊息",
    customEmptyText: "自定義空狀態訊息",
    customRetryText: "重試",
  },
  ja: {
    asyncStateHandler: "非同期状態ハンドラー",
    asyncStateHandlerDescription:
      "AsyncStateHandlerコンポーネントを異なる非同期状態、カスタマイズ、スロットオーバーライドでテストして、読み込み、エラー、空、成功状態をどのように処理するかを確認します。",
    simulateLoading: "読み込み中",
    simulateError: "エラー",
    simulateEmpty: "空",
    simulateSuccess: "成功",
    simulateRetrying: "再試行中",
    resetState: "リセット",
    basicExample: "基本例",
    configApiExample: "設定API例",
    customRetryExample: "カスタム再試行例",
    functionEmptyExample: "関数空状態例",
    withCustomSlots: "カスタムスロット付き",
    currentState: "現在の状態",
    sampleData: "サンプルデータが正常に読み込まれました！",
    customErrorMessage: "カスタムエラータイトル",
    customLoadingText: "カスタム読み込みメッセージ",
    customEmptyText: "カスタム空状態メッセージ",
    customRetryText: "再試行",
  },
};
