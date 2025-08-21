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
  es: {
    idVerified: "ID verificado",
  },
  fr: {
    idVerified: "ID vérifié",
  },
};
