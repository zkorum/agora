import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ProjectPageFooterTranslations {
  poweredBy: string;
  homeAriaLabel: string;
  termsOfService: string;
  privacyPolicy: string;
}

export const projectPageFooterTranslations: Readonly<
  Record<SupportedDisplayLanguageCodes, ProjectPageFooterTranslations>
> = {
  en: {
    poweredBy: "Powered by",
    homeAriaLabel: "Go to Agora Citizen Network home",
    termsOfService: "Terms of Service",
    privacyPolicy: "Privacy Policy",
  },
  es: {
    poweredBy: "Con tecnología de",
    homeAriaLabel: "Ir al inicio de Agora Citizen Network",
    termsOfService: "Términos de servicio",
    privacyPolicy: "Política de privacidad",
  },
  fr: {
    poweredBy: "Propulsé par",
    homeAriaLabel: "Aller à l'accueil d'Agora Citizen Network",
    termsOfService: "Conditions d'utilisation",
    privacyPolicy: "Politique de confidentialité",
  },
  "zh-Hans": {
    poweredBy: "技术支持",
    homeAriaLabel: "前往 Agora Citizen Network 首页",
    termsOfService: "服务条款",
    privacyPolicy: "隐私政策",
  },
  "zh-Hant": {
    poweredBy: "技術支援",
    homeAriaLabel: "前往 Agora Citizen Network 首頁",
    termsOfService: "服務條款",
    privacyPolicy: "隱私政策",
  },
  ja: {
    poweredBy: "提供",
    homeAriaLabel: "Agora Citizen Network ホームへ移動",
    termsOfService: "利用規約",
    privacyPolicy: "プライバシーポリシー",
  },
  ar: {
    poweredBy: "مدعوم من",
    homeAriaLabel: "الانتقال إلى الصفحة الرئيسية لـ Agora Citizen Network",
    termsOfService: "شروط الخدمة",
    privacyPolicy: "سياسة الخصوصية",
  },
  fa: {
    poweredBy: "قدرت‌گرفته از",
    homeAriaLabel: "رفتن به صفحه اصلی Agora Citizen Network",
    termsOfService: "شرایط استفاده",
    privacyPolicy: "سیاست حریم خصوصی",
  },
  he: {
    poweredBy: "מופעל על ידי",
    homeAriaLabel: "מעבר לדף הבית של Agora Citizen Network",
    termsOfService: "תנאי שימוש",
    privacyPolicy: "מדיניות פרטיות",
  },
  ky: {
    poweredBy: "Түзгөн",
    homeAriaLabel: "Agora Citizen Network башкы бетине өтүү",
    termsOfService: "Кызмат көрсөтүү шарттары",
    privacyPolicy: "Купуялык саясаты",
  },
  ru: {
    poweredBy: "Работает на",
    homeAriaLabel: "Перейти на главную Agora Citizen Network",
    termsOfService: "Условия использования",
    privacyPolicy: "Политика конфиденциальности",
  },
};
