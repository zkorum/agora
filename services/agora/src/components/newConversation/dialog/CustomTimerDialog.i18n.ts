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
    chooseWhenPublic: "Choose when your conversation will become public",
    back: "Back",
    confirm: "Confirm",
  },
  ar: {
    selectCustomTime: "تحديد وقت مخصص",
    chooseWhenPublic: "اختر متى ستصبح محادثتك عامة",
    back: "العودة",
    confirm: "تأكيد",
  },
  es: {
    selectCustomTime: "Seleccionar Hora Personalizada",
    chooseWhenPublic: "Elija cuándo su conversación se hará pública",
    back: "Atrás",
    confirm: "Confirmar",
  },
  fr: {
    selectCustomTime: "Sélectionner l'heure personnalisée",
    chooseWhenPublic: "Choisissez quand votre conversation deviendra publique",
    back: "Retour",
    confirm: "Confirmer",
  },
  "zh-Hans": {
    selectCustomTime: "选择自定义时间",
    chooseWhenPublic: "选择何时你的对话应该成为公开的",
    back: "返回",
    confirm: "确认",
  },
  "zh-Hant": {
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
