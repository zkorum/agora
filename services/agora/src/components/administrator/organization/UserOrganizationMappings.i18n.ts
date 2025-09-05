export interface UserOrganizationMappingsTranslations {
  usernameLabel: string;
  fetchButton: string;
  noOrganizationsMessage: string;
  removeUserOrganizationMappingButton: string;
}

export const userOrganizationMappingsTranslations: Record<
  string,
  UserOrganizationMappingsTranslations
> = {
  en: {
    usernameLabel: "Username",
    fetchButton: "Fetch",
    noOrganizationsMessage: "User does not belong to any organizations",
    removeUserOrganizationMappingButton: "Remove user organization mapping",
  },
  ar: {
    usernameLabel: "اسم المستخدم",
    fetchButton: "جلب",
    noOrganizationsMessage: "المستخدم لا ينتمي إلى أي منظمات",
    removeUserOrganizationMappingButton: "إزالة ربط المستخدم بالمنظمة",
  },
  es: {
    usernameLabel: "Nombre de usuario",
    fetchButton: "Buscar",
    noOrganizationsMessage: "El usuario no pertenece a ninguna organización",
    removeUserOrganizationMappingButton:
      "Eliminar mapeo de usuario-organización",
  },
  fr: {
    usernameLabel: "Nom d'utilisateur",
    fetchButton: "Récupérer",
    noOrganizationsMessage: "L'utilisateur n'appartient à aucune organisation",
    removeUserOrganizationMappingButton:
      "Supprimer le mappage utilisateur-organisation",
  },
  "zh-Hans": {
    usernameLabel: "用户名",
    fetchButton: "获取",
    noOrganizationsMessage: "用户不属于任何组织",
    removeUserOrganizationMappingButton: "移除用户组织映射",
  },
  "zh-Hant": {
    usernameLabel: "用戶名",
    fetchButton: "獲取",
    noOrganizationsMessage: "用戶不屬於任何組織",
    removeUserOrganizationMappingButton: "移除用戶組織映射",
  },
  ja: {
    usernameLabel: "ユーザー名",
    fetchButton: "取得",
    noOrganizationsMessage: "ユーザーは組織に属していません",
    removeUserOrganizationMappingButton: "ユーザー組織マッピングを削除",
  },
};
