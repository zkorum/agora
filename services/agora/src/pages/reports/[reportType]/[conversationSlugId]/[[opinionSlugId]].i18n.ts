import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface UserReportsViewerTranslations {
  userReportsViewer: string;
  openConversation: string;
  openOpinion: string;
  noReportsAvailable: string;
  conversation: string;
  opinion: string;
  id: string;
  username: string;
  createdAt: string;
  reason: string;
  explanation: string;
  notAvailable: string;
  invalidReportType: string;
  invalidSlugIdParam: string;
  unknownReportType: string;
}

export const userReportsViewerTranslations: Record<
  SupportedDisplayLanguageCodes,
  UserReportsViewerTranslations
> = {
  en: {
    userReportsViewer: "User Reports Viewer",
    openConversation: "Open Conversation",
    openOpinion: "Open Statement",
    noReportsAvailable: "No reports are available for this {type}.",
    conversation: "Conversation",
    opinion: "Statement",
    id: "ID:",
    username: "Username:",
    createdAt: "Created At:",
    reason: "Reason:",
    explanation: "Explanation:",
    notAvailable: "n/a",
    invalidReportType: "Invalid report type",
    invalidSlugIdParam: "Invalid slug ID param",
    unknownReportType: "Unknown report type",
  },
  ar: {
    userReportsViewer: "عارض تقارير المستخدمين",
    openConversation: "فتح المحادثة",
    openOpinion: "فتح المقترح",
    noReportsAvailable: "لا توجد تقارير متاحة لهذا {type}.",
    conversation: "محادثة",
    opinion: "مقترح",
    id: "المعرف:",
    username: "اسم المستخدم:",
    createdAt: "تم الإنشاء في:",
    reason: "السبب:",
    explanation: "التوضيح:",
    notAvailable: "غير متوفر",
    invalidReportType: "نوع تقرير غير صحيح",
    invalidSlugIdParam: "معامل معرف slug غير صحيح",
    unknownReportType: "نوع تقرير غير معروف",
  },
  es: {
    userReportsViewer: "Visor de reportes de usuario",
    openConversation: "Abrir conversación",
    openOpinion: "Abrir proposición",
    noReportsAvailable: "No hay reportes disponibles para esta {type}.",
    conversation: "Conversación",
    opinion: "Proposición",
    id: "ID:",
    username: "Usuario:",
    createdAt: "Creado en:",
    reason: "Razón:",
    explanation: "Explicación:",
    notAvailable: "n/d",
    invalidReportType: "Tipo de reporte inválido",
    invalidSlugIdParam: "Parámetro de ID slug inválido",
    unknownReportType: "Tipo de reporte desconocido",
  },
  fr: {
    userReportsViewer: "Visualiseur de Rapports Utilisateur",
    openConversation: "Ouvrir la Conversation",
    openOpinion: "Ouvrir la Proposition",
    noReportsAvailable: "Aucun rapport disponible pour cette {type}.",
    conversation: "Conversation",
    opinion: "Proposition",
    id: "ID :",
    username: "Nom d'utilisateur :",
    createdAt: "Créé le :",
    reason: "Raison :",
    explanation: "Explication :",
    notAvailable: "n/d",
    invalidReportType: "Type de rapport invalide",
    invalidSlugIdParam: "Paramètre d'ID slug invalide",
    unknownReportType: "Type de rapport inconnu",
  },
  "zh-Hans": {
    userReportsViewer: "用户报告查看器",
    openConversation: "打开对话",
    openOpinion: "打开观点",
    noReportsAvailable: "没有可用的 {type} 报告。",
    conversation: "对话",
    opinion: "观点",
    id: "ID:",
    username: "用户名:",
    createdAt: "创建于:",
    reason: "原因:",
    explanation: "解释:",
    notAvailable: "n/a",
    invalidReportType: "无效的报告类型",
    invalidSlugIdParam: "无效的 slug ID 参数",
    unknownReportType: "未知报告类型",
  },
  "zh-Hant": {
    userReportsViewer: "用戶報告查看器",
    openConversation: "打開對話",
    openOpinion: "打開觀點",
    noReportsAvailable: "沒有可用的 {type} 報告。",
    conversation: "對話",
    opinion: "觀點",
    id: "ID :",
    username: "ユーザー名 :",
    createdAt: "作成日 :",
    reason: "理由 :",
    explanation: "説明 :",
    notAvailable: "n/d",
    invalidReportType: "無効なレポートタイプ",
    invalidSlugIdParam: "無効な slug ID パラメータ",
    unknownReportType: "不明なレポートタイプ",
  },
  ja: {
    userReportsViewer: "ユーザー報告ビューアー",
    openConversation: "会話を開く",
    openOpinion: "主張を開く",
    noReportsAvailable: "この {type} には報告がありません。",
    conversation: "会話",
    opinion: "主張",
    id: "ID :",
    username: "ユーザー名 :",
    createdAt: "作成日 :",
    reason: "理由 :",
    explanation: "説明 :",
    notAvailable: "n/d",
    invalidReportType: "無効なレポートタイプ",
    invalidSlugIdParam: "無効な slug ID パラメータ",
    unknownReportType: "不明なレポートタイプ",
  },
};
