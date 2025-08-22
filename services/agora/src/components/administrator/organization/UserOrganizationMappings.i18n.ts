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
};
