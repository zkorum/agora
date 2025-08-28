export interface ActionsTranslations {
  report: string;
  muteUser: string;
  delete: string;
  moderate: string;
  userReports: string;
  share: string;
  moderationHistory: string;
  embedLink: string;
  cancel: string;
  confirm: string;
  confirmDeletePost: string;
  confirmDeleteComment: string;
  confirmGenericAction: string;
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
    cancel: "Cancel",
    confirm: "Confirm",
    confirmDeletePost: "Are you sure you want to delete this conversation?",
    confirmDeleteComment: "Are you sure you want to delete this opinion?",
    confirmGenericAction: "Are you sure you want to perform this action?",
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
    cancel: "Cancelar",
    confirm: "Confirmar",
    confirmDeletePost: "¿Está seguro de que desea eliminar esta conversación?",
    confirmDeleteComment: "¿Está seguro de que desea eliminar esta opinión?",
    confirmGenericAction: "¿Está seguro de que desea realizar esta acción?",
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
    cancel: "Annuler",
    confirm: "Confirmer",
    confirmDeletePost:
      "Êtes-vous sûr de vouloir supprimer cette conversation ?",
    confirmDeleteComment: "Êtes-vous sûr de vouloir supprimer cette opinion ?",
    confirmGenericAction: "Êtes-vous sûr de vouloir effectuer cette action ?",
  },
  "zh-Hans": {
    report: "举报",
    muteUser: "屏蔽用户",
    delete: "删除",
    moderate: "审核",
    userReports: "用户举报",
    share: "分享",
    moderationHistory: "审核历史",
    embedLink: "复制嵌入链接",
    cancel: "取消",
    confirm: "确认",
    confirmDeletePost: "您确定要删除此对话吗？",
    confirmDeleteComment: "您确定要删除此观点吗？",
    confirmGenericAction: "您确定要执行此操作吗？",
  },
  "zh-Hant": {
    report: "舉報",
    muteUser: "屏蔽用戶",
    delete: "刪除",
    moderate: "審核",
    userReports: "用戶舉報",
    share: "分享",
    moderationHistory: "審核歷史",
    embedLink: "複製嵌入連結",
    cancel: "取消",
    confirm: "確認",
    confirmDeletePost: "您確定要刪除此對話嗎？",
    confirmDeleteComment: "您確定要刪除此觀點嗎？",
    confirmGenericAction: "您確定要執行此操作嗎？",
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
    cancel: "キャンセル",
    confirm: "確認",
    confirmDeletePost: "この会話を削除してもよろしいですか？",
    confirmDeleteComment: "この意見を削除してもよろしいですか？",
    confirmGenericAction: "この操作を実行してもよろしいですか？",
  },
};
