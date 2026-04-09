import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface SurveyCompletionCountsCardTranslations {
  title: string;
  total: string;
  completeValid: string;
  needsUpdate: string;
  notStarted: string;
  inProgress: string;
  withdrawn: string;
  noSurvey: string;
}

export const surveyCompletionCountsCardTranslations: Record<
  SupportedDisplayLanguageCodes,
  SurveyCompletionCountsCardTranslations
> = {
  en: {
    title: "Survey completion",
    total: "Total",
    completeValid: "Complete and valid",
    needsUpdate: "Needs update",
    notStarted: "Not started",
    inProgress: "In progress",
    withdrawn: "Withdrawn",
    noSurvey: "No survey configured for this conversation.",
  },
  ar: {
    title: "اكتمال الاستبيان",
    total: "الإجمالي",
    completeValid: "مكتمل وصالح",
    needsUpdate: "يحتاج إلى تحديث",
    notStarted: "لم يبدأ",
    inProgress: "قيد التقدم",
    withdrawn: "تم سحبه",
    noSurvey: "لا يوجد استبيان مهيأ لهذه المحادثة.",
  },
  es: {
    title: "Progreso de la encuesta",
    total: "Total",
    completeValid: "Completa y válida",
    needsUpdate: "Necesita actualización",
    notStarted: "No iniciada",
    inProgress: "En progreso",
    withdrawn: "Retirada",
    noSurvey: "No hay una encuesta configurada para esta conversación.",
  },
  fa: {
    title: "وضعیت تکمیل نظرسنجی",
    total: "مجموع",
    completeValid: "کامل و معتبر",
    needsUpdate: "نیاز به به‌روزرسانی دارد",
    notStarted: "شروع نشده",
    inProgress: "در حال انجام",
    withdrawn: "پس گرفته شده",
    noSurvey: "برای این گفتگو هیچ نظرسنجی‌ای تنظیم نشده است.",
  },
  fr: {
    title: "Avancement du questionnaire",
    total: "Total",
    completeValid: "Terminé et valide",
    needsUpdate: "À mettre à jour",
    notStarted: "Non commencé",
    inProgress: "En cours",
    withdrawn: "Retiré",
    noSurvey: "Aucun questionnaire n'est configuré pour cette conversation.",
  },
  he: {
    title: "השלמת הסקר",
    total: "סה״כ",
    completeValid: "הושלם ותקף",
    needsUpdate: "דורש עדכון",
    notStarted: "לא התחיל",
    inProgress: "בתהליך",
    withdrawn: "נמשך",
    noSurvey: "לא הוגדר סקר לשיחה הזו.",
  },
  ja: {
    title: "アンケート完了状況",
    total: "合計",
    completeValid: "完了かつ有効",
    needsUpdate: "更新が必要",
    notStarted: "未開始",
    inProgress: "進行中",
    withdrawn: "取り下げ済み",
    noSurvey: "この会話にはアンケートが設定されていません。",
  },
  ky: {
    title: "Сурамжылоонун аяктоо абалы",
    total: "Жалпы",
    completeValid: "Аяктаган жана жарактуу",
    needsUpdate: "Жаңыртуу керек",
    notStarted: "Баштала элек",
    inProgress: "Жүрүп жатат",
    withdrawn: "Кайтарылып алынган",
    noSurvey: "Бул сүйлөшүү үчүн сурамжылоо орнотулган эмес.",
  },
  ru: {
    title: "Завершение опроса",
    total: "Всего",
    completeValid: "Завершено и актуально",
    needsUpdate: "Требует обновления",
    notStarted: "Не начато",
    inProgress: "В процессе",
    withdrawn: "Отозвано",
    noSurvey: "Для этой беседы опрос не настроен.",
  },
  "zh-Hans": {
    title: "问卷完成情况",
    total: "总数",
    completeValid: "已完成且有效",
    needsUpdate: "需要更新",
    notStarted: "未开始",
    inProgress: "进行中",
    withdrawn: "已撤回",
    noSurvey: "这场对话未配置问卷。",
  },
  "zh-Hant": {
    title: "問卷完成情況",
    total: "總數",
    completeValid: "已完成且有效",
    needsUpdate: "需要更新",
    notStarted: "未開始",
    inProgress: "進行中",
    withdrawn: "已撤回",
    noSurvey: "這場對話未設定問卷。",
  },
};
