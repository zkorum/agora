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
    aiOnTitle: "AI on",
    aiOnDescription:
      "Use generative AI to create labels and summaries for opinion groups.",
    aiOffTitle: "AI off",
    aiOffDescription:
      "Do not use generative AI to create labels and summaries for opinion groups.",
  },
  ar: {
    aiOnTitle: "تشغيل الذكاء الاصطناعي",
    aiOnDescription:
      "استخدام الذكاء الاصطناعي التوليدي لإنشاء تسميات وملخصات لمجموعات الرأي.",
    aiOffTitle: "إيقاف الذكاء الاصطناعي",
    aiOffDescription:
      "عدم استخدام الذكاء الاصطناعي التوليدي لإنشاء تسميات وملخصات لمجموعات الرأي.",
  },
  es: {
    aiOnTitle: "IA activada",
    aiOnDescription:
      "Usar IA generativa para crear etiquetas y resúmenes de los grupos de opinión.",
    aiOffTitle: "IA desactivada",
    aiOffDescription:
      "No usar IA generativa para crear etiquetas y resúmenes de los grupos de opinión.",
  },
  fa: {
    aiOnTitle: "هوش مصنوعی روشن",
    aiOnDescription:
      "استفاده از هوش مصنوعی مولد برای ایجاد برچسب‌ها و خلاصه‌ها برای گروه‌های نظر.",
    aiOffTitle: "هوش مصنوعی خاموش",
    aiOffDescription:
      "از هوش مصنوعی مولد برای ایجاد برچسب‌ها و خلاصه‌ها برای گروه‌های نظر استفاده نکنید.",
  },
  fr: {
    aiOnTitle: "IA activée",
    aiOnDescription:
      "Utiliser l'IA générative pour créer des labels et des résumés pour les groupes d'opinion.",
    aiOffTitle: "IA désactivée",
    aiOffDescription:
      "Ne pas utiliser l'IA générative pour créer des labels et des résumés pour les groupes d'opinion.",
  },
  "zh-Hans": {
    aiOnTitle: "AI 开启",
    aiOnDescription: "使用生成式 AI 为观点组创建标签和摘要。",
    aiOffTitle: "AI 关闭",
    aiOffDescription: "不使用生成式 AI 为观点组创建标签和摘要。",
  },
  "zh-Hant": {
    aiOnTitle: "AI 開啟",
    aiOnDescription: "使用生成式 AI 為觀點群組建立標籤和摘要。",
    aiOffTitle: "AI 關閉",
    aiOffDescription: "不使用生成式 AI 為觀點群組建立標籤和摘要。",
  },
  he: {
    aiOnTitle: "AI פעיל",
    aiOnDescription:
      "שימוש בבינה מלאכותית גנרטיבית ליצירת תוויות וסיכומים לקבוצות דעה.",
    aiOffTitle: "AI כבוי",
    aiOffDescription:
      "לא להשתמש בבינה מלאכותית גנרטיבית ליצירת תוויות וסיכומים לקבוצות דעה.",
  },
  ja: {
    aiOnTitle: "AI オン",
    aiOnDescription:
      "生成 AI を使用して意見グループのラベルと要約を作成します。",
    aiOffTitle: "AI オフ",
    aiOffDescription:
      "生成 AI を使用して意見グループのラベルと要約を作成しません。",
  },
  ky: {
    aiOnTitle: "AI күйүк",
    aiOnDescription:
      "Пикир топтору үчүн энбелгилерди жана кыскача баяндамаларды түзүүдө генеративдүү AI колдонулат.",
    aiOffTitle: "AI өчүк",
    aiOffDescription:
      "Пикир топтору үчүн энбелгилерди жана кыскача баяндамаларды түзүүдө генеративдүү AI колдонулбайт.",
  },
  ru: {
    aiOnTitle: "AI включен",
    aiOnDescription:
      "Использовать генеративный AI для создания меток и сводок для групп мнений.",
    aiOffTitle: "AI выключен",
    aiOffDescription:
      "Не использовать генеративный AI для создания меток и сводок для групп мнений.",
  },
};
