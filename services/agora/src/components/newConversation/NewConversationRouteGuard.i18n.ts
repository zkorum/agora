import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface NewConversationRouteGuardTranslations {
  saveConversationDraft: string;
  draftWillBeHere: string;
}

export const newConversationRouteGuardTranslations: Record<
  SupportedDisplayLanguageCodes,
  NewConversationRouteGuardTranslations
> = {
  en: {
    saveConversationDraft: "Save conversation as draft?",
    draftWillBeHere: "Your drafted conversation will be here when you return.",
  },
  ar: {
    saveConversationDraft: "حفظ المحادثة كمسودة؟",
    draftWillBeHere: "ستكون مسودة محادثتك هنا عند عودتك.",
  },
  es: {
    saveConversationDraft: "¿Guardar conversación como borrador?",
    draftWillBeHere: "Tu borrador de conversación estará aquí cuando regreses.",
  },
  fa: {
    saveConversationDraft: "گفتگو به عنوان پیش‌نویس ذخیره شود؟",
    draftWillBeHere: "پیش‌نویس گفتگوی شما هنگام بازگشت اینجا خواهد بود.",
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
  he: {
    saveConversationDraft: "לשמור את השיחה כטיוטה?",
    draftWillBeHere: "טיוטת השיחה שלך תהיה כאן כשתחזור.",
  },
  ja: {
    saveConversationDraft: "会話を下書きとして保存しますか？",
    draftWillBeHere: "戻ってきたら、下書きした会話がここに表示されます。",
  },
  ky: {
    saveConversationDraft: "Талкууну черновик катары сактайсызбы?",
    draftWillBeHere: "Кайтып келгениңизде черновик талкууңуз бул жерде болот.",
  },
  ru: {
    saveConversationDraft: "Сохранить обсуждение как черновик?",
    draftWillBeHere: "Ваш черновик обсуждения будет здесь, когда вы вернётесь.",
  },
};
