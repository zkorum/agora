export interface DeleteOrganizationFormTranslations {
  noOrganizationsMessage: string;
  [key: string]: string;
}

export const deleteOrganizationFormTranslations: Record<
  string,
  DeleteOrganizationFormTranslations
> = {
  en: {
    noOrganizationsMessage: "No organizations are registered in the system",
  },
  es: {
    noOrganizationsMessage: "No hay organizaciones registradas en el sistema",
  },
  fr: {
    noOrganizationsMessage:
      "Aucune organisation n'est enregistrée dans le système",
  },
};
