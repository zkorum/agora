export interface NewConversationRouteGuardTranslations {
  saveConversationDraft: string;
  draftWillBeHere: string;
  [key: string]: string;
}

export const newConversationRouteGuardTranslations: Record<
  string,
  NewConversationRouteGuardTranslations
> = {
  en: {
    saveConversationDraft: "Save conversation as draft?",
    draftWillBeHere: "Your drafted conversation will be here when you return.",
  },
  es: {
    saveConversationDraft: "¿Guardar conversación como borrador?",
    draftWillBeHere: "Tu borrador de conversación estará aquí cuando regreses.",
  },
  fr: {
    saveConversationDraft: "Sauvegarder la conversation comme brouillon ?",
    draftWillBeHere: "Votre brouillon de conversation sera ici à votre retour.",
  },
  "zh-Hans": {
    saveConversationDraft: "保存对话为草稿？",
    draftWillBeHere: "您的草稿对话将在您返回时在此处。",
  },
  "zh-Hant": {
    saveConversationDraft: "保存對話為草稿？",
    draftWillBeHere: "您的草稿對話將在您返回時在此處。",
  },
  ja: {
    saveConversationDraft: "会話を草稿として保存しますか？",
    draftWillBeHere:
      "あなたの草稿の会話はあなたが戻ってきたときにここにあります。",
  },
};
