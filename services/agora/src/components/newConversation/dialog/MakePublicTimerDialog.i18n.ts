export interface MakePublicTimerDialogTranslations {
  never: string;
  after24Hours: string;
  after3Days: string;
  after1Week: string;
  after1Month: string;
  custom: string;
  [key: string]: string;
}

export const makePublicTimerDialogTranslations: Record<
  string,
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
};
