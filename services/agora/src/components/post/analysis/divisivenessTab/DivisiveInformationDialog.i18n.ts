import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface DivisiveInformationDialogTranslations {
  title: string;
  description: string;
}

export const divisiveInformationDialogTranslations: Record<
  SupportedDisplayLanguageCodes,
  DivisiveInformationDialogTranslations
> = {
  en: {
    title: "Divisive Statements",
    description:
      "Statements where opinion groups disagree with each other. One group approves while another rejects.\n\nThese reveal the key dividing lines in the conversation.\n\nOnly the most statistically significant are shown first.",
  },
  ar: {
    title: "المقترحات المثيرة للانقسام",
    description:
      "مقترحات تختلف حولها مجموعات الرأي مع بعضها البعض. مجموعة تعتمد بينما أخرى ترفض.\n\nتكشف هذه عن خطوط الانقسام الرئيسية في النقاش.\n\nتُعرض الأكثر دلالة إحصائياً أولاً.",
  },
  es: {
    title: "Proposiciones Divisivas",
    description:
      "Proposiciones en las que los grupos de opinión no están de acuerdo entre sí. Un grupo aprueba mientras otro rechaza.\n\nRevelan las principales líneas divisorias en la conversación.\n\nSolo se muestran las más estadísticamente significativas primero.",
  },
  fa: {
    title: "گزاره‌های اختلاف‌برانگیز",
    description:
      "گزاره‌هایی که گروه‌های نظر در مورد آنها با یکدیگر اختلاف دارند. یک گروه تأیید می‌کند و گروه دیگر رد می‌کند.\n\nاینها خطوط اصلی تفرقه در گفتگو را آشکار می‌کنند.\n\nابتدا فقط مهم‌ترین موارد از نظر آماری نمایش داده می‌شوند.",
  },
  fr: {
    title: "Propositions Clivantes",
    description:
      "Propositions sur lesquelles les groupes d'opinion sont en désaccord entre eux. Un groupe approuve tandis qu'un autre rejette.\n\nElles révèlent les principales lignes de fracture de la conversation.\n\nSeules les plus statistiquement significatives sont affichées en premier.",
  },
  "zh-Hans": {
    title: "争议性观点",
    description:
      "意见群组之间产生分歧的观点。一个群组认可而另一个群组否决。\n\n这些揭示了对话中的主要分歧线。\n\n仅先显示统计上最显著的观点。",
  },
  "zh-Hant": {
    title: "爭議性觀點",
    description:
      "意見群組之間產生分歧的觀點。一個群組認可而另一個群組否決。\n\n這些揭示了對話中的主要分歧線。\n\n僅先顯示統計上最顯著的觀點。",
  },
  he: {
    title: "הצהרות מפלגות",
    description:
      "הצהרות שקבוצות הדעה חלוקות לגביהן. קבוצה אחת מאשרת בעוד אחרת דוחה.\n\nאלו חושפות את קווי החלוקה המרכזיים בשיחה.\n\nרק המובהקות ביותר מבחינה סטטיסטית מוצגות תחילה.",
  },
  ja: {
    title: "分断的な意見",
    description:
      "意見グループ同士が対立する意見です。あるグループは承認し、別のグループは否決します。\n\n会話の主要な分断線を明らかにします。\n\n統計的に最も有意なものが最初に表示されます。",
  },
  ky: {
    title: "Талаштуу пикирлер",
    description:
      "Пикир топтору бири-бири менен макул болбогон пикирлер. Бир топ жактырат, экинчиси четке кагат.\n\nБулар талкуудагы негизги бөлүнүү сызыктарын ачып берет.\n\nАлгач статистикалык жактан эң маанилүүлөрү көрсөтүлөт.",
  },
  ru: {
    title: "Спорные высказывания",
    description:
      "Высказывания, по которым группы мнений расходятся друг с другом. Одна группа одобряет, а другая отклоняет.\n\nОни выявляют ключевые линии разделения в обсуждении.\n\nСначала показаны наиболее статистически значимые.",
  },
};
