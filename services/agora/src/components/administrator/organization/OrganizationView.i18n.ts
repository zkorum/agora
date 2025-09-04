export interface OrganizationViewTranslations {
  deleteOrganizationButton: string;
  usernameLabel: string;
  addUserToOrganizationButton: string;
  [key: string]: string;
}

export const organizationViewTranslations: Record<
  string,
  OrganizationViewTranslations
> = {
  en: {
    deleteOrganizationButton: "Delete Organization",
    usernameLabel: "Username",
    addUserToOrganizationButton: "Add User to Organization",
  },
  ar: {
    deleteOrganizationButton: "حذف المنظمة",
    usernameLabel: "اسم المستخدم",
    addUserToOrganizationButton: "إضافة مستخدم للمنظمة",
  },
  es: {
    deleteOrganizationButton: "Eliminar Organización",
    usernameLabel: "Nombre de usuario",
    addUserToOrganizationButton: "Agregar Usuario a la Organización",
  },
  fr: {
    deleteOrganizationButton: "Supprimer l'organisation",
    usernameLabel: "Nom d'utilisateur",
    addUserToOrganizationButton: "Ajouter un utilisateur à l'organisation",
  },
  "zh-Hans": {
    deleteOrganizationButton: "删除组织",
    usernameLabel: "用户名",
    addUserToOrganizationButton: "添加用户到组织",
  },
  "zh-Hant": {
    deleteOrganizationButton: "刪除組織",
    usernameLabel: "用戶名",
    addUserToOrganizationButton: "添加用戶到組織",
  },
  ja: {
    deleteOrganizationButton: "組織を削除",
    usernameLabel: "ユーザー名",
    addUserToOrganizationButton: "ユーザーを組織に追加",
  },
};
