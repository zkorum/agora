export interface PrivacyPolicyTranslations {
  privacyPolicy: string;
  referTo: string;
  externalPageLink: string;
  [key: string]: string;
}

export const privacyPolicyTranslations: Record<
  string,
  PrivacyPolicyTranslations
> = {
  en: {
    privacyPolicy: "Privacy Policy",
    referTo: "Refer to",
    externalPageLink: "this external page (WIP)",
  },
  es: {
    privacyPolicy: "Política de Privacidad",
    referTo: "Consulte",
    externalPageLink: "esta página externa (en progreso)",
  },
  fr: {
    privacyPolicy: "Politique de Confidentialité",
    referTo: "Consultez",
    externalPageLink: "cette page externe (en cours)",
  },
};
