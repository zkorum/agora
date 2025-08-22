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
  [key: string]: string;
}

export const userReportsViewerTranslations: Record<
  string,
  UserReportsViewerTranslations
> = {
  en: {
    userReportsViewer: "User Reports Viewer",
    openConversation: "Open Conversation",
    openOpinion: "Open Opinion",
    noReportsAvailable: "No reports are available for this {type}.",
    conversation: "Conversation",
    opinion: "Opinion",
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
  es: {
    userReportsViewer: "Visor de Reportes de Usuario",
    openConversation: "Abrir Conversación",
    openOpinion: "Abrir Opinión",
    noReportsAvailable: "No hay reportes disponibles para esta {type}.",
    conversation: "Conversación",
    opinion: "Opinión",
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
    openOpinion: "Ouvrir l'Opinion",
    noReportsAvailable: "Aucun rapport disponible pour cette {type}.",
    conversation: "Conversation",
    opinion: "Opinion",
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
};
