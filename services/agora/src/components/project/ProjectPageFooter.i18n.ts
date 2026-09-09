import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ProjectPageFooterTranslations {
  homeAriaLabel: string;
  termsOfService: string;
  privacyPolicy: string;
}

export const projectPageFooterTranslations: Readonly<
  Record<SupportedDisplayLanguageCodes, ProjectPageFooterTranslations>
> = {
  en: {
    homeAriaLabel: "Go to Agora Citizen Network home",
    termsOfService: "Terms of Service",
    privacyPolicy: "Privacy Policy",
  },
  es: {
    homeAriaLabel: "Ir al inicio de Agora Citizen Network",
    termsOfService: "Términos de servicio",
    privacyPolicy: "Política de privacidad",
  },
  fr: {
    homeAriaLabel: "Aller à l'accueil d'Agora Citizen Network",
    termsOfService: "Conditions d'utilisation",
    privacyPolicy: "Politique de confidentialité",
  },
  "zh-Hans": {
    homeAriaLabel: "前往 Agora Citizen Network 首页",
    termsOfService: "服务条款",
    privacyPolicy: "隐私政策",
  },
  "zh-Hant": {
    homeAriaLabel: "前往 Agora Citizen Network 首頁",
    termsOfService: "服務條款",
    privacyPolicy: "隱私政策",
  },
  ja: {
    homeAriaLabel: "Agora Citizen Network ホームへ移動",
    termsOfService: "利用規約",
    privacyPolicy: "プライバシーポリシー",
  },
  ar: {
    homeAriaLabel: "الانتقال إلى الصفحة الرئيسية لـ Agora Citizen Network",
    termsOfService: "شروط الخدمة",
    privacyPolicy: "سياسة الخصوصية",
  },
  fa: {
    homeAriaLabel: "رفتن به صفحه اصلی Agora Citizen Network",
    termsOfService: "شرایط استفاده",
    privacyPolicy: "سیاست حریم خصوصی",
  },
  he: {
    homeAriaLabel: "מעבר לדף הבית של Agora Citizen Network",
    termsOfService: "תנאי שימוש",
    privacyPolicy: "מדיניות פרטיות",
  },
  ky: {
    homeAriaLabel: "Agora Citizen Network башкы бетине өтүү",
    termsOfService: "Кызмат көрсөтүү шарттары",
    privacyPolicy: "Купуялык саясаты",
  },
  ru: {
    homeAriaLabel: "Перейти на главную Agora Citizen Network",
    termsOfService: "Условия использования",
    privacyPolicy: "Политика конфиденциальности",
  },
};
