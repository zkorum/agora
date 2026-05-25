import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface AnalysisPreferenceDialogTranslations {
  recommendedDefaultTitle: string;
  recommendedDefaultDescription: string;
  groupsTitle: string;
  groupsDescription: string;
  unavailableDescription: string;
}

export const analysisPreferenceDialogTranslations: Record<
  SupportedDisplayLanguageCodes,
  AnalysisPreferenceDialogTranslations
> = {
  en: {
    recommendedDefaultTitle: "Recommended default",
    recommendedDefaultDescription:
      "Agora chooses the best-scoring group count for each analysis snapshot.",
    groupsTitle: "{count} groups",
    groupsDescription:
      "Use {count} groups by default when people open the facilitator preference view.",
    unavailableDescription:
      "This setting is not available with your current plan.",
  },
  fr: {
    recommendedDefaultTitle: "Défaut recommandé",
    recommendedDefaultDescription:
      "Agora choisit le nombre de groupes le mieux noté pour chaque instantané d'analyse.",
    groupsTitle: "{count} groupes",
    groupsDescription:
      "Utiliser {count} groupes par défaut dans la vue de préférence du facilitateur.",
    unavailableDescription:
      "Ce paramètre n'est pas disponible avec votre offre actuelle.",
  },
  es: {
    recommendedDefaultTitle: "Predeterminado recomendado",
    recommendedDefaultDescription:
      "Agora elige el número de grupos con mejor puntuación para cada instantánea de análisis.",
    groupsTitle: "{count} grupos",
    groupsDescription:
      "Usar {count} grupos por defecto en la vista de preferencia del facilitador.",
    unavailableDescription:
      "Esta configuración no está disponible con tu plan actual.",
  },
  fa: {
    recommendedDefaultTitle: "پیش‌فرض پیشنهادی",
    recommendedDefaultDescription:
      "Agora بهترین تعداد گروه را برای هر نمای تحلیل انتخاب می‌کند.",
    groupsTitle: "{count} گروه",
    groupsDescription:
      "به طور پیش‌فرض از {count} گروه در نمای ترجیح تسهیل‌گر استفاده شود.",
    unavailableDescription: "این تنظیم در طرح فعلی شما در دسترس نیست.",
  },
  he: {
    recommendedDefaultTitle: "ברירת מחדל מומלצת",
    recommendedDefaultDescription:
      "Agora בוחרת את מספר הקבוצות בעל הציון הטוב ביותר לכל תמונת מצב של ניתוח.",
    groupsTitle: "{count} קבוצות",
    groupsDescription:
      "שימוש ב-{count} קבוצות כברירת מחדל בתצוגת העדפת המנחה.",
    unavailableDescription: "הגדרה זו אינה זמינה בתוכנית הנוכחית שלך.",
  },
  "zh-Hans": {
    recommendedDefaultTitle: "推荐默认值",
    recommendedDefaultDescription: "Agora 会为每个分析快照选择评分最高的分组数。",
    groupsTitle: "{count} 个组",
    groupsDescription: "在引导师偏好视图中默认使用 {count} 个组。",
    unavailableDescription: "此设置不适用于您当前的计划。",
  },
  "zh-Hant": {
    recommendedDefaultTitle: "建議預設值",
    recommendedDefaultDescription: "Agora 會為每個分析快照選擇評分最高的群組數。",
    groupsTitle: "{count} 個群組",
    groupsDescription: "在引導者偏好檢視中預設使用 {count} 個群組。",
    unavailableDescription: "此設定不適用於你目前的方案。",
  },
  ja: {
    recommendedDefaultTitle: "推奨デフォルト",
    recommendedDefaultDescription:
      "Agora は分析スナップショットごとに最もスコアの高いグループ数を選びます。",
    groupsTitle: "{count} グループ",
    groupsDescription:
      "ファシリテーター設定ビューで既定として {count} グループを使用します。",
    unavailableDescription: "この設定は現在のプランでは利用できません。",
  },
  ar: {
    recommendedDefaultTitle: "الافتراضي الموصى به",
    recommendedDefaultDescription:
      "تختار Agora عدد المجموعات الأعلى تقييماً لكل لقطة تحليل.",
    groupsTitle: "{count} مجموعات",
    groupsDescription:
      "استخدام {count} مجموعات افتراضياً في عرض تفضيل الميسر.",
    unavailableDescription: "هذا الإعداد غير متاح في خطتك الحالية.",
  },
  ky: {
    recommendedDefaultTitle: "Recommended default",
    recommendedDefaultDescription:
      "Agora chooses the best-scoring group count for each analysis snapshot.",
    groupsTitle: "{count} groups",
    groupsDescription:
      "Use {count} groups by default when people open the facilitator preference view.",
    unavailableDescription:
      "This setting is not available with your current plan.",
  },
  ru: {
    recommendedDefaultTitle: "Рекомендуемое значение",
    recommendedDefaultDescription:
      "Agora выбирает число групп с лучшей оценкой для каждого снимка анализа.",
    groupsTitle: "{count} групп",
    groupsDescription:
      "Использовать {count} групп по умолчанию в представлении предпочтения фасилитатора.",
    unavailableDescription:
      "Эта настройка недоступна на вашем текущем плане.",
  },
};
