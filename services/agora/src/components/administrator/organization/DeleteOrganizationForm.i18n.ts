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
  ar: {
    noOrganizationsMessage:
      "لا توجد منظمات مسجلة في النظام",
  },
  es: {
    noOrganizationsMessage: "No hay organizaciones registradas en el sistema",
  },
  fr: {
    noOrganizationsMessage:
      "Aucune organisation n'est enregistrée dans le système",
  },
  "zh-Hans": {
    noOrganizationsMessage: "系统中没有注册组织",
  },
  "zh-Hant": {
    noOrganizationsMessage: "系統中沒有註冊組織",
  },
  ja: {
    noOrganizationsMessage: "システムに登録された組織はありません",
  },
};
