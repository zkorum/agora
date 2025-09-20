import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

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
  confirmMuteUser: string;
  confirmGenericAction: string;
}

export const actionsTranslations: Record<SupportedDisplayLanguageCodes, ActionsTranslations> = {
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
    confirmMuteUser:
      "Are you sure you want to mute this user? You won't see their conversations and opinions anymore.",
    confirmGenericAction: "Are you sure you want to perform this action?",
  },
  ar: {
    report: "إبلاغ",
    muteUser: "كتم المستخدم",
    delete: "حذف",
    moderate: "إدارة المحتوى",
    userReports: "إبلاغات المستخدمين",
    share: "مشاركة",
    moderationHistory: "سجل الإدارة",
    embedLink: "نسخ رابط التضمين",
    cancel: "إلغاء",
    confirm: "تأكيد",
    confirmDeletePost: "هل أنت متأكد أنك تريد حذف هذه المحادثة؟",
    confirmDeleteComment: "هل أنت متأكد أنك تريد حذف هذا الرأي؟",
    confirmMuteUser:
      "هل أنت متأكد أنك تريد كتم هذا المستخدم؟ لن ترى محادثاته وآراءه بعد الآن.",
    confirmGenericAction: "هل أنت متأكد أنك تريد تنفيذ هذا الإجراء؟",
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
    confirmMuteUser:
      "¿Está seguro de que desea silenciar a este usuario? Ya no verá sus conversaciones y opiniones.",
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
    confirmMuteUser:
      "Êtes-vous sûr de vouloir mettre cet utilisateur en sourdine ? Vous ne verrez plus ses conversations et opinions.",
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
    confirmMuteUser: "您确定要屏蔽此用户吗？您将不再看到他们的对话和观点。",
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
    confirmMuteUser: "您確定要屏蔽此用戶嗎？您將不再看到他們的對話和觀點。",
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
    confirmMuteUser:
      "このユーザーをミュートしてもよろしいですか？このユーザーの会話や意見は表示されなくなります。",
    confirmGenericAction: "この操作を実行してもよろしいですか？",
  },
};
