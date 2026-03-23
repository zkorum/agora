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
    subtitle: "Groups are formed based on voting behavior, regardless of language. An AI model then reads each group's statements to generate a name and summary.",
    subtitleNoAi: "Groups are formed based on voting behavior, regardless of language.",
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
    subtitle: "تُنشأ المجموعات بناءً على سلوك التصويت، بغض النظر عن اللغة. ثم يقرأ نموذج ذكاء اصطناعي مقترحات كل مجموعة لمنحها اسمًا وملخصًا.",
    subtitleNoAi: "تُنشأ المجموعات بناءً على سلوك التصويت، بغض النظر عن اللغة.",
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
    subtitle: "Los grupos se crean en función del comportamiento de voto, sin tener en cuenta el idioma. Luego, un modelo de inteligencia artificial lee las proposiciones de cada grupo para darles un nombre y un resumen.",
    subtitleNoAi: "Los grupos se crean en función del comportamiento de voto, sin tener en cuenta el idioma.",
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
    subtitle: "گروه‌ها بر اساس رفتار رأی‌گیری، بدون توجه به زبان، شکل می‌گیرند. سپس یک مدل هوش مصنوعی گزاره‌های هر گروه را می‌خواند تا نام و خلاصه‌ای تولید کند.",
    subtitleNoAi: "گروه‌ها بر اساس رفتار رأی‌گیری، بدون توجه به زبان، شکل می‌گیرند.",
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
    subtitle: "Les groupes sont créés en fonction des comportements de vote, sans tenir compte de la langue. Ensuite, un modèle d'intelligence artificielle lit les propositions de chaque groupe pour leur donner un nom et un résumé.",
    subtitleNoAi: "Les groupes sont créés en fonction des comportements de vote, sans tenir compte de la langue.",
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
    title: "意见群体",
    subtitle: "群组根据投票行为创建，与语言无关。然后由人工智能模型阅读各群组的观点，为其生成名称和摘要。",
    subtitleNoAi: "群组根据投票行为创建，与语言无关。",
    label: "群体",
    participants: "参与者",
    aiSummary: "摘要",
    notEnoughGroups: "参与人数不足，无法形成不同的意见群体。",
    noSummary: "摘要尚不可用。",
    noGroup: "无群体",
    imbalanceNotice: "大多数参与者在同一群组中，因为他们的投票几乎完全相同。",
    noGroupExplanation: "投票少于 {minVotes} 条观点的参与者",
  },
  "zh-Hant": {
    title: "意見群體",
    subtitle: "群組根據投票行為建立，與語言無關。然後由人工智慧模型閱讀各群組的觀點，為其產生名稱和摘要。",
    subtitleNoAi: "群組根據投票行為建立，與語言無關。",
    label: "群體",
    participants: "參與者",
    aiSummary: "摘要",
    notEnoughGroups: "參與人數不足，無法形成不同的意見群體。",
    noSummary: "摘要尚不可用。",
    noGroup: "無群體",
    imbalanceNotice: "大多數參與者在同一群組中，因為他們的投票幾乎完全相同。",
    noGroupExplanation: "投票少於 {minVotes} 條觀點的參與者",
  },
  he: {
    title: "קבוצות דעה",
    subtitle: "קבוצות נוצרות על בסיס התנהגות ההצבעה, ללא קשר לשפה. לאחר מכן מודל AI קורא את ההצהרות של כל קבוצה כדי ליצור שם וסיכום.",
    subtitleNoAi: "קבוצות נוצרות על בסיס התנהגות ההצבעה, ללא קשר לשפה.",
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
    subtitle: "グループは投票行動に基づいて作成され、言語は考慮されません。その後、AIモデルが各グループの意見を読み取り、名前と要約を生成します。",
    subtitleNoAi: "グループは投票行動に基づいて作成され、言語は考慮されません。",
    label: "グループ",
    participants: "参加者",
    aiSummary: "要約",
    notEnoughGroups:
      "異なる意見グループを形成するための十分な参加がまだありません。",
    noSummary: "要約はまだ利用できません。",
    noGroup: "グループなし",
    imbalanceNotice: "ほとんどの参加者はほぼ同じ投票をしたため、同じグループに属しています。",
    noGroupExplanation: "{minVotes} 件未満の意見に投票した参加者",
  },
  ky: {
    title: "Пикир топтору",
    subtitle: "Топтор добуш берүү жүрүм-турумуна негизделип, тилге карабастан түзүлөт. Андан кийин AI модели ар бир топтун пикирлерин окуп, ат жана корутунду түзөт.",
    subtitleNoAi: "Топтор добуш берүү жүрүм-турумуна негизделип, тилге карабастан түзүлөт.",
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
    subtitle: "Группы формируются на основе голосования, независимо от языка. Затем модель ИИ анализирует высказывания каждой группы, чтобы сгенерировать название и сводку.",
    subtitleNoAi: "Группы формируются на основе голосования, независимо от языка.",
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
