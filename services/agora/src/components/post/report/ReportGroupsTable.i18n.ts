import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ReportGroupsTableTranslations {
  title: string;
  subtitle: string;
  subtitleNoAi: string;
  label: string;
  participants: string;
  aiSummary: string;
  notEnoughGroups: string;
  noSummary: string;
  noGroup: string;
  imbalanceNotice: string;
  noGroupExplanation: string;
}

export const reportGroupsTableTranslations: Record<
  SupportedDisplayLanguageCodes,
  ReportGroupsTableTranslations
> = {
  en: {
    title: "Opinion Groups",
    subtitle: "Groups are formed from voting patterns, without analyzing statement content. An AI model then reads each group's statements to generate a name and summary.",
    subtitleNoAi: "Groups are formed from voting patterns, without analyzing statement content.",
    label: "Group",
    participants: "Participants",
    aiSummary: "Summary",
    notEnoughGroups:
      "Not enough participation yet to form distinct opinion groups.",
    noSummary: "Summary not yet available.",
    noGroup: "No group",
    imbalanceNotice: "Most participants are in the same group because they voted almost identically.",
    noGroupExplanation: "Participants who voted on fewer than {minVotes} statements",
  },
  ar: {
    title: "مجموعات الرأي",
    subtitle: "تُنشأ المجموعات من طريقة تصويت الناس، وليس من لغة المقترحات أو محتواها. ثم يقرأ نموذج ذكاء اصطناعي مقترحات كل مجموعة لإنشاء اسم وملخص.",
    subtitleNoAi: "تُنشأ المجموعات من طريقة تصويت الناس، وليس من لغة المقترحات أو محتواها.",
    label: "المجموعة",
    participants: "المشاركون",
    aiSummary: "الملخص",
    notEnoughGroups:
      "لا توجد مشاركة كافية بعد لتشكيل مجموعات رأي متميزة.",
    noSummary: "الملخص غير متاح بعد.",
    noGroup: "بدون مجموعة",
    imbalanceNotice: "معظم المشاركين في نفس المجموعة لأنهم صوّتوا بشكل شبه متطابق.",
    noGroupExplanation: "المشاركون الذين صوّتوا على أقل من {minVotes} مقترحات",
  },
  es: {
    title: "Grupos de opinión",
    subtitle: "Los grupos se forman a partir de cómo votan las personas, no del idioma ni del contenido de las proposiciones. Luego, un modelo de inteligencia artificial lee las proposiciones de cada grupo para generar un nombre y un resumen.",
    subtitleNoAi: "Los grupos se forman a partir de cómo votan las personas, no del idioma ni del contenido de las proposiciones.",
    label: "Grupo",
    participants: "Participantes",
    aiSummary: "Resumen",
    notEnoughGroups:
      "Aún no hay suficiente participación para formar grupos de opinión distintos.",
    noSummary: "Resumen aún no disponible.",
    noGroup: "Sin grupo",
    imbalanceNotice: "La mayoría de los participantes están en el mismo grupo porque votaron de manera casi idéntica.",
    noGroupExplanation: "Participantes que votaron en menos de {minVotes} proposiciones",
  },
  fa: {
    title: "گروه‌های نظر",
    subtitle: "گروه‌ها از روی نحوه رأی دادن افراد شکل می‌گیرند، نه از زبان یا محتوای گزاره‌ها. سپس یک مدل هوش مصنوعی گزاره‌های هر گروه را می‌خواند تا نام و خلاصه تولید کند.",
    subtitleNoAi: "گروه‌ها از روی نحوه رأی دادن افراد شکل می‌گیرند، نه از زبان یا محتوای گزاره‌ها.",
    label: "گروه",
    participants: "شرکت‌کنندگان",
    aiSummary: "خلاصه",
    notEnoughGroups: "هنوز مشارکت کافی برای تشکیل گروه‌های نظر متمایز وجود ندارد.",
    noSummary: "خلاصه هنوز موجود نیست.",
    noGroup: "بدون گروه",
    imbalanceNotice: "بیشتر شرکت‌کنندگان در یک گروه هستند زیرا تقریباً به‌طور یکسان رأی داده‌اند.",
    noGroupExplanation: "شرکت‌کنندگانی که کمتر از {minVotes} گزاره رأی داده‌اند",
  },
  fr: {
    title: "Groupes d'opinion",
    subtitle: "Les groupes sont formés selon la manière dont les personnes votent, sans analyser le contenu des propositions. Ensuite, un modèle d'intelligence artificielle lit les propositions de chaque groupe pour générer un nom et un résumé.",
    subtitleNoAi: "Les groupes sont formés selon la manière dont les personnes votent, sans analyser le contenu des propositions.",
    label: "Groupe",
    participants: "Participants",
    aiSummary: "Résumé",
    notEnoughGroups:
      "Pas assez de participation pour former des groupes d'opinion distincts.",
    noSummary: "Résumé pas encore disponible.",
    noGroup: "Aucun groupe",
    imbalanceNotice: "La plupart des participants sont dans le même groupe car ils ont voté de manière quasi identique.",
    noGroupExplanation: "Participants ayant voté sur moins de {minVotes} propositions",
  },
  "zh-Hans": {
    title: "意见群组",
    subtitle: "群组根据人们的投票方式形成，而不是根据陈述的语言或内容形成。随后人工智能模型会阅读每个群组的陈述，以生成名称和总结。",
    subtitleNoAi: "群组根据人们的投票方式形成，而不是根据陈述的语言或内容形成。",
    label: "群组",
    participants: "参与者",
    aiSummary: "总结",
    notEnoughGroups: "参与人数不足，无法形成不同的意见群组。",
    noSummary: "总结尚不可用。",
    noGroup: "无群组",
    imbalanceNotice: "大多数参与者在同一群组中，因为他们的投票几乎完全相同。",
    noGroupExplanation: "投票少于 {minVotes} 条意见的参与者",
  },
  "zh-Hant": {
    title: "意見群組",
    subtitle: "群組根據人們的投票方式形成，而不是根據陳述的語言或內容形成。隨後人工智慧模型會閱讀每個群組的陳述，以產生名稱和摘要。",
    subtitleNoAi: "群組根據人們的投票方式形成，而不是根據陳述的語言或內容形成。",
    label: "群組",
    participants: "參與者",
    aiSummary: "總結",
    notEnoughGroups: "參與人數不足，無法形成不同的意見群組。",
    noSummary: "總結尚不可用。",
    noGroup: "無群組",
    imbalanceNotice: "大多數參與者在同一群組中，因為他們的投票幾乎完全相同。",
    noGroupExplanation: "投票少於 {minVotes} 條意見的參與者",
  },
  he: {
    title: "קבוצות דעה",
    subtitle: "קבוצות נוצרות לפי האופן שבו אנשים מצביעים, ולא לפי השפה או התוכן של ההצהרות. לאחר מכן מודל AI קורא את ההצהרות של כל קבוצה כדי ליצור שם וסיכום.",
    subtitleNoAi: "קבוצות נוצרות לפי האופן שבו אנשים מצביעים, ולא לפי השפה או התוכן של ההצהרות.",
    label: "קבוצה",
    participants: "משתתפים",
    aiSummary: "סיכום",
    notEnoughGroups: "אין מספיק השתתפות כדי ליצור קבוצות דעה נפרדות.",
    noSummary: "הסיכום עדיין לא זמין.",
    noGroup: "ללא קבוצה",
    imbalanceNotice: "רוב המשתתפים נמצאים באותה קבוצה כי הצביעו כמעט זהה.",
    noGroupExplanation: "משתתפים שהצביעו על פחות מ-{minVotes} הצהרות",
  },
  ja: {
    title: "意見グループ",
    subtitle: "グループは、発言の言語や内容ではなく、人々の投票のしかたから形成されます。その後、AI モデルが各グループの発言を読み取り、名前とサマリーを生成します。",
    subtitleNoAi: "グループは、発言の言語や内容ではなく、人々の投票のしかたから形成されます。",
    label: "グループ",
    participants: "参加者",
    aiSummary: "サマリー",
    notEnoughGroups:
      "異なる意見グループを形成するための十分な参加がまだありません。",
    noSummary: "サマリーはまだ利用できません。",
    noGroup: "グループなし",
    imbalanceNotice: "ほとんどの参加者はほぼ同じ投票をしたため、同じグループに属しています。",
    noGroupExplanation: "{minVotes} 件未満の意見に投票した参加者",
  },
  ky: {
    title: "Пикир топтору",
    subtitle: "Топтор билдирүүлөрдүн тилине же мазмунуна эмес, адамдардын кантип добуш бергенине жараша түзүлөт. Андан кийин AI модели ар бир топтун билдирүүлөрүн окуп, ат жана корутунду түзөт.",
    subtitleNoAi: "Топтор билдирүүлөрдүн тилине же мазмунуна эмес, адамдардын кантип добуш бергенине жараша түзүлөт.",
    label: "Топ",
    participants: "Катышуучулар",
    aiSummary: "Корутунду",
    notEnoughGroups:
      "Өзүнчө пикир топторун түзүү үчүн катышуу жетишсиз.",
    noSummary: "Корутунду азырынча жеткиликтүү эмес.",
    noGroup: "Топ жок",
    imbalanceNotice: "Катышуучулардын көпчүлүгү дээрлик бирдей добуш бергендиктен, бир топто турушат.",
    noGroupExplanation: "{minVotes} пикирден аз добуш берген катышуучулар",
  },
  ru: {
    title: "Группы мнений",
    subtitle: "Группы формируются по тому, как люди голосуют, а не по языку или содержанию утверждений. Затем модель ИИ читает утверждения каждой группы, чтобы создать название и сводку.",
    subtitleNoAi: "Группы формируются по тому, как люди голосуют, а не по языку или содержанию утверждений.",
    label: "Группа",
    participants: "Участники",
    aiSummary: "Сводка",
    notEnoughGroups:
      "Недостаточно участия для формирования отдельных групп мнений.",
    noSummary: "Сводка пока недоступна.",
    noGroup: "Без группы",
    imbalanceNotice: "Большинство участников находятся в одной группе, так как голосовали почти одинаково.",
    noGroupExplanation: "Участники, проголосовавшие менее чем за {minVotes} высказываний",
  },
};
