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
  "zh-CN": {
    report: "举报",
    muteUser: "屏蔽用户",
    delete: "删除",
    moderate: "审核",
    userReports: "用户举报",
    share: "分享",
    moderationHistory: "审核历史",
    embedLink: "复制嵌入链接",
  },
  "zh-TW": {
    report: "舉報",
    muteUser: "屏蔽用戶",
    delete: "刪除",
    moderate: "審核",
    userReports: "用戶舉報",
    share: "分享",
    moderationHistory: "審核歷史",
    embedLink: "複製嵌入連結",
  },
  ja: {
    report: "報告",
    muteUser: "ユーザーをミュート",
    delete: "削除",
    moderate: "審査",
    userReports: "ユーザー報告",
    share: "共有",
    moderationHistory: "審査履歴",
    embedLink: "埋め込みリンクをコピー",
  },
};
