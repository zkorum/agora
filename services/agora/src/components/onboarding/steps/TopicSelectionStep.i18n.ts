export interface TopicSelectionStepTranslations {
  title: string;
  backButton: string;
  closeButton: string;
}

export const topicSelectionStepTranslations: Record<
  string,
  TopicSelectionStepTranslations
> = {
  en: {
    title: "Select topics you're interested in to get started",
    backButton: "Back",
    closeButton: "Close",
  },
  es: {
    title: "Selecciona los temas que te interesan para comenzar",
    backButton: "Atrás",
    closeButton: "Cerrar",
  },
  fr: {
    title: "Sélectionnez les sujets qui vous intéressent pour commencer",
    backButton: "Retour",
    closeButton: "Fermer",
  },
  "zh-Hans": {
    title: "选择您感兴趣的话题开始使用",
    backButton: "返回",
    closeButton: "关闭",
  },
  "zh-Hant": {
    title: "選擇您感興趣的話題開始使用",
    backButton: "返回",
    closeButton: "關閉",
  },
  ja: {
    title: "興味のあるトピックを選択して開始",
    backButton: "戻る",
    closeButton: "閉じる",
  },
};
