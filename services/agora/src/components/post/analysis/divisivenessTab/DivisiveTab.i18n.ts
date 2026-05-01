import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface DivisiveTabTranslations {
  divisiveTitle: string;
  divisiveLongTitle: string;
  divisiveKeyword: string;
  subtitle: string;
  loadMore: string;
  noDivisiveOpinionsMessage: string;
  lowerRankedDivider: string;
}

export const divisiveTabTranslations: Record<
  SupportedDisplayLanguageCodes,
  DivisiveTabTranslations
> = {
  en: {
    divisiveTitle: "Divisive",
    divisiveLongTitle: "What {keyword} people across groups?",
    divisiveKeyword: "divides",
    subtitle:
      "Statements that split opinion groups against each other. Only the most statistically significant are shown first.",
    loadMore: "Load all",
    noDivisiveOpinionsMessage: "No significant divisive statements found yet.",
    lowerRankedDivider: "Less statistically significant",
  },
  ar: {
    divisiveTitle: "مثير للجدل",
    divisiveLongTitle: "ما الذي {keyword} المشاركين عبر مجموعات الرأي؟",
    divisiveKeyword: "يقسم",
    subtitle:
      "مقترحات تقسم مجموعات الرأي ضد بعضها البعض. تُعرض الأكثر دلالة إحصائياً أولاً.",
    loadMore: "تحميل الكل",
    noDivisiveOpinionsMessage: "لم يتم العثور على مقترحات مثيرة للجدل ذات دلالة بعد.",
    lowerRankedDivider: "أقل دلالة إحصائياً",
  },
  es: {
    divisiveTitle: "Divisivo",
    divisiveLongTitle: "¿Qué {keyword} a los participantes entre los grupos de opinión?",
    divisiveKeyword: "divide",
    subtitle:
      "Proposiciones que dividen a los grupos de opinión entre sí. Solo se muestran las más estadísticamente significativas primero.",
    loadMore: "Cargar todo",
    noDivisiveOpinionsMessage:
      "Aún no se encontraron proposiciones divisivas significativas.",
    lowerRankedDivider: "Menos estadísticamente significativas",
  },
  fa: {
    divisiveTitle: "اختلاف‌برانگیز",
    divisiveLongTitle: "چه چیزی افراد را در بین گروه‌ها {keyword}؟",
    divisiveKeyword: "تفرقه می‌اندازد",
    subtitle:
      "گزاره‌هایی که گروه‌های نظر را در برابر یکدیگر قرار می‌دهند. ابتدا فقط مهم‌ترین موارد از نظر آماری نمایش داده می‌شوند.",
    loadMore: "بارگذاری همه",
    noDivisiveOpinionsMessage: "هنوز گزاره اختلاف‌برانگیز مهمی یافت نشده است.",
    lowerRankedDivider: "اهمیت آماری کمتر",
  },
  fr: {
    divisiveTitle: "Controversé",
    divisiveLongTitle: "Qu'est-ce qui {keyword} les participants entre les groupes d'opinion ?",
    divisiveKeyword: "divise",
    subtitle:
      "Propositions qui divisent les groupes d'opinion entre eux. Seules les plus statistiquement significatives sont affichées en premier.",
    loadMore: "Tout charger",
    noDivisiveOpinionsMessage:
      "Aucune proposition controversée significative trouvée pour le moment.",
    lowerRankedDivider: "Moins statistiquement significatives",
  },
  "zh-Hans": {
    divisiveTitle: "分歧",
    divisiveLongTitle: "什么使参与者在各意见群组之间产生{keyword}？",
    divisiveKeyword: "分歧",
    subtitle:
      "使意见群组之间产生对立的观点。仅先显示统计上最显著的观点。",
    loadMore: "全部加载",
    noDivisiveOpinionsMessage: "尚未找到显著的分歧观点。",
    lowerRankedDivider: "统计显著性较低",
  },
  "zh-Hant": {
    divisiveTitle: "分歧",
    divisiveLongTitle: "什麼使參與者在各意見群組之間產生{keyword}？",
    divisiveKeyword: "分歧",
    subtitle:
      "使意見群組之間產生對立的觀點。僅先顯示統計上最顯著的觀點。",
    loadMore: "全部載入",
    noDivisiveOpinionsMessage: "尚未找到顯著的分歧觀點。",
    lowerRankedDivider: "統計顯著性較低",
  },
  he: {
    divisiveTitle: "מפלג",
    divisiveLongTitle: "מה {keyword} את המשתתפים בין הקבוצות?",
    divisiveKeyword: "מפלג",
    subtitle:
      "הצהרות שמפלגות בין קבוצות הדעה. רק המובהקות ביותר מבחינה סטטיסטית מוצגות תחילה.",
    loadMore: "טעינת הכל",
    noDivisiveOpinionsMessage: "טרם נמצאו הצהרות מפלגות מובהקות.",
    lowerRankedDivider: "פחות מובהק מבחינה סטטיסטית",
  },
  ja: {
    divisiveTitle: "分断",
    divisiveLongTitle: "意見グループ間で参加者を{keyword}しているものは何ですか？",
    divisiveKeyword: "分断",
    subtitle:
      "意見グループ同士を対立させる意見です。統計的に最も有意なものが最初に表示されます。",
    loadMore: "すべて読み込む",
    noDivisiveOpinionsMessage: "有意な分断的意見はまだ見つかりません。",
    lowerRankedDivider: "統計的有意性が低い",
  },
  ky: {
    divisiveTitle: "Талаштуу",
    divisiveLongTitle: "Топтор аралык катышуучуларды эмне {keyword}?",
    divisiveKeyword: "бөлөт",
    subtitle:
      "Пикир топторун бири-бирине каршы коюучу пикирлер. Алгач статистикалык жактан эң маанилүүлөрү көрсөтүлөт.",
    loadMore: "Баарын жүктөө",
    noDivisiveOpinionsMessage: "Азырынча маанилүү талаштуу пикирлер табылган жок.",
    lowerRankedDivider: "Статистикалык маанилүүлүгү төмөн",
  },
  ru: {
    divisiveTitle: "Спорные",
    divisiveLongTitle: "Что {keyword} участников между группами?",
    divisiveKeyword: "разделяет",
    subtitle:
      "Высказывания, по которым группы мнений расходятся друг с другом. Сначала показаны наиболее статистически значимые.",
    loadMore: "Загрузить все",
    noDivisiveOpinionsMessage: "Значимых спорных высказываний пока не найдено.",
    lowerRankedDivider: "Менее статистически значимые",
  },
};
