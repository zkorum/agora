import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface GroupConsensusSummaryTranslations {
  groupSummaryTitle: string;
  aiSummaryTitle: string;
  aiSummaryDescription: string;
  aiSummaryPendingDescription: string;
}

export const groupConsensusSummaryTranslations: Record<
  SupportedDisplayLanguageCodes,
  GroupConsensusSummaryTranslations
> = {
  en: {
    groupSummaryTitle: "Group summary",
    aiSummaryTitle: "LLM summary",
    aiSummaryDescription:
      "We use Mistral Large, an LLM model, to generate the summary and labels for each consensus group.",
    aiSummaryPendingDescription:
      "LLM-generated details for this group are still being generated. Agora shows its neutral group label for now and retries in the background.",
  },
  ar: {
    groupSummaryTitle: "ملخص المجموعة",
    aiSummaryTitle: "ملخص LLM",
    aiSummaryDescription:
      "نستعين بـ Mistral Large، وهو نموذج LLM، لإنشاء ملخصات وعناوين لكل مجموعة توافق.",
    aiSummaryPendingDescription:
      "لا تزال تفاصيل LLM لهذه المجموعة قيد الإنشاء. يعرض Agora تسميتها المحايدة مؤقتًا ويعيد المحاولة في الخلفية.",
  },
  es: {
    groupSummaryTitle: "Resumen del grupo",
    aiSummaryTitle: "Resumen LLM",
    aiSummaryDescription:
      "Utilizamos Mistral Large, un modelo LLM, para generar el resumen y las etiquetas de cada grupo de consenso.",
    aiSummaryPendingDescription:
      "Los detalles generados por LLM para este grupo aún se están generando. Agora muestra su etiqueta neutral por ahora y vuelve a intentarlo en segundo plano.",
  },
  fa: {
    groupSummaryTitle: "خلاصه گروه",
    aiSummaryTitle: "خلاصه LLM",
    aiSummaryDescription:
      "ما از Mistral Large، یک مدل LLM، برای تولید خلاصه و برچسب‌ها برای هر گروه اجماع استفاده می‌کنیم.",
    aiSummaryPendingDescription:
      "جزئیات تولیدشده با LLM برای این گروه هنوز در حال تولید است. Agora فعلاً برچسب خنثی آن را نشان می‌دهد و در پس‌زمینه دوباره تلاش می‌کند.",
  },
  fr: {
    groupSummaryTitle: "Résumé du groupe",
    aiSummaryTitle: "Résumé LLM",
    aiSummaryDescription:
      "Nous utilisons Mistral Large, un modèle LLM, pour générer le résumé et les étiquettes de chaque groupe de consensus.",
    aiSummaryPendingDescription:
      "Les détails générés par LLM pour ce groupe sont encore en cours de génération. Agora affiche son libellé neutre pour le moment et réessaie en arrière-plan.",
  },
  "zh-Hans": {
    groupSummaryTitle: "群组总结",
    aiSummaryTitle: "LLM 总结",
    aiSummaryDescription:
      "我们使用 Mistral Large（LLM 模型）为每个共识群组生成总结和标签。",
    aiSummaryPendingDescription:
      "此群组的 LLM 生成详情仍在生成中。Agora 暂时显示其中性群组标签，并在后台重试。",
  },
  "zh-Hant": {
    groupSummaryTitle: "群組總結",
    aiSummaryTitle: "LLM 總結",
    aiSummaryDescription:
      "我們使用 Mistral Large（LLM 模型）為每個共識群組產生摘要和標籤。",
    aiSummaryPendingDescription:
      "此群組的 LLM 產生詳情仍在產生中。Agora 暫時顯示其中性群組標籤，並在背景重試。",
  },
  he: {
    groupSummaryTitle: "סיכום קבוצה",
    aiSummaryTitle: "סיכום LLM",
    aiSummaryDescription:
      "אנו משתמשים ב-Mistral Large, מודל LLM, ליצירת הסיכום והתוויות עבור כל קבוצת קונצנזוס.",
    aiSummaryPendingDescription:
      "פרטי ה-LLM עבור הקבוצה הזו עדיין נוצרים. Agora מציגה בינתיים את התווית הניטרלית שלה ותנסה שוב ברקע.",
  },
  ja: {
    groupSummaryTitle: "グループサマリー",
    aiSummaryTitle: "LLM サマリー",
    aiSummaryDescription:
      "Mistral Large という LLM モデルを使用して、各合意形成グループのサマリーとラベルを生成します。",
    aiSummaryPendingDescription:
      "このグループの LLM 生成の詳細はまだ生成中です。Agora は当面、中立的なグループラベルを表示し、バックグラウンドで再試行します。",
  },
  ky: {
    groupSummaryTitle: "Топтун корутундусу",
    aiSummaryTitle: "LLM корутундусу",
    aiSummaryDescription:
      "Биз ар бир консенсус тобу үчүн корутунду жана энбелгилерди түзүү үчүн Mistral Large деген LLM моделин колдонобуз.",
    aiSummaryPendingDescription:
      "Бул топ үчүн LLM түзгөн маалымат дагы эле түзүлүүдө. Agora азырынча анын бейтарап топ энбелгисин көрсөтөт жана фондо кайра аракет кылат.",
  },
  ru: {
    groupSummaryTitle: "Сводка группы",
    aiSummaryTitle: "Сводка LLM",
    aiSummaryDescription:
      "Мы используем Mistral Large, модель LLM, для генерации сводки и меток для каждой группы консенсуса.",
    aiSummaryPendingDescription:
      "Сведения LLM для этой группы ещё генерируются. Agora сейчас показывает её нейтральную метку и повторяет попытку в фоновом режиме.",
  },
};
