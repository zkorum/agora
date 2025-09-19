import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ComponentTestingTranslations {
  componentTesting: string;
}

export const componentTestingTranslations: Record<
  SupportedDisplayLanguageCodes,
  ComponentTestingTranslations
> = {
  en: {
    componentTesting: "Component Testing",
  },
  ar: {
    componentTesting: "اختبار المكونات",
  },
  es: {
    componentTesting: "Prueba de componentes",
  },
  fr: {
    componentTesting: "Test de Composants",
  },
  "zh-Hans": {
    componentTesting: "组件测试",
  },
  "zh-Hant": {
    componentTesting: "組件測試",
  },
  ja: {
    componentTesting: "コンポーネントテスト",
  },
};
