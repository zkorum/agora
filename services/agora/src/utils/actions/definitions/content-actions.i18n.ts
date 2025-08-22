export interface ActionsTranslations {
  report: string;
  muteUser: string;
  delete: string;
  moderate: string;
  userReports: string;
  share: string;
  moderationHistory: string;
  embedLink: string;
}

export const actionsTranslations: Record<string, ActionsTranslations> = {
  en: {
    report: "Report",
    muteUser: "Mute User",
    delete: "Delete",
    moderate: "Moderate",
    userReports: "User Reports",
    share: "Share",
    moderationHistory: "Moderation History",
    embedLink: "Copy Embed Link",
  },
  es: {
    report: "Reportar",
    muteUser: "Silenciar Usuario",
    delete: "Eliminar",
    moderate: "Moderar",
    userReports: "Reportes de Usuario",
    share: "Compartir",
    moderationHistory: "Historial de Moderación",
    embedLink: "Copiar Enlace de Inserción",
  },
  fr: {
    report: "Signaler",
    muteUser: "Mettre en Sourdine",
    delete: "Supprimer",
    moderate: "Modérer",
    userReports: "Rapports d'Utilisateur",
    share: "Partager",
    moderationHistory: "Historique de Modération",
    embedLink: "Copier le Lien d'Intégration",
  },
};
