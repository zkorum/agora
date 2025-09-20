import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface MakePublicTimerDialogTranslations {
  never: string;
  after24Hours: string;
  after3Days: string;
  after1Week: string;
  after1Month: string;
  custom: string;
}

export const makePublicTimerDialogTranslations: Record<
  SupportedDisplayLanguageCodes,
  MakePublicTimerDialogTranslations
> = {
  en: {
    never: "Never",
    after24Hours: "After 24 hours",
    after3Days: "After 3 days",
    after1Week: "After 1 week",
    after1Month: "After 1 month",
    custom: "Custom",
  },
  ar: {
    never: "أبداً",
    after24Hours: "بعد 24 ساعة",
    after3Days: "بعد 3 أيام",
    after1Week: "بعد أسبوع",
    after1Month: "بعد شهر",
    custom: "مخصص",
  },
  es: {
    never: "Nunca",
    after24Hours: "Después de 24 horas",
    after3Days: "Después de 3 días",
    after1Week: "Después de 1 semana",
    after1Month: "Después de 1 mes",
    custom: "Personalizado",
  },
  fr: {
    never: "Jamais",
    after24Hours: "Après 24 heures",
    after3Days: "Après 3 jours",
    after1Week: "Après 1 semaine",
    after1Month: "Après 1 mois",
    custom: "Personnalisé",
  },
  "zh-Hans": {
    never: "从不",
    after24Hours: "24小时后",
    after3Days: "3天后",
    after1Week: "1周后",
    after1Month: "1个月后",
    custom: "自定义",
  },
  "zh-Hant": {
    never: "永不",
    after24Hours: "24小時後",
    after3Days: "3天後",
    after1Week: "1週後",
    after1Month: "1個月後",
    custom: "自定義",
  },
  ja: {
    never: "決して",
    after24Hours: "24時間後",
    after3Days: "3日後",
    after1Week: "1週間後",
    after1Month: "1ヶ月後",
    custom: "カスタム",
  },
};
