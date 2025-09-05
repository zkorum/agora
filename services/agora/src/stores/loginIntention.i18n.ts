import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface LoginIntentionTranslations {
  newOpinion: string;
  newConversation: string;
  agreement: string;
  reportUserContent: string;
  voting: string;
}

export const welcomeTranslations: Record<
  SupportedDisplayLanguageCodes,
  LoginIntentionTranslations
> = {
  en: {
    newOpinion: "Your written opinion draft will be restored when you return.",
    newConversation:
      "Your written conversation draft will be restored when you return.",
    agreement: "You will be returned to this opinion when you return.",
    reportUserContent: "A user account is required to report user content.",
    voting: "You will be returned to this conversation when you return.",
  },
  ar: {
    newOpinion: "سيتم استعادة مسودة رأيك المكتوب عند عودتك.",
    newConversation: "سيتم استعادة مسودة محادثتك المكتوبة عند عودتك.",
    agreement: "ستعود إلى هذا الرأي عند عودتك.",
    reportUserContent: "مطلوب حساب مستخدم للإبلاغ عن محتوى المستخدم.",
    voting: "ستعود إلى هذه المحادثة عند عودتك.",
  },
  es: {
    newOpinion: "Su borrador se restaurará cuando regrese.",
    newConversation:
      "Su borrador de conversación escrita se restaurará cuando regrese.",
    agreement: "Se le devolverá a esta opinión cuando regrese.",
    reportUserContent:
      "Se requiere una cuenta de usuario para reportar contenido.",
    voting: "Se le devolverá a esta conversación cuando regrese.",
  },
  fr: {
    newOpinion: "Votre brouillon d’opinion sera restauré à votre retour.",
    newConversation:
      "Votre brouillon de conversation sera restauré à votre retour.",
    agreement: "Vous serez redirigé vers cette opinion à votre retour.",
    reportUserContent:
      "Un compte utilisateur est requis pour signaler du contenu.",
    voting: "Vous serez redirigé vers cette conversation à votre retour.",
  },
  "zh-Hant": {
    newOpinion: "您撰寫的意見草稿將在您返回時恢復。",
    newConversation: "您撰寫的對話草稿將在您返回時恢復。",
    agreement: "當您返回時，將回到此意見。",
    reportUserContent: "檢舉用戶內容需要一個用戶帳號。",
    voting: "當您返回時，將回到此對話。",
  },
  "zh-Hans": {
    newOpinion: "您撰写的意见草稿将在您返回时恢复。",
    newConversation: "您撰写的对话草稿将在您返回时恢复。",
    agreement: "当您返回时，将回到此意见。",
    reportUserContent: "举报用户内容需要一个用户账号。",
    voting: "当您返回时，将回到此对话。",
  },
  ja: {
    newOpinion: "お書きいただいたご意見の下書きは、戻られた際に復元されます。",
    newConversation:
      "お書きいただいた会話の下書きは、戻られた際に復元されます。",
    agreement: "戻られた際に、このご意見に戻ります。",
    reportUserContent:
      "ユーザーコンテンツを報告するには、アカウントが必要です。",
    voting: "戻られた際に、この会話に戻ります。",
  },
};
