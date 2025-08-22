export interface TermsOfServiceTranslations {
  termsOfService: string;
  referTo: string;
  externalPageLink: string;
}

export const termsOfServiceTranslations: Record<
  string,
  TermsOfServiceTranslations
> = {
  en: {
    termsOfService: "Terms of Service",
    referTo: "Refer to",
    externalPageLink: "this external page (WIP)",
  },
  es: {
    termsOfService: "Términos de Servicio",
    referTo: "Consulte",
    externalPageLink: "esta página externa (en progreso)",
  },
  fr: {
    termsOfService: "Conditions d'Utilisation",
    referTo: "Consultez",
    externalPageLink: "cette page externe (en cours)",
  },
};
