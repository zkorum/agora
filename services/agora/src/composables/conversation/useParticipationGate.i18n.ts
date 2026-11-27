import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

interface ParticipationGateTranslations {
  participationNeedsOnboarding: string;
  participationUnavailable: string;
}

export const participationGateTranslations: Record<
  SupportedDisplayLanguageCodes,
  ParticipationGateTranslations
> = {
  en: {
    participationUnavailable:
      "This conversation is closed or locked. Participation is unavailable.",
    participationNeedsOnboarding:
      "Your action wasn’t saved. Complete the participation steps, then try again.",
  },
  de: {
    participationUnavailable:
      "Diese Diskussion ist geschlossen oder gesperrt. Die Teilnahme ist nicht möglich.",
    participationNeedsOnboarding:
      "Ihre Aktion wurde nicht gespeichert. Bitte schließen Sie die Teilnahme-Schritte ab und versuchen Sie es erneut.",
  },
  hi: {
    participationUnavailable:
      "यह चर्चा बंद या लॉक है। भाग लेना उपलब्ध नहीं है।",
    participationNeedsOnboarding:
      "आपकी कार्रवाई सहेजी नहीं गई। कृपया भागीदारी के चरण पूरे करें, फिर से प्रयास करें।",
  },
  ar: {
    participationUnavailable:
      "هذه المحادثة مغلقة أو مقفلة. المشاركة غير متاحة.",
    participationNeedsOnboarding:
      "لم يتم حفظ الإجراء. أكمل خطوات المشاركة، ثم حاول مرة أخرى.",
  },
  es: {
    participationUnavailable:
      "Esta conversación está cerrada o bloqueada. No se puede participar.",
    participationNeedsOnboarding:
      "Tu acción no se ha guardado. Completa los pasos de participación y vuelve a intentarlo.",
  },
  fa: {
    participationUnavailable:
      "این گفتگو بسته یا قفل شده است. مشارکت امکان‌پذیر نیست.",
    participationNeedsOnboarding:
      "عملیات شما ذخیره نشد. مراحل مشارکت را تکمیل کنید و دوباره تلاش کنید.",
  },
  fr: {
    participationUnavailable:
      "Cette conversation est fermée ou verrouillée. La participation est indisponible.",
    participationNeedsOnboarding:
      "Votre action n’a pas été enregistrée. Terminez les étapes de participation, puis réessayez.",
  },
  he: {
    participationUnavailable: "השיחה סגורה או נעולה. לא ניתן להשתתף.",
    participationNeedsOnboarding:
      "הפעולה שלך לא נשמרה. יש להשלים את שלבי ההשתתפות ולנסות שוב.",
  },
  ja: {
    participationUnavailable:
      "この会話は終了またはロックされているため、参加できません。",
    participationNeedsOnboarding:
      "操作は保存されませんでした。参加手続きを完了してから、もう一度お試しください。",
  },
  ky: {
    participationUnavailable:
      "Бул талкуу жабылган же кулпуланган. Катышуу мүмкүн эмес.",
    participationNeedsOnboarding:
      "Аракетиңиз сакталган жок. Катышуу кадамдарын бүтүрүп, кайра аракет кылыңыз.",
  },
  ru: {
    participationUnavailable:
      "Это обсуждение закрыто или заблокировано. Участие недоступно.",
    participationNeedsOnboarding:
      "Ваше действие не сохранено. Завершите шаги для участия и попробуйте снова.",
  },
  "zh-Hans": {
    participationUnavailable: "此对话已关闭或锁定，无法参与。",
    participationNeedsOnboarding: "您的操作未保存。请完成参与步骤后重试。",
  },
  "zh-Hant": {
    participationUnavailable: "此對話已關閉或鎖定，無法參與。",
    participationNeedsOnboarding: "您的操作未儲存。請完成參與步驟後重試。",
  },
};
