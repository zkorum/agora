import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface AdministratorOrganizationTranslations {
  administrator: string;
}

export const administratorOrganizationTranslations: Record<
  SupportedDisplayLanguageCodes,
  AdministratorOrganizationTranslations
> = {
  en: {
    administrator: "Administrator",
  },
  ar: {
    administrator: "المشرف",
  },
  es: {
    administrator: "Administrador",
  },
  fr: {
    administrator: "Administrateur",
  },
  "zh-Hans": {
    administrator: "管理员",
  },
  "zh-Hant": {
    administrator: "管理員",
  },
  ja: {
    administrator: "管理者",
  },
};
