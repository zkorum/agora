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
  "zh-CN": {
    termsOfService: "服务条款",
    referTo: "请参阅",
    externalPageLink: "此外部页面（开发中）",
  },
  "zh-TW": {
    termsOfService: "服務條款",
    referTo: "請參閱",
    externalPageLink: "此外部頁面（開發中）",
  },
  ja: {
    termsOfService: "利用規約",
    referTo: "参照",
    externalPageLink: "この外部ページ（開発中）",
  },
};
