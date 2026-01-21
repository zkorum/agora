import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface CommentComposerTranslations {
  placeholder: string;
  placeholderExpanded: string;
  postButton: string;
  conversationLockedError: string;
  conversationClosedError: string;
  createOpinionError: string;
  eventTicketRequiredTitle: string;
  eventTicketRequiredMessage: string;
  exitPromptTitle: string;
  exitPromptDescription: string;
  validationWarningMultipleIdeas: string;
}

export const commentComposerTranslations: Record<
  SupportedDisplayLanguageCodes,
  CommentComposerTranslations
> = {
  en: {
    placeholder: "Add your own opinion",
    placeholderExpanded: "Focus on a single point that's easy to agree or disagree with",
    postButton: "Post",
    conversationLockedError:
      "Cannot create opinion because the conversation is locked",
    conversationClosedError:
      "This conversation has been closed",
    createOpinionError: "Error while trying to create a new opinion",
    eventTicketRequiredTitle: "Event Ticket Required",
    eventTicketRequiredMessage:
      "You need to verify your Devconnect 2025 ticket to participate in this conversation.",
    exitPromptTitle: "Save opinion as draft?",
    exitPromptDescription: "Your draft opinion will be here when you return.",
    validationWarningMultipleIdeas:
      "Tip: This might contain multiple ideas - make sure voters can clearly agree or disagree",
  },
  ar: {
    placeholder: "أضف رأيك",
    placeholderExpanded: "ركز على نقطة واحدة يسهل الموافقة عليها أو الاختلاف معها",
    postButton: "نشر",
    conversationLockedError: "لا يمكن إنشاء رأي لأن المحادثة مقفلة",
    conversationClosedError:
      "تم إغلاق هذه المحادثة",
    createOpinionError: "خطأ أثناء محاولة إنشاء رأي جديد",
    eventTicketRequiredTitle: "تذكرة الحدث مطلوبة",
    eventTicketRequiredMessage:
      "تحتاج إلى التحقق من تذكرة Devconnect 2025 الخاصة بك للمشاركة في هذه المحادثة.",
    exitPromptTitle: "حفظ الرأي كمسودة؟",
    exitPromptDescription: "ستكون مسودتك هنا عند عودتك.",
    validationWarningMultipleIdeas:
      "نصيحة: قد يحتوي هذا على أفكار متعددة - تأكد من أن المصوتين يمكنهم الموافقة أو عدم الموافقة بوضوح",
  },
  es: {
    placeholder: "Añade tu propia opinión",
    placeholderExpanded: "Enfócate en un solo punto con el que sea fácil estar de acuerdo o en desacuerdo",
    postButton: "Publicar",
    conversationLockedError:
      "No se puede crear una opinión porque la conversación está bloqueada",
    conversationClosedError:
      "Esta conversación ha sido cerrada",
    createOpinionError: "Error al intentar crear una nueva opinión",
    eventTicketRequiredTitle: "Entrada del evento requerida",
    eventTicketRequiredMessage:
      "Necesitas verificar tu entrada de Devconnect 2025 para participar en esta conversación.",
    exitPromptTitle: "¿Guardar opinión como borrador?",
    exitPromptDescription: "Tu borrador estará aquí cuando regreses.",
    validationWarningMultipleIdeas:
      "Consejo: Esto podría contener múltiples ideas - asegúrate de que los votantes puedan estar claramente de acuerdo o en desacuerdo",
  },
  fr: {
    placeholder: "Ajoutez votre propre opinion",
    placeholderExpanded: "Concentrez-vous sur un seul point avec lequel il est facile d'être d'accord ou en désaccord",
    postButton: "Publier",
    conversationLockedError:
      "Impossible de créer une opinion car la conversation est verrouillée",
    conversationClosedError:
      "Cette conversation a été fermée",
    createOpinionError:
      "Erreur lors de la tentative de création d'une nouvelle opinion",
    eventTicketRequiredTitle: "Billet d'événement requis",
    eventTicketRequiredMessage:
      "Vous devez vérifier votre billet Devconnect 2025 pour participer à cette conversation.",
    exitPromptTitle: "Enregistrer l'opinion comme brouillon ?",
    exitPromptDescription: "Votre brouillon sera ici à votre retour.",
    validationWarningMultipleIdeas:
      "Conseil : Ceci pourrait contenir plusieurs idées - assurez-vous que les votants puissent clairement être d'accord ou en désaccord",
  },
  "zh-Hans": {
    placeholder: "添加你自己的意见",
    placeholderExpanded: "专注于一个容易同意或不同意的单一观点",
    postButton: "发布",
    conversationLockedError: "无法创建意见，因为对话已锁定",
    conversationClosedError:
      "此对话已被关闭",
    createOpinionError: "尝试创建新意见时出错",
    eventTicketRequiredTitle: "需要活动门票",
    eventTicketRequiredMessage:
      "您需要验证您的 Devconnect 2025 门票才能参与此对话。",
    exitPromptTitle: "将意见保存为草稿？",
    exitPromptDescription: "您的草稿将在您返回时保留在这里。",
    validationWarningMultipleIdeas:
      "提示：这可能包含多个想法 - 确保投票者可以清楚地同意或不同意",
  },
  "zh-Hant": {
    placeholder: "添加你自己的意見",
    placeholderExpanded: "專注於一個容易同意或不同意的單一觀點",
    postButton: "發布",
    conversationLockedError: "無法創建意見，因為對話已鎖定",
    conversationClosedError:
      "此對話已被關閉",
    createOpinionError: "嘗試創建新意見時出錯",
    eventTicketRequiredTitle: "需要活動門票",
    eventTicketRequiredMessage:
      "您需要驗證您的 Devconnect 2025 門票才能參與此對話。",
    exitPromptTitle: "將意見儲存為草稿？",
    exitPromptDescription: "您的草稿將在您返回時保留在這裡。",
    validationWarningMultipleIdeas:
      "提示：這可能包含多個想法 - 確保投票者可以清楚地同意或不同意",
  },
  ja: {
    placeholder: "あなた自身の意見を追加",
    placeholderExpanded: "賛成または反対しやすい単一の論点に焦点を当てる",
    postButton: "投稿",
    conversationLockedError: "会話がロックされているため、意見を作成できません",
    conversationClosedError:
      "この会話は終了しました",
    createOpinionError: "新しい意見を作成しようとした際にエラーが発生しました",
    eventTicketRequiredTitle: "イベントチケットが必要",
    eventTicketRequiredMessage:
      "この会話に参加するには、Devconnect 2025 チケットを確認する必要があります。",
    exitPromptTitle: "意見を下書きとして保存しますか？",
    exitPromptDescription: "下書きは戻ったときにここにあります。",
    validationWarningMultipleIdeas:
      "ヒント：これには複数のアイデアが含まれている可能性があります - 投票者が明確に賛成または反対できることを確認してください",
  },
};
