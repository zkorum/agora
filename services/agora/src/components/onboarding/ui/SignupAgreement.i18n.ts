export interface SignupAgreementTranslations {
  agreementText: string;
  termsOfService: string;
  and: string;
  privacyPolicy: string;
}

export const signupAgreementTranslations: Record<
  string,
  SignupAgreementTranslations
> = {
  en: {
    agreementText: "By logging in, you agree to our",
    termsOfService: "Terms of Service",
    and: "and",
    privacyPolicy: "Privacy Policy",
  },
  es: {
    agreementText: "Al iniciar sesión, aceptas nuestros",
    termsOfService: "Términos de Servicio",
    and: "y",
    privacyPolicy: "Política de Privacidad",
  },
  fr: {
    agreementText: "En vous connectant, vous acceptez nos",
    termsOfService: "Conditions d'utilisation",
    and: "et",
    privacyPolicy: "Politique de confidentialité",
  },
};
