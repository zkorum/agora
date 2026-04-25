import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface SurveyAggregatesCardTranslations {
  title: string;
  accessLevel: string;
  rowsLabel: string;
  noSurvey: string;
  noRows: string;
  overallScope: string;
  clusterScope: string;
  suppressed: string;
}

export const surveyAggregatesCardTranslations: Record<
  SupportedDisplayLanguageCodes,
  SurveyAggregatesCardTranslations
> = {
  en: {
    title: "Survey aggregates",
    accessLevel: "Access level: {level}",
    rowsLabel: "Rows: {count}",
    noSurvey: "No survey aggregates are available for this conversation.",
    noRows: "No aggregate rows returned.",
    overallScope: "Overall",
    clusterScope: "Cluster {label}",
    suppressed: "Suppressed",
  },
  ar: {
    title: "ملخصات الاستبيان",
    accessLevel: "مستوى الوصول: {level}",
    rowsLabel: "الصفوف: {count}",
    noSurvey: "لا توجد ملخصات استبيان متاحة لهذه المحادثة.",
    noRows: "لم يتم إرجاع أي صفوف مجمعة.",
    overallScope: "إجمالي",
    clusterScope: "المجموعة {label}",
    suppressed: "محجوب",
  },
  es: {
    title: "Agregados de la encuesta",
    accessLevel: "Nivel de acceso: {level}",
    rowsLabel: "Filas: {count}",
    noSurvey: "No hay agregados de encuesta disponibles para esta conversación.",
    noRows: "No se devolvieron filas agregadas.",
    overallScope: "General",
    clusterScope: "Grupo {label}",
    suppressed: "Suprimido",
  },
  fa: {
    title: "تجمیع‌های نظرسنجی",
    accessLevel: "سطح دسترسی: {level}",
    rowsLabel: "ردیف‌ها: {count}",
    noSurvey: "هیچ تجمیع نظرسنجی‌ای برای این گفتگو در دسترس نیست.",
    noRows: "هیچ ردیف تجمیعی بازگردانده نشد.",
    overallScope: "کلی",
    clusterScope: "خوشه {label}",
    suppressed: "پنهان‌شده",
  },
  fr: {
    title: "Agrégats du questionnaire",
    accessLevel: "Niveau d'accès : {level}",
    rowsLabel: "Lignes : {count}",
    noSurvey: "Aucun agrégat de questionnaire n'est disponible pour cette conversation.",
    noRows: "Aucune ligne agrégée n'a été renvoyée.",
    overallScope: "Global",
    clusterScope: "Cluster {label}",
    suppressed: "Masqué",
  },
  he: {
    title: "צבירי סקר",
    accessLevel: "רמת גישה: {level}",
    rowsLabel: "שורות: {count}",
    noSurvey: "אין נתוני צבירה של סקר זמינים לשיחה הזו.",
    noRows: "לא הוחזרו שורות צבירה.",
    overallScope: "כולל",
    clusterScope: "אשכול {label}",
    suppressed: "מוסתר",
  },
  ja: {
    title: "アンケート集計",
    accessLevel: "アクセスレベル: {level}",
    rowsLabel: "行数: {count}",
    noSurvey: "この会話では利用できるアンケート集計がありません。",
    noRows: "集計行は返されませんでした。",
    overallScope: "全体",
    clusterScope: "クラスタ {label}",
    suppressed: "非表示",
  },
  ky: {
    title: "Сурамжылоо жыйынтыктары",
    accessLevel: "Жеткиликтүүлүк деңгээли: {level}",
    rowsLabel: "Катарлар: {count}",
    noSurvey: "Бул сүйлөшүү үчүн сурамжылоо жыйынтыктары жеткиликтүү эмес.",
    noRows: "Жыйынтык катарлары кайтарылган жок.",
    overallScope: "Жалпы",
    clusterScope: "Кластер {label}",
    suppressed: "Жашырылган",
  },
  ru: {
    title: "Агрегаты опроса",
    accessLevel: "Уровень доступа: {level}",
    rowsLabel: "Строк: {count}",
    noSurvey: "Для этой беседы агрегаты опроса недоступны.",
    noRows: "Агрегированные строки не возвращены.",
    overallScope: "Общее",
    clusterScope: "Кластер {label}",
    suppressed: "Скрыто",
  },
  "zh-Hans": {
    title: "问卷汇总",
    accessLevel: "访问级别：{level}",
    rowsLabel: "行数：{count}",
    noSurvey: "这场对话没有可用的问卷汇总数据。",
    noRows: "未返回汇总行。",
    overallScope: "总体",
    clusterScope: "群组 {label}",
    suppressed: "已隐藏",
  },
  "zh-Hant": {
    title: "問卷彙總",
    accessLevel: "存取層級：{level}",
    rowsLabel: "列數：{count}",
    noSurvey: "這場對話沒有可用的問卷彙總資料。",
    noRows: "未返回彙總列。",
    overallScope: "整體",
    clusterScope: "群組 {label}",
    suppressed: "已隱藏",
  },
};
