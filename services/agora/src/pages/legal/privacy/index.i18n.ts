import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface PrivacyPolicyTranslations {
  privacyPolicy: string;
}

export const privacyPolicyTranslations: Record<
  SupportedDisplayLanguageCodes,
  PrivacyPolicyTranslations
> = {
  en: {
    privacyPolicy: "Privacy Policy",
  },
  ar: {
    privacyPolicy: "سياسة الخصوصية",
  },
  es: {
    privacyPolicy: "Política de Privacidad",
  },
  fr: {
    privacyPolicy: "Politique de Confidentialité",
  },
  "zh-Hans": {
    privacyPolicy: "隐私政策",
  },
  "zh-Hant": {
    privacyPolicy: "隱私政策",
  },
  ja: {
    privacyPolicy: "プライバシーポリシー",
  },
};
