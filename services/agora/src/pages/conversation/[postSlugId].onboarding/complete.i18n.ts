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
    title: "Answers saved",
    description: "You can now vote on statements in this consultation.",
    continueLabel: "Continue",
    reviewAnswersLabel: "View my answers",
  },
  ar: {
    title: "تم حفظ الإجابات",
    description: "يمكنك الآن التصويت على المقترحات في هذه الاستشارة.",
    continueLabel: "متابعة",
    reviewAnswersLabel: "عرض إجاباتي",
  },
  es: {
    title: "Respuestas guardadas",
    description: "Ahora puedes votar en proposiciones en esta consulta.",
    continueLabel: "Continuar",
    reviewAnswersLabel: "Ver mis respuestas",
  },
  fa: {
    title: "پاسخ‌ها ذخیره شدند",
    description: "اکنون می‌توانید به گزاره‌های این مشورت رأی دهید.",
    continueLabel: "ادامه",
    reviewAnswersLabel: "مشاهده پاسخ‌های من",
  },
  fr: {
    title: "Réponses enregistrées",
    description: "Vous pouvez maintenant voter sur les propositions de la consultation.",
    continueLabel: "Continuer",
    reviewAnswersLabel: "Voir mes réponses",
  },
  he: {
    title: "התשובות נשמרו",
    description: "אפשר עכשיו להצביע על הצהרות בהתייעצות הזו.",
    continueLabel: "המשך",
    reviewAnswersLabel: "הצגת התשובות שלי",
  },
  ja: {
    title: "回答を保存しました",
    description: "この相談の意見に投票できるようになりました。",
    continueLabel: "続ける",
    reviewAnswersLabel: "自分の回答を見る",
  },
  ky: {
    title: "Жооптор сакталды",
    description: "Эми бул кеңешүүдөгү пикирлерге добуш бере аласыз.",
    continueLabel: "Улантуу",
    reviewAnswersLabel: "Жоопторумду көрүү",
  },
  ru: {
    title: "Ответы сохранены",
    description: "Теперь вы можете голосовать за высказывания в этой консультации.",
    continueLabel: "Продолжить",
    reviewAnswersLabel: "Посмотреть мои ответы",
  },
  "zh-Hans": {
    title: "回答已保存",
    description: "你现在可以对本次咨询中的意见投票。",
    continueLabel: "继续",
    reviewAnswersLabel: "查看我的回答",
  },
  "zh-Hant": {
    title: "回答已儲存",
    description: "你現在可以對本次諮詢中的意見投票。",
    continueLabel: "繼續",
    reviewAnswersLabel: "查看我的回答",
  },
};
