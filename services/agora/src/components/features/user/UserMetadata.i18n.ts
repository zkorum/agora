export interface UserMetadataTranslations {
  idVerified: string;
  [key: string]: string;
}

export const userMetadataTranslations: Record<
  string,
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
  fr: {
    idVerified: "ID vérifié",
  },
  "zh-Hans": {
    idVerified: "ID 已验证",
  },
  "zh-Hant": {
    idVerified: "ID 已驗證",
  },
  ja: {
    idVerified: "ID が確認されました",
  },
};
