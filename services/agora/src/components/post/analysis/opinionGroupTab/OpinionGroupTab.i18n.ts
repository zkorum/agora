import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface OpinionGroupTabTranslations {
  groupsTitle: string;
  groupsSubtitle: string;
  groupsSubtitlePendingAi: string;
  groupsSubtitleNoAi: string;
  groupAiPendingNotice: string;
  notEnoughGroupsMessage: string;
  imbalanceNotice: string;
  selectGroup: string;
}

export const opinionGroupTabTranslations: Record<
  SupportedDisplayLanguageCodes,
  OpinionGroupTabTranslations
> = {
  en: {
    groupsTitle: "Opinion groups",
    groupsSubtitle: "Groups are formed from voting patterns, without analyzing statement content. An LLM then reads each group's statements to generate a name and summary.",
    groupsSubtitlePendingAi: "Groups are formed from voting patterns, without analyzing statement content. LLM-generated names and summaries are still being generated for these groups.",
    groupsSubtitleNoAi: "Groups are formed from voting patterns, without analyzing statement content.",
    groupAiPendingNotice: "LLM-generated details for this group are not available yet. Agora shows its neutral group label for now.",
    notEnoughGroupsMessage: "Not enough groups to display.",
    imbalanceNotice: "Most participants are in the same group because they voted almost identically.",
    selectGroup: "Select group",
  },
  ar: {
    groupsTitle: "مجموعات الرأي",
    groupsSubtitle: "تُنشأ المجموعات من طريقة تصويت الناس، وليس من لغة المقترحات أو محتواها. ثم يقرأ نموذج LLM مقترحات كل مجموعة لإنشاء اسم وملخص.",
    groupsSubtitlePendingAi: "تُنشأ المجموعات من طريقة تصويت الناس، وليس من لغة المقترحات أو محتواها. لا تزال الأسماء والملخصات المولدة بواسطة LLM قيد الإنشاء لهذه المجموعات.",
    groupsSubtitleNoAi: "تُنشأ المجموعات من طريقة تصويت الناس، وليس من لغة المقترحات أو محتواها.",
    groupAiPendingNotice: "تفاصيل LLM لهذه المجموعة غير متاحة بعد. يعرض Agora تسميتها المحايدة مؤقتًا.",
    notEnoughGroupsMessage: "لا توجد مجموعات كافية للعرض.",
    imbalanceNotice: "معظم المشاركين في نفس المجموعة لأنهم صوّتوا بشكل شبه متطابق.",
    selectGroup: "اختر مجموعة",
  },
  es: {
    groupsTitle: "Grupos de opinión",
    groupsSubtitle: "Los grupos se forman a partir de cómo votan las personas, no del idioma ni del contenido de las proposiciones. Luego, un LLM lee las proposiciones de cada grupo para generar un nombre y un resumen.",
    groupsSubtitlePendingAi: "Los grupos se forman a partir de cómo votan las personas, no del idioma ni del contenido de las proposiciones. Los nombres y resúmenes generados por LLM aún se están generando para estos grupos.",
    groupsSubtitleNoAi: "Los grupos se forman a partir de cómo votan las personas, no del idioma ni del contenido de las proposiciones.",
    groupAiPendingNotice: "Los detalles generados por LLM para este grupo aún no están disponibles. Agora muestra su etiqueta neutral por ahora.",
    notEnoughGroupsMessage: "No hay suficientes grupos para mostrar.",
    imbalanceNotice: "La mayoría de los participantes están en el mismo grupo porque votaron de manera casi idéntica.",
    selectGroup: "Seleccionar grupo",
  },
  fa: {
    groupsTitle: "گروه‌های نظر",
    groupsSubtitle: "گروه‌ها از روی نحوه رأی دادن افراد شکل می‌گیرند، نه از زبان یا محتوای گزاره‌ها. سپس یک LLM گزاره‌های هر گروه را می‌خواند تا نام و خلاصه تولید کند.",
    groupsSubtitlePendingAi: "گروه‌ها از روی نحوه رأی دادن افراد شکل می‌گیرند، نه از زبان یا محتوای گزاره‌ها. نام‌ها و خلاصه‌های تولیدشده با LLM برای این گروه‌ها هنوز در حال تولید است.",
    groupsSubtitleNoAi: "گروه‌ها از روی نحوه رأی دادن افراد شکل می‌گیرند، نه از زبان یا محتوای گزاره‌ها.",
    groupAiPendingNotice: "جزئیات تولیدشده با LLM برای این گروه هنوز در دسترس نیست. Agora فعلاً برچسب خنثی آن را نشان می‌دهد.",
    notEnoughGroupsMessage: "تعداد گروه‌ها برای نمایش کافی نیست.",
    imbalanceNotice: "بیشتر شرکت‌کنندگان در یک گروه هستند زیرا تقریباً به‌طور یکسان رأی داده‌اند.",
    selectGroup: "انتخاب گروه",
  },
  fr: {
    groupsTitle: "Groupes d'opinion",
    groupsSubtitle: "Les groupes sont formés selon la manière dont les personnes votent, sans analyser le contenu des propositions. Ensuite, un LLM lit les propositions de chaque groupe pour générer un nom et un résumé.",
    groupsSubtitlePendingAi: "Les groupes sont formés selon la manière dont les personnes votent, sans analyser le contenu des propositions. Les noms et résumés générés par LLM sont encore en cours de génération pour ces groupes.",
    groupsSubtitleNoAi: "Les groupes sont formés selon la manière dont les personnes votent, sans analyser le contenu des propositions.",
    groupAiPendingNotice: "Les détails générés par LLM pour ce groupe ne sont pas encore disponibles. Agora affiche son libellé neutre pour le moment.",
    notEnoughGroupsMessage: "Pas assez de groupes à afficher.",
    imbalanceNotice: "La plupart des participants sont dans le même groupe car ils ont voté de manière quasi identique.",
    selectGroup: "Sélectionner un groupe",
  },
  "zh-Hans": {
    groupsTitle: "意见群组",
    groupsSubtitle: "群组根据人们的投票方式形成，而不是根据陈述的语言或内容形成。随后 LLM 会阅读每个群组的陈述，以生成名称和总结。",
    groupsSubtitlePendingAi: "群组根据人们的投票方式形成，而不是根据陈述的语言或内容形成。这些群组的 LLM 生成名称和总结仍在生成中。",
    groupsSubtitleNoAi: "群组根据人们的投票方式形成，而不是根据陈述的语言或内容形成。",
    groupAiPendingNotice: "此群组的 LLM 生成详情尚不可用。Agora 暂时显示其中性群组标签。",
    notEnoughGroupsMessage: "群组数量不足以显示。",
    imbalanceNotice: "大多数参与者在同一群组中，因为他们的投票几乎完全相同。",
    selectGroup: "选择群组",
  },
  "zh-Hant": {
    groupsTitle: "意見群組",
    groupsSubtitle: "群組根據人們的投票方式形成，而不是根據陳述的語言或內容形成。隨後 LLM 會閱讀每個群組的陳述，以產生名稱和摘要。",
    groupsSubtitlePendingAi: "群組根據人們的投票方式形成，而不是根據陳述的語言或內容形成。這些群組的 LLM 產生名稱和摘要仍在產生中。",
    groupsSubtitleNoAi: "群組根據人們的投票方式形成，而不是根據陳述的語言或內容形成。",
    groupAiPendingNotice: "此群組的 LLM 產生詳情尚不可用。Agora 暫時顯示其中性群組標籤。",
    notEnoughGroupsMessage: "群組數量不足以顯示。",
    imbalanceNotice: "大多數參與者在同一群組中，因為他們的投票幾乎完全相同。",
    selectGroup: "選擇群組",
  },
  he: {
    groupsTitle: "קבוצות דעה",
    groupsSubtitle: "קבוצות נוצרות לפי האופן שבו אנשים מצביעים, ולא לפי השפה או התוכן של ההצהרות. לאחר מכן LLM קורא את ההצהרות של כל קבוצה כדי ליצור שם וסיכום.",
    groupsSubtitlePendingAi: "קבוצות נוצרות לפי האופן שבו אנשים מצביעים, ולא לפי השפה או התוכן של ההצהרות. שמות וסיכומי LLM עבור הקבוצות האלה עדיין נוצרים.",
    groupsSubtitleNoAi: "קבוצות נוצרות לפי האופן שבו אנשים מצביעים, ולא לפי השפה או התוכן של ההצהרות.",
    groupAiPendingNotice: "פרטי ה-LLM עבור הקבוצה הזו עדיין אינם זמינים. Agora מציגה בינתיים את התווית הניטרלית שלה.",
    notEnoughGroupsMessage: "אין מספיק קבוצות להצגה.",
    imbalanceNotice: "רוב המשתתפים נמצאים באותה קבוצה כי הצביעו כמעט זהה.",
    selectGroup: "בחירת קבוצה",
  },
  ja: {
    groupsTitle: "意見グループ",
    groupsSubtitle: "グループは、発言の言語や内容ではなく、人々の投票のしかたから形成されます。その後、LLM が各グループの発言を読み取り、名前とサマリーを生成します。",
    groupsSubtitlePendingAi: "グループは、発言の言語や内容ではなく、人々の投票のしかたから形成されます。これらのグループでは、LLM 生成の名前と要約をまだ生成中です。",
    groupsSubtitleNoAi: "グループは、発言の言語や内容ではなく、人々の投票のしかたから形成されます。",
    groupAiPendingNotice: "このグループの LLM 生成の詳細はまだ利用できません。Agora は当面、中立的なグループラベルを表示します。",
    notEnoughGroupsMessage: "表示するグループが不足しています。",
    imbalanceNotice: "ほとんどの参加者はほぼ同じ投票をしたため、同じグループに属しています。",
    selectGroup: "グループを選択",
  },
  ky: {
    groupsTitle: "Пикир топтору",
    groupsSubtitle: "Топтор билдирүүлөрдүн тилине же мазмунуна эмес, адамдардын кантип добуш бергенине жараша түзүлөт. Андан кийин LLM ар бир топтун билдирүүлөрүн окуп, ат жана корутунду түзөт.",
    groupsSubtitlePendingAi: "Топтор билдирүүлөрдүн тилине же мазмунуна эмес, адамдардын кантип добуш бергенине жараша түзүлөт. Бул топтор үчүн LLM түзгөн аталыштар жана корутундулар дагы эле түзүлүүдө.",
    groupsSubtitleNoAi: "Топтор билдирүүлөрдүн тилине же мазмунуна эмес, адамдардын кантип добуш бергенине жараша түзүлөт.",
    groupAiPendingNotice: "Бул топ үчүн LLM түзгөн маалымат азырынча жеткиликтүү эмес. Agora азырынча анын бейтарап топ энбелгисин көрсөтөт.",
    notEnoughGroupsMessage: "Көрсөтүү үчүн топтор жетишсиз.",
    imbalanceNotice: "Катышуучулардын көпчүлүгү дээрлик бирдей добуш бергендиктен, бир топто турушат.",
    selectGroup: "Топ тандоо",
  },
  ru: {
    groupsTitle: "Группы мнений",
    groupsSubtitle: "Группы формируются по тому, как люди голосуют, а не по языку или содержанию утверждений. Затем LLM читает утверждения каждой группы, чтобы создать название и сводку.",
    groupsSubtitlePendingAi: "Группы формируются по тому, как люди голосуют, а не по языку или содержанию утверждений. Названия и сводки, созданные LLM, для этих групп всё ещё генерируются.",
    groupsSubtitleNoAi: "Группы формируются по тому, как люди голосуют, а не по языку или содержанию утверждений.",
    groupAiPendingNotice: "Сведения, созданные LLM для этой группы, пока недоступны. Agora сейчас показывает её нейтральную метку.",
    notEnoughGroupsMessage: "Недостаточно групп для отображения.",
    imbalanceNotice: "Большинство участников находятся в одной группе, так как голосовали почти одинаково.",
    selectGroup: "Выбрать группу",
  },
};
