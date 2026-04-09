import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ConversationSurveyCompleteTranslations {
  title: string;
  description: string;
  continueLabel: string;
  reviewAnswersLabel: string;
}

export const conversationSurveyCompleteTranslations: Record<
  SupportedDisplayLanguageCodes,
  ConversationSurveyCompleteTranslations
> = {
  en: {
    title: "Survey complete",
    description: "Your survey answers are now up to date for this conversation.",
    continueLabel: "Continue",
    reviewAnswersLabel: "Review answers",
  },
  ar: {
    title: "اكتمل الاستبيان",
    description: "إجاباتك على الاستبيان محدّثة الآن لهذه المحادثة.",
    continueLabel: "متابعة",
    reviewAnswersLabel: "مراجعة الإجابات",
  },
  es: {
    title: "Encuesta completada",
    description: "Tus respuestas de la encuesta ya están actualizadas para esta conversación.",
    continueLabel: "Continuar",
    reviewAnswersLabel: "Revisar respuestas",
  },
  fa: {
    title: "نظرسنجی کامل شد",
    description: "پاسخ‌های نظرسنجی شما اکنون برای این گفتگو به‌روز هستند.",
    continueLabel: "ادامه",
    reviewAnswersLabel: "مرور پاسخ‌ها",
  },
  fr: {
    title: "Questionnaire terminé",
    description: "Vos réponses au questionnaire sont maintenant à jour pour cette conversation.",
    continueLabel: "Continuer",
    reviewAnswersLabel: "Voir les réponses",
  },
  he: {
    title: "הסקר הושלם",
    description: "תשובות הסקר שלכם מעודכנות עכשיו לשיחה הזו.",
    continueLabel: "המשך",
    reviewAnswersLabel: "עיון בתשובות",
  },
  ja: {
    title: "アンケート完了",
    description: "この会話に対するアンケート回答は最新の状態になりました。",
    continueLabel: "続ける",
    reviewAnswersLabel: "回答を確認",
  },
  ky: {
    title: "Сурамжылоо аяктады",
    description: "Сурамжылоо жоопторуңуз бул сүйлөшүү үчүн эми актуалдуу.",
    continueLabel: "Улантуу",
    reviewAnswersLabel: "Жоопторду көрүү",
  },
  ru: {
    title: "Опрос завершён",
    description: "Ваши ответы на опрос теперь актуальны для этой беседы.",
    continueLabel: "Продолжить",
    reviewAnswersLabel: "Просмотреть ответы",
  },
  "zh-Hans": {
    title: "问卷已完成",
    description: "你的问卷回答现在已对这场对话保持最新。",
    continueLabel: "继续",
    reviewAnswersLabel: "查看回答",
  },
  "zh-Hant": {
    title: "問卷已完成",
    description: "你的問卷回答現在已對這場對話保持最新。",
    continueLabel: "繼續",
    reviewAnswersLabel: "查看回答",
  },
};
