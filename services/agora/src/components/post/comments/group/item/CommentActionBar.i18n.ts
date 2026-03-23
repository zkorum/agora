import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface CommentActionBarTranslations {
  disagree: string;
  pass: string;
  agree: string;
  voteFailed: string;
  conversationClosed: string;
  closedConversationTooltip: string;
  disagreeAriaLabel: string;
  passAriaLabel: string;
  agreeAriaLabel: string;
  // Vote unlock banner
  keepVotingToDiscoverGroup: string;
  keepVotingToRefineAnalysis: string;
  assignedGroup: string;
  viewAnalysis: string;
}

export const commentActionBarTranslations: Record<
  SupportedDisplayLanguageCodes,
  CommentActionBarTranslations
> = {
  en: {
    disagree: "Disagree",
    pass: "Unsure",
    agree: "Agree",
    voteFailed: "Failed to submit vote. Please try again.",
    conversationClosed:
      "Cannot vote because the conversation was closed by the author.",
    closedConversationTooltip:
      "Voting is disabled - conversation has been closed or locked",
    disagreeAriaLabel: "Disagree with statement. Current disagrees:",
    passAriaLabel: "Unsure about this statement. Current count:",
    agreeAriaLabel: "Agree with statement. Current agrees:",
    keepVotingToDiscoverGroup: "Vote on at least {minVotes} statements to be assigned to a group",
    keepVotingToRefineAnalysis: "Keep voting to refine the analysis",
    assignedGroup: "You have been assigned a group!",
    viewAnalysis: "View analysis",
  },
  ar: {
    disagree: "أرفض",
    pass: "غير متأكد",
    agree: "أوافق",
    voteFailed: "فشل في إرسال التصويت. يرجى المحاولة مرة أخرى.",
    conversationClosed: "لا يمكن التصويت لأن المحادثة تم إغلاقها من قبل المؤلف.",
    closedConversationTooltip:
      "التصويت معطل - تم إغلاق المحادثة أو قفلها",
    disagreeAriaLabel: "أرفض المقترح. عدد الرفض الحالي:",
    passAriaLabel: "لست متأكداً من هذا المقترح. العدد الحالي:",
    agreeAriaLabel: "أوافق على المقترح. عدد الموافقة الحالي:",
    keepVotingToDiscoverGroup: "صوّت على {minVotes} مقترحات على الأقل ليتم تعيينك في مجموعة",
    keepVotingToRefineAnalysis: "استمر في التصويت لتحسين التحليل",
    assignedGroup: "تم تعيينك إلى مجموعة!",
    viewAnalysis: "عرض التحليل",
  },
  es: {
    disagree: "En desacuerdo",
    pass: "No seguro",
    agree: "De acuerdo",
    voteFailed: "Error al enviar el voto. Por favor, inténtelo de nuevo.",
    conversationClosed:
      "No se puede votar porque la conversación fue cerrada por el autor.",
    closedConversationTooltip:
      "La votación está deshabilitada - la conversación ha sido cerrada o bloqueada",
    disagreeAriaLabel: "En desacuerdo con la proposición. Desacuerdos actuales:",
    passAriaLabel: "Inseguro sobre esta proposición. Recuento actual:",
    agreeAriaLabel: "De acuerdo con la proposición. Acuerdos actuales:",
    keepVotingToDiscoverGroup: "Vota en al menos {minVotes} proposiciones para ser asignado a un grupo",
    keepVotingToRefineAnalysis: "Sigue votando para refinar el análisis",
    assignedGroup: "¡Te han asignado un grupo!",
    viewAnalysis: "Ver análisis",
  },
  fa: {
    disagree: "مخالفم",
    pass: "مطمئن نیستم",
    agree: "موافقم",
    voteFailed: "ارسال رأی ناموفق بود. لطفاً دوباره تلاش کنید.",
    conversationClosed: "امکان رأی‌گیری وجود ندارد زیرا گفتگو توسط نویسنده بسته شده است.",
    closedConversationTooltip: "رأی‌گیری غیرفعال است — گفتگو بسته یا قفل شده است",
    disagreeAriaLabel: "مخالفت با گزاره. تعداد فعلی مخالفت‌ها:",
    passAriaLabel: "مطمئن نیستم درباره این گزاره. تعداد فعلی:",
    agreeAriaLabel: "موافقت با گزاره. تعداد فعلی موافقت‌ها:",
    keepVotingToDiscoverGroup: "برای اختصاص به یک گروه حداقل به {minVotes} گزاره رأی دهید",
    keepVotingToRefineAnalysis: "برای دقیق‌تر شدن تحلیل به رأی‌گیری ادامه دهید",
    assignedGroup: "شما به یک گروه اختصاص داده شدید!",
    viewAnalysis: "مشاهده تحلیل",
  },
  fr: {
    disagree: "Pas d'accord",
    pass: "Incertain",
    agree: "D'accord",
    voteFailed: "Échec de l'envoi du vote. Veuillez réessayer.",
    conversationClosed:
      "Impossible de voter car la conversation a été fermée par l'auteur.",
    closedConversationTooltip:
      "Le vote est désactivé - la conversation a été fermée ou verrouillée",
    disagreeAriaLabel: "Pas d'accord avec la proposition. Désaccords actuels:",
    passAriaLabel: "Incertain à propos de cette proposition. Nombre actuel :",
    agreeAriaLabel: "D'accord avec la proposition. Accords actuels:",
    keepVotingToDiscoverGroup: "Votez sur au moins {minVotes} propositions pour être assigné à un groupe",
    keepVotingToRefineAnalysis: "Continuez à voter pour affiner l'analyse",
    assignedGroup: "Vous avez été assigné à un groupe !",
    viewAnalysis: "Voir l'analyse",
  },
  "zh-Hans": {
    disagree: "不同意",
    pass: "不确定",
    agree: "同意",
    voteFailed: "投票提交失败。请重试。",
    conversationClosed: "无法投票，因为对话已被作者关闭。",
    closedConversationTooltip: "投票已禁用 - 对话已被关闭或锁定",
    disagreeAriaLabel: "不同意此观点。当前不同意数：",
    passAriaLabel: "对该观点不确定。当前不确定数：",
    agreeAriaLabel: "同意此观点。当前同意数：",
    keepVotingToDiscoverGroup: "对至少 {minVotes} 条观点投票以被分配到群组",
    keepVotingToRefineAnalysis: "继续投票以完善分析",
    assignedGroup: "您已被分配到一个群组！",
    viewAnalysis: "查看分析",
  },
  "zh-Hant": {
    disagree: "不同意",
    pass: "不確定",
    agree: "同意",
    voteFailed: "投票提交失敗。請重試。",
    conversationClosed: "無法投票，因為對話已被作者關閉。",
    closedConversationTooltip: "投票已禁用 - 對話已被關閉或鎖定",
    disagreeAriaLabel: "不同意此觀點。當前不同意數：",
    passAriaLabel: "對該觀點不確定。當前不確定數：",
    agreeAriaLabel: "同意此觀點。當前同意數：",
    keepVotingToDiscoverGroup: "對至少 {minVotes} 條觀點投票以被分配到群組",
    keepVotingToRefineAnalysis: "繼續投票以完善分析",
    assignedGroup: "您已被分配到一個群組！",
    viewAnalysis: "查看分析",
  },
  he: {
    disagree: "לא מסכים/ה",
    pass: "לא בטוח/ה",
    agree: "מסכים/ה",
    voteFailed: "שליחת ההצבעה נכשלה. אנא נסו שוב.",
    conversationClosed: "לא ניתן להצביע כי השיחה נסגרה על ידי המחבר.",
    closedConversationTooltip: "ההצבעה מושבתת — השיחה נסגרה או ננעלה",
    disagreeAriaLabel: "לא מסכים/ה עם ההצהרה. מספר חוסר הסכמות נוכחי:",
    passAriaLabel: "לא בטוח/ה לגבי הצהרה זו. ספירה נוכחית:",
    agreeAriaLabel: "מסכים/ה עם ההצהרה. מספר הסכמות נוכחי:",
    keepVotingToDiscoverGroup: "הצביעו על לפחות {minVotes} הצהרות כדי להיות משויכים לקבוצה",
    keepVotingToRefineAnalysis: "המשיכו להצביע כדי לחדד את הניתוח",
    assignedGroup: "שויכת לקבוצה!",
    viewAnalysis: "צפייה בניתוח",
  },
  ja: {
    disagree: "不同意",
    pass: "わからない",
    agree: "同意",
    voteFailed: "投票の送信に失敗しました。もう一度お試しください。",
    conversationClosed: "会話が作成者によって閉じられたため、投票できません。",
    closedConversationTooltip:
      "投票は無効です - 会話は閉じられたかロックされています",
    disagreeAriaLabel: "主張に不同意。現在の不同意数：",
    passAriaLabel: "この主張について不確かです。現在の数：",
    agreeAriaLabel: "主張に同意。現在の同意数：",
    keepVotingToDiscoverGroup: "グループに割り当てられるには、少なくとも {minVotes} 件の意見に投票してください",
    keepVotingToRefineAnalysis: "投票を続けて分析を改善しましょう",
    assignedGroup: "グループに割り当てられました！",
    viewAnalysis: "分析を見る",
  },
  ky: {
    disagree: "Макул эмесмин",
    pass: "Белгисиз",
    agree: "Макулмун",
    voteFailed: "Добуш берүү ишке ашкан жок. Кайра аракет кылыңыз.",
    conversationClosed: "Автор талкууну жапкандыктан добуш берүү мүмкүн эмес.",
    closedConversationTooltip:
      "Добуш берүү өчүрүлгөн — талкуу жабылган же кулпуланган",
    disagreeAriaLabel: "Пикирге макул эмес. Учурдагы макул эмес саны:",
    passAriaLabel: "Бул пикир боюнча белгисиз. Учурдагы саны:",
    agreeAriaLabel: "Пикирге макул. Учурдагы макул саны:",
    keepVotingToDiscoverGroup: "Топко дайындалуу үчүн кеминде {minVotes} пикирге добуш бериңиз",
    keepVotingToRefineAnalysis: "Анализди тактоо үчүн добуш берүүнү улантыңыз",
    assignedGroup: "Сизге топ дайындалды!",
    viewAnalysis: "Анализди көрүү",
  },
  ru: {
    disagree: "Не согласен",
    pass: "Не уверен",
    agree: "Согласен",
    voteFailed: "Не удалось отправить голос. Пожалуйста, попробуйте снова.",
    conversationClosed: "Невозможно голосовать, так как обсуждение закрыто автором.",
    closedConversationTooltip:
      "Голосование отключено — обсуждение закрыто или заблокировано",
    disagreeAriaLabel: "Не согласен с высказыванием. Текущее количество несогласных:",
    passAriaLabel: "Не уверен по поводу этого высказывания. Текущее количество:",
    agreeAriaLabel: "Согласен с высказыванием. Текущее количество согласных:",
    keepVotingToDiscoverGroup: "Проголосуйте минимум за {minVotes} высказываний, чтобы быть распределённым в группу",
    keepVotingToRefineAnalysis: "Продолжайте голосовать для уточнения анализа",
    assignedGroup: "Вам назначена группа!",
    viewAnalysis: "Посмотреть анализ",
  },
};
