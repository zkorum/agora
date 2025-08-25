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
  "zh-CN": {
    selectCustomTime: "选择自定义时间",
    chooseWhenPublic: "选择何时你的对话应该成为公开的",
    back: "返回",
    confirm: "确认",
  },
  "zh-TW": {
    selectCustomTime: "選擇自定義時間",
    chooseWhenPublic: "選擇何時你的對話應該成為公開的",
    back: "返回",
    confirm: "確認",
  },
  ja: {
    selectCustomTime: "カスタム時間を選択",
    chooseWhenPublic: "あなたの会話が公開になる時間を選択",
    back: "戻る",
    confirm: "確認",
  },
};
