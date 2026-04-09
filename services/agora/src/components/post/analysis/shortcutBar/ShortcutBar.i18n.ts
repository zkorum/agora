import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ShortcutBarTranslations {
  summary: string;
  me: string;
  agreements: string;
  disagreements: string;
  divisive: string;
  groups: string;
  survey: string;
}

export const shortcutBarTranslations: Record<SupportedDisplayLanguageCodes, ShortcutBarTranslations> =
  {
    en: {
      summary: "Summary",
      me: "Me",
      agreements: "Approved",
      disagreements: "Rejected",
      divisive: "Divisive",
      groups: "Groups",
      survey: "Survey",
    },
    ar: {
      summary: "ملخص",
      me: "أنا",
      agreements: "معتمدة",
      disagreements: "مرفوضة",
      divisive: "مثير للجدل",
      groups: "مجموعات",
      survey: "استبيان",
    },
    es: {
      summary: "Resumen",
      me: "Yo",
      agreements: "Aprobados",
      disagreements: "Rechazados",
      divisive: "Divisivo",
      groups: "Grupos",
      survey: "Encuesta",
    },
    fa: {
      summary: "خلاصه",
      me: "من",
      agreements: "تأیید شده",
      disagreements: "رد شده",
      divisive: "اختلاف‌برانگیز",
      groups: "گروه‌ها",
      survey: "نظرسنجی",
    },
    fr: {
      summary: "Résumé",
      me: "Moi",
      agreements: "Approuvés",
      disagreements: "Rejetés",
      divisive: "Controversé",
      groups: "Groupes",
      survey: "Questionnaire",
    },
    "zh-Hans": {
      summary: "总结",
      me: "我",
      agreements: "通过",
      disagreements: "否决",
      divisive: "争议",
      groups: "群组",
      survey: "问卷",
    },
    "zh-Hant": {
      summary: "總結",
      me: "我",
      agreements: "通過",
      disagreements: "否決",
      divisive: "爭議",
      groups: "群組",
      survey: "問卷",
    },
    he: {
      summary: "סיכום",
      me: "אני",
      agreements: "אושרו",
      disagreements: "נדחו",
      divisive: "מפלג",
      groups: "קבוצות",
      survey: "סקר",
    },
    ja: {
      summary: "サマリー",
      me: "私",
      agreements: "承認",
      disagreements: "否決",
      divisive: "分断",
      groups: "グループ",
      survey: "アンケート",
    },
    ky: {
      summary: "Корутунду",
      me: "Мен",
      agreements: "Жактырылган",
      disagreements: "Четке кагылган",
      divisive: "Талаштуу",
      groups: "Топтор",
      survey: "Сурамжылоо",
    },
    ru: {
      summary: "Сводка",
      me: "Я",
      agreements: "Одобрено",
      disagreements: "Отклонено",
      divisive: "Спорные",
      groups: "Группы",
      survey: "Опрос",
    },
  };
