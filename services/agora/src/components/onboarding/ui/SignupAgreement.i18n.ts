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
  ar: {
    agreementText: "بتسجيل الدخول، فإنك توافق على",
    termsOfService: "شروط الخدمة",
    and: "و",
    privacyPolicy: "سياسة الخصوصية",
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
  "zh-Hans": {
    agreementText: "登录即表示您同意我们的",
    termsOfService: "服务条款",
    and: "和",
    privacyPolicy: "隐私政策",
  },
  "zh-Hant": {
    agreementText: "登入即表示您同意我們的",
    termsOfService: "服務條款",
    and: "和",
    privacyPolicy: "隱私政策",
  },
  ja: {
    agreementText: "ログインすることで、私たちの",
    termsOfService: "利用規約",
    and: "と",
    privacyPolicy: "プライバシーポリシー",
  },
};
