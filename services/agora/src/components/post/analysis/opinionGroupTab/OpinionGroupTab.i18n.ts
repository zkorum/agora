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
    groupsSubtitle: "Groups are formed based on voting behavior, regardless of language. An LLM model then reads each group's statements to generate a name and summary.",
    groupsSubtitlePendingAi: "Groups are formed based on voting behavior, regardless of language. LLM-generated names and summaries are still being generated for these groups.",
    groupsSubtitleNoAi: "Groups are formed based on voting behavior, regardless of language.",
    groupAiPendingNotice: "LLM-generated details for this group are not available yet. Agora shows its neutral group label for now.",
    notEnoughGroupsMessage: "Not enough groups to display.",
    imbalanceNotice: "Most participants are in the same group because they voted almost identically.",
    selectGroup: "Select group",
  },
  ar: {
    groupsTitle: "مجموعات الرأي",
    groupsSubtitle: "تُنشأ المجموعات بناءً على سلوك التصويت، بغض النظر عن اللغة. ثم يقرأ نموذج LLM مقترحات كل مجموعة لمنحها اسمًا وملخصًا.",
    groupsSubtitlePendingAi: "تُنشأ المجموعات بناءً على سلوك التصويت، بغض النظر عن اللغة. لا تزال الأسماء والملخصات المولدة بواسطة LLM قيد الإنشاء لهذه المجموعات.",
    groupsSubtitleNoAi: "تُنشأ المجموعات بناءً على سلوك التصويت، بغض النظر عن اللغة.",
    groupAiPendingNotice: "تفاصيل LLM لهذه المجموعة غير متاحة بعد. يعرض Agora تسميتها المحايدة مؤقتًا.",
    notEnoughGroupsMessage: "لا توجد مجموعات كافية للعرض.",
    imbalanceNotice: "معظم المشاركين في نفس المجموعة لأنهم صوّتوا بشكل شبه متطابق.",
    selectGroup: "اختر مجموعة",
  },
  es: {
    groupsTitle: "Grupos de opinión",
    groupsSubtitle: "Los grupos se crean en función del comportamiento de voto, sin tener en cuenta el idioma. Luego, un modelo LLM lee las proposiciones de cada grupo para darles un nombre y un resumen.",
    groupsSubtitlePendingAi: "Los grupos se crean en función del comportamiento de voto, sin tener en cuenta el idioma. Los nombres y resúmenes generados por LLM aún se están generando para estos grupos.",
    groupsSubtitleNoAi: "Los grupos se crean en función del comportamiento de voto, sin tener en cuenta el idioma.",
    groupAiPendingNotice: "Los detalles generados por LLM para este grupo aún no están disponibles. Agora muestra su etiqueta neutral por ahora.",
    notEnoughGroupsMessage: "No hay suficientes grupos para mostrar.",
    imbalanceNotice: "La mayoría de los participantes están en el mismo grupo porque votaron de manera casi idéntica.",
    selectGroup: "Seleccionar grupo",
  },
  fa: {
    groupsTitle: "گروه‌های نظر",
    groupsSubtitle: "گروه‌ها بر اساس رفتار رأی‌گیری، بدون توجه به زبان، شکل می‌گیرند. سپس یک مدل LLM گزاره‌های هر گروه را می‌خواند تا نام و خلاصه‌ای تولید کند.",
    groupsSubtitlePendingAi: "گروه‌ها بر اساس رفتار رأی‌گیری، بدون توجه به زبان، شکل می‌گیرند. نام‌ها و خلاصه‌های تولیدشده با LLM برای این گروه‌ها هنوز در حال تولید است.",
    groupsSubtitleNoAi: "گروه‌ها بر اساس رفتار رأی‌گیری، بدون توجه به زبان، شکل می‌گیرند.",
    groupAiPendingNotice: "جزئیات تولیدشده با LLM برای این گروه هنوز در دسترس نیست. Agora فعلاً برچسب خنثی آن را نشان می‌دهد.",
    notEnoughGroupsMessage: "تعداد گروه‌ها برای نمایش کافی نیست.",
    imbalanceNotice: "بیشتر شرکت‌کنندگان در یک گروه هستند زیرا تقریباً به‌طور یکسان رأی داده‌اند.",
    selectGroup: "انتخاب گروه",
  },
  fr: {
    groupsTitle: "Groupes d'opinion",
    groupsSubtitle: "Les groupes sont créés en fonction des comportements de vote, sans tenir compte de la langue. Ensuite, un modèle LLM lit les propositions de chaque groupe pour leur donner un nom et un résumé.",
    groupsSubtitlePendingAi: "Les groupes sont créés en fonction des comportements de vote, sans tenir compte de la langue. Les libellés et résumés générés par LLM sont encore en cours de génération pour ces groupes.",
    groupsSubtitleNoAi: "Les groupes sont créés en fonction des comportements de vote, sans tenir compte de la langue.",
    groupAiPendingNotice: "Les détails générés par LLM pour ce groupe ne sont pas encore disponibles. Agora affiche son libellé neutre pour le moment.",
    notEnoughGroupsMessage: "Pas assez de groupes à afficher.",
    imbalanceNotice: "La plupart des participants sont dans le même groupe car ils ont voté de manière quasi identique.",
    selectGroup: "Sélectionner un groupe",
  },
  "zh-Hans": {
    groupsTitle: "意见群组",
    groupsSubtitle: "群组根据投票行为创建，与语言无关。然后由 LLM 模型阅读各群组的意见，为其生成名称和总结。",
    groupsSubtitlePendingAi: "群组根据投票行为创建，与语言无关。这些群组的 LLM 生成名称和总结仍在生成中。",
    groupsSubtitleNoAi: "群组根据投票行为创建，与语言无关。",
    groupAiPendingNotice: "此群组的 LLM 生成详情尚不可用。Agora 暂时显示其中性群组标签。",
    notEnoughGroupsMessage: "群组数量不足以显示。",
    imbalanceNotice: "大多数参与者在同一群组中，因为他们的投票几乎完全相同。",
    selectGroup: "选择群组",
  },
  "zh-Hant": {
    groupsTitle: "意見群組",
    groupsSubtitle: "群組根據投票行為建立，與語言無關。然後由 LLM 模型閱讀各群組的意見，為其產生名稱和總結。",
    groupsSubtitlePendingAi: "群組根據投票行為建立，與語言無關。這些群組的 LLM 產生名稱和摘要仍在產生中。",
    groupsSubtitleNoAi: "群組根據投票行為建立，與語言無關。",
    groupAiPendingNotice: "此群組的 LLM 產生詳情尚不可用。Agora 暫時顯示其中性群組標籤。",
    notEnoughGroupsMessage: "群組數量不足以顯示。",
    imbalanceNotice: "大多數參與者在同一群組中，因為他們的投票幾乎完全相同。",
    selectGroup: "選擇群組",
  },
  he: {
    groupsTitle: "קבוצות דעה",
    groupsSubtitle: "קבוצות נוצרות על בסיס התנהגות ההצבעה, ללא קשר לשפה. לאחר מכן מודל LLM קורא את ההצהרות של כל קבוצה כדי ליצור שם וסיכום.",
    groupsSubtitlePendingAi: "קבוצות נוצרות על בסיס התנהגות ההצבעה, ללא קשר לשפה. שמות וסיכומי LLM עבור הקבוצות האלה עדיין נוצרים.",
    groupsSubtitleNoAi: "קבוצות נוצרות על בסיס התנהגות ההצבעה, ללא קשר לשפה.",
    groupAiPendingNotice: "פרטי ה-LLM עבור הקבוצה הזו עדיין אינם זמינים. Agora מציגה בינתיים את התווית הניטרלית שלה.",
    notEnoughGroupsMessage: "אין מספיק קבוצות להצגה.",
    imbalanceNotice: "רוב המשתתפים נמצאים באותה קבוצה כי הצביעו כמעט זהה.",
    selectGroup: "בחירת קבוצה",
  },
  ja: {
    groupsTitle: "意見グループ",
    groupsSubtitle: "グループは投票行動に基づいて作成され、言語は考慮されません。その後、LLM モデルが各グループの意見を読み取り、名前とサマリーを生成します。",
    groupsSubtitlePendingAi: "グループは投票行動に基づいて作成され、言語は考慮されません。これらのグループでは、LLM 生成の名前と要約をまだ生成中です。",
    groupsSubtitleNoAi: "グループは投票行動に基づいて作成され、言語は考慮されません。",
    groupAiPendingNotice: "このグループの LLM 生成の詳細はまだ利用できません。Agora は当面、中立的なグループラベルを表示します。",
    notEnoughGroupsMessage: "表示するグループが不足しています。",
    imbalanceNotice: "ほとんどの参加者はほぼ同じ投票をしたため、同じグループに属しています。",
    selectGroup: "グループを選択",
  },
  ky: {
    groupsTitle: "Пикир топтору",
    groupsSubtitle: "Топтор добуш берүү жүрүм-турумуна негизделип, тилге карабастан түзүлөт. Андан кийин LLM модели ар бир топтун пикирлерин окуп, ат жана корутунду түзөт.",
    groupsSubtitlePendingAi: "Топтор добуш берүү жүрүм-турумуна негизделип, тилге карабастан түзүлөт. Бул топтор үчүн LLM түзгөн аталыштар жана корутундулар дагы эле түзүлүүдө.",
    groupsSubtitleNoAi: "Топтор добуш берүү жүрүм-турумуна негизделип, тилге карабастан түзүлөт.",
    groupAiPendingNotice: "Бул топ үчүн LLM түзгөн маалымат азырынча жеткиликтүү эмес. Agora азырынча анын бейтарап топ энбелгисин көрсөтөт.",
    notEnoughGroupsMessage: "Көрсөтүү үчүн топтор жетишсиз.",
    imbalanceNotice: "Катышуучулардын көпчүлүгү дээрлик бирдей добуш бергендиктен, бир топто турушат.",
    selectGroup: "Топ тандоо",
  },
  ru: {
    groupsTitle: "Группы мнений",
    groupsSubtitle: "Группы формируются на основе голосования, независимо от языка. Затем модель LLM анализирует высказывания каждой группы, чтобы сгенерировать название и сводку.",
    groupsSubtitlePendingAi: "Группы формируются на основе голосования, независимо от языка. Названия и сводки, созданные LLM, для этих групп всё ещё генерируются.",
    groupsSubtitleNoAi: "Группы формируются на основе голосования, независимо от языка.",
    groupAiPendingNotice: "Сведения, созданные LLM для этой группы, пока недоступны. Agora сейчас показывает её нейтральную метку.",
    notEnoughGroupsMessage: "Недостаточно групп для отображения.",
    imbalanceNotice: "Большинство участников находятся в одной группе, так как голосовали почти одинаково.",
    selectGroup: "Выбрать группу",
  },
};
