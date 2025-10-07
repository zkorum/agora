import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface TermsOfServiceTranslations {
  termsOfService: string;
}

export const termsOfServiceTranslations: Record<
  SupportedDisplayLanguageCodes,
  TermsOfServiceTranslations
> = {
  en: {
    termsOfService: "Terms of Service",
  },
  ar: {
    termsOfService: "شروط الخدمة",
  },
  es: {
    termsOfService: "Términos de Servicio",
  },
  fr: {
    termsOfService: "Conditions d'Utilisation",
  },
  "zh-Hans": {
    termsOfService: "服务条款",
  },
  "zh-Hant": {
    termsOfService: "服務條款",
  },
  ja: {
    termsOfService: "利用規約",
  },
};
