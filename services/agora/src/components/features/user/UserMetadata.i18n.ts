import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface UserMetadataTranslations {
  idVerified: string;
}

export const userMetadataTranslations: Record<
  SupportedDisplayLanguageCodes,
  UserMetadataTranslations
> = {
  en: {
    idVerified: "ID verified",
  },
  ar: {
    idVerified: "تم التحقق من الهوية",
  },
  es: {
    idVerified: "ID verificado",
  },
  fa: {
    idVerified: "هویت تأیید شده",
  },
  fr: {
    idVerified: "ID vérifié",
  },
  "zh-Hans": {
    idVerified: "ID 已验证",
  },
  "zh-Hant": {
    idVerified: "ID 已驗證",
  },
  he: {
    idVerified: "זהות מאומתת",
  },
  ja: {
    idVerified: "ID が確認されました",
  },
  ky: {
    idVerified: "ID текшерилди",
  },
  ru: {
    idVerified: "Личность подтверждена",
  },
};
