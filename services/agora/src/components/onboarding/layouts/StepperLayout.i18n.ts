import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface StepperLayoutTranslations {
  continue: string;
  stepProgress: string;
}

export const stepperLayoutTranslations: Record<
  SupportedDisplayLanguageCodes,
  StepperLayoutTranslations
> = {
  en: { continue: "Continue", stepProgress: "Step {current} of {total}" },
  de: { continue: "Weiter", stepProgress: "Schritt {current} von {total}" },
  hi: { continue: "जारी रखें", stepProgress: "चरण {current}, {total} में से" },
  ar: { continue: "متابعة", stepProgress: "الخطوة {current} من {total}" },
  es: { continue: "Continuar", stepProgress: "Paso {current} de {total}" },
  fa: { continue: "ادامه", stepProgress: "مرحلهٔ {current} از {total}" },
  fr: { continue: "Continuer", stepProgress: "Étape {current} sur {total}" },
  he: { continue: "המשך", stepProgress: "שלב {current} מתוך {total}" },
  ja: { continue: "続ける", stepProgress: "ステップ {current}/{total}" },
  ky: {
    continue: "Улантуу",
    stepProgress: "{total} кадамдын {current}-кадамы",
  },
  ru: { continue: "Продолжить", stepProgress: "Шаг {current} из {total}" },
  "zh-Hans": {
    continue: "继续",
    stepProgress: "第 {current} 步，共 {total} 步",
  },
  "zh-Hant": {
    continue: "繼續",
    stepProgress: "第 {current} 步，共 {total} 步",
  },
};
