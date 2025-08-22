export interface CustomTimerDialogTranslations {
  selectCustomTime: string;
  chooseWhenPublic: string;
  back: string;
  confirm: string;
  [key: string]: string;
}

export const customTimerDialogTranslations: Record<
  string,
  CustomTimerDialogTranslations
> = {
  en: {
    selectCustomTime: "Select Custom Time",
    chooseWhenPublic: "Choose when your conversation should become public",
    back: "Back",
    confirm: "Confirm",
  },
  es: {
    selectCustomTime: "Seleccionar Hora Personalizada",
    chooseWhenPublic: "Elige cuándo tu conversación debería hacerse pública",
    back: "Atrás",
    confirm: "Confirmar",
  },
  fr: {
    selectCustomTime: "Sélectionner l'heure personnalisée",
    chooseWhenPublic:
      "Choisissez quand votre conversation devrait devenir publique",
    back: "Retour",
    confirm: "Confirmer",
  },
};
