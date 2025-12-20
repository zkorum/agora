import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface CommentComposerTranslations {
  placeholder: string;
  postButton: string;
  conversationLockedError: string;
  createOpinionError: string;
  eventTicketRequiredTitle: string;
  eventTicketRequiredMessage: string;
  exitPromptTitle: string;
  exitPromptDescription: string;
}

export const commentComposerTranslations: Record<
  SupportedDisplayLanguageCodes,
  CommentComposerTranslations
> = {
  en: {
    placeholder: "Add your own opinion",
    postButton: "Post",
    conversationLockedError:
      "Cannot create opinion because the conversation is locked",
    createOpinionError: "Error while trying to create a new opinion",
    eventTicketRequiredTitle: "Event Ticket Required",
    eventTicketRequiredMessage:
      "You need to verify your Devconnect 2025 ticket to participate in this conversation.",
    exitPromptTitle: "Save opinion as draft?",
    exitPromptDescription: "Your draft opinion will be here when you return.",
  },
  ar: {
    placeholder: "أضف رأيك الخاص",
    postButton: "نشر",
    conversationLockedError: "لا يمكن إنشاء رأي لأن المحادثة مقفلة",
    createOpinionError: "خطأ أثناء محاولة إنشاء رأي جديد",
    eventTicketRequiredTitle: "تذكرة الحدث مطلوبة",
    eventTicketRequiredMessage:
      "تحتاج إلى التحقق من تذكرة Devconnect 2025 الخاصة بك للمشاركة في هذه المحادثة.",
    exitPromptTitle: "حفظ الرأي كمسودة؟",
    exitPromptDescription: "ستكون مسودتك هنا عند عودتك.",
  },
  es: {
    placeholder: "Añade tu propia opinión",
    postButton: "Publicar",
    conversationLockedError:
      "No se puede crear una opinión porque la conversación está bloqueada",
    createOpinionError: "Error al intentar crear una nueva opinión",
    eventTicketRequiredTitle: "Entrada del evento requerida",
    eventTicketRequiredMessage:
      "Necesitas verificar tu entrada de Devconnect 2025 para participar en esta conversación.",
    exitPromptTitle: "¿Guardar opinión como borrador?",
    exitPromptDescription: "Tu borrador estará aquí cuando regreses.",
  },
  fr: {
    placeholder: "Ajoutez votre propre opinion",
    postButton: "Publier",
    conversationLockedError:
      "Impossible de créer une opinion car la conversation est verrouillée",
    createOpinionError:
      "Erreur lors de la tentative de création d'une nouvelle opinion",
    eventTicketRequiredTitle: "Billet d'événement requis",
    eventTicketRequiredMessage:
      "Vous devez vérifier votre billet Devconnect 2025 pour participer à cette conversation.",
    exitPromptTitle: "Enregistrer l'opinion comme brouillon ?",
    exitPromptDescription: "Votre brouillon sera ici à votre retour.",
  },
  "zh-Hans": {
    placeholder: "添加您自己的意见",
    postButton: "发布",
    conversationLockedError: "无法创建意见，因为对话已锁定",
    createOpinionError: "尝试创建新意见时出错",
    eventTicketRequiredTitle: "需要活动门票",
    eventTicketRequiredMessage:
      "您需要验证您的 Devconnect 2025 门票才能参与此对话。",
    exitPromptTitle: "将意见保存为草稿？",
    exitPromptDescription: "您的草稿将在您返回时保留在这里。",
  },
  "zh-Hant": {
    placeholder: "添加您自己的意見",
    postButton: "發布",
    conversationLockedError: "無法創建意見，因為對話已鎖定",
    createOpinionError: "嘗試創建新意見時出錯",
    eventTicketRequiredTitle: "需要活動門票",
    eventTicketRequiredMessage:
      "您需要驗證您的 Devconnect 2025 門票才能參與此對話。",
    exitPromptTitle: "將意見儲存為草稿？",
    exitPromptDescription: "您的草稿將在您返回時保留在這裡。",
  },
  ja: {
    placeholder: "あなた自身の意見を追加",
    postButton: "投稿",
    conversationLockedError: "会話がロックされているため、意見を作成できません",
    createOpinionError: "新しい意見を作成しようとした際にエラーが発生しました",
    eventTicketRequiredTitle: "イベントチケットが必要",
    eventTicketRequiredMessage:
      "この会話に参加するには、Devconnect 2025 チケットを確認する必要があります。",
    exitPromptTitle: "意見を下書きとして保存しますか？",
    exitPromptDescription: "下書きは戻ったときにここにあります。",
  },
};
