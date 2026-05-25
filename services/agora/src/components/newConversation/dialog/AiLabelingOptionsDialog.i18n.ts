import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface AiLabelingOptionsDialogTranslations {
  aiOnTitle: string;
  aiOnDescription: string;
  aiOffTitle: string;
  aiOffDescription: string;
}

export const aiLabelingOptionsDialogTranslations: Record<
  SupportedDisplayLanguageCodes,
  AiLabelingOptionsDialogTranslations
> = {
  en: {
    aiOnTitle: "LLM on",
    aiOnDescription:
      "Use an LLM to create labels and summaries for opinion groups.",
    aiOffTitle: "LLM off",
    aiOffDescription:
      "Do not use an LLM to create labels and summaries for opinion groups.",
  },
  ar: {
    aiOnTitle: "LLM مفعّل",
    aiOnDescription:
      "استخدام نموذج لغوي كبير لإنشاء تسميات وملخصات لمجموعات الرأي.",
    aiOffTitle: "LLM معطّل",
    aiOffDescription:
      "عدم استخدام نموذج لغوي كبير لإنشاء تسميات وملخصات لمجموعات الرأي.",
  },
  es: {
    aiOnTitle: "LLM activado",
    aiOnDescription:
      "Usar un LLM para crear etiquetas y resúmenes de los grupos de opinión.",
    aiOffTitle: "LLM desactivado",
    aiOffDescription:
      "No usar un LLM para crear etiquetas y resúmenes de los grupos de opinión.",
  },
  fa: {
    aiOnTitle: "LLM فعال",
    aiOnDescription:
      "استفاده از مدل زبانی بزرگ برای ایجاد برچسب‌ها و خلاصه‌ها برای گروه‌های نظر.",
    aiOffTitle: "LLM غیرفعال",
    aiOffDescription:
      "از مدل زبانی بزرگ برای ایجاد برچسب‌ها و خلاصه‌ها برای گروه‌های نظر استفاده نکنید.",
  },
  fr: {
    aiOnTitle: "LLM activé",
    aiOnDescription:
      "Utiliser un LLM pour créer des labels et des résumés pour les groupes d'opinion.",
    aiOffTitle: "LLM désactivé",
    aiOffDescription:
      "Ne pas utiliser de LLM pour créer des labels et des résumés pour les groupes d'opinion.",
  },
  "zh-Hans": {
    aiOnTitle: "LLM 开启",
    aiOnDescription: "使用 LLM 为观点组创建标签和摘要。",
    aiOffTitle: "LLM 关闭",
    aiOffDescription: "不使用 LLM 为观点组创建标签和摘要。",
  },
  "zh-Hant": {
    aiOnTitle: "LLM 開啟",
    aiOnDescription: "使用 LLM 為觀點群組建立標籤和摘要。",
    aiOffTitle: "LLM 關閉",
    aiOffDescription: "不使用 LLM 為觀點群組建立標籤和摘要。",
  },
  he: {
    aiOnTitle: "LLM מופעל",
    aiOnDescription:
      "שימוש ב-LLM ליצירת תוויות וסיכומים לקבוצות דעה.",
    aiOffTitle: "LLM כבוי",
    aiOffDescription:
      "לא להשתמש ב-LLM ליצירת תוויות וסיכומים לקבוצות דעה.",
  },
  ja: {
    aiOnTitle: "LLM オン",
    aiOnDescription:
      "LLM を使用して意見グループのラベルと要約を作成します。",
    aiOffTitle: "LLM オフ",
    aiOffDescription:
      "LLM を使用して意見グループのラベルと要約を作成しません。",
  },
  ky: {
    aiOnTitle: "LLM иштетилген",
    aiOnDescription:
      "Пикир топтору үчүн энбелгилерди жана кыскача баяндамаларды түзүүдө LLM колдонулат.",
    aiOffTitle: "LLM өчүрүлгөн",
    aiOffDescription:
      "Пикир топтору үчүн энбелгилерди жана кыскача баяндамаларды түзүүдө LLM колдонулбайт.",
  },
  ru: {
    aiOnTitle: "LLM включена",
    aiOnDescription:
      "Использовать LLM для создания меток и сводок для групп мнений.",
    aiOffTitle: "LLM выключена",
    aiOffDescription:
      "Не использовать LLM для создания меток и сводок для групп мнений.",
  },
};
