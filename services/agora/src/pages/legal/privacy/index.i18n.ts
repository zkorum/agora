export interface PrivacyPolicyTranslations {
  privacyPolicy: string;
  referTo: string;
  externalPageLink: string;
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
  "zh-Hans": {
    privacyPolicy: "隐私政策",
    referTo: "请参阅",
    externalPageLink: "此外部页面（开发中）",
  },
  "zh-Hant": {
    privacyPolicy: "隱私政策",
    referTo: "請參閱",
    externalPageLink: "此外部頁面（開發中）",
  },
  ja: {
    privacyPolicy: "プライバシーポリシー",
    referTo: "参照",
    externalPageLink: "この外部ページ（開発中）",
  },
};
