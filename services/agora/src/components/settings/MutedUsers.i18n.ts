export interface MutedUsersTranslations {
  title: string;
  emptyMessage: string;
}

export const mutedUsersTranslations: Record<string, MutedUsersTranslations> = {
  en: {
    title: "Muted users",
    emptyMessage: "You have no muted users",
  },
  es: {
    title: "Usuarios silenciados",
    emptyMessage: "No tienes usuarios silenciados",
  },
  fr: {
    title: "Utilisateurs masqués",
    emptyMessage: "Vous n'avez pas d'utilisateurs masqués",
  },
  "zh-CN": {
    title: "已静音用户",
    emptyMessage: "您没有已静音的用户",
  },
  "zh-TW": {
    title: "已靜音用戶",
    emptyMessage: "您沒有已靜音的用戶",
  },
  ja: {
    title: "ミュートされたユーザー",
    emptyMessage: "ミュートされたユーザーはいません",
  },
};
