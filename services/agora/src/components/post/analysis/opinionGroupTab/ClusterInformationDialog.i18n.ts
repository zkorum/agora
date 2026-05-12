import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ClusterInformationDialogTranslations {
  title: string;
  description1: string;
  description2: string;
  description3: string;
}

export const clusterInformationDialogTranslations: Record<
  SupportedDisplayLanguageCodes,
  ClusterInformationDialogTranslations
> = {
  en: {
    title: "Consensus Groups",
    description1:
      "Consensus groups are created based on how people agree and disagree with statements.",
    description2:
      "We use machine learning to identify different schools of thought. This is the very same algorithm powering pol.is, the open-source wikisurvey tool developed by Computational Democracy.",
    description3:
      "Participants must vote on at least {minVotes} statements to be assigned to a group. Those who have not yet reached this threshold appear as ungrouped.",
  },
  ar: {
    title: "مجموعات التوافق",
    description1:
      "تُنشأ مجموعات التوافق بناءً على مدى اتفاق أو اختلاف الأشخاص حول المقترحات.",
    description2:
      'نستخدم تقنيات التعلم الآلي لاكتشاف وجهات النظر والمدارس الفكرية المختلفة. هذه نفس الخوارزمية التي تعمل بها أداة pol.is، الأداة مفتوحة المصدر للاستطلاعات التفاعلية، والتي طورتها مبادرة "الديمقراطية الحاسوبية"',
    description3:
      "يجب على المشاركين التصويت على {minVotes} مقترحات على الأقل ليتم تعيينهم في مجموعة. أولئك الذين لم يصلوا إلى هذا الحد يظهرون بدون مجموعة.",
  },
  es: {
    title: "Grupos de Consenso",
    description1:
      "Los grupos de consenso se crean basándose en cómo las personas están de acuerdo y en desacuerdo con las proposiciones.",
    description2:
      "Utilizamos aprendizaje automático para identificar diferentes escuelas de pensamiento. Este es el mismo algoritmo que impulsa pol.is, la herramienta de encuesta wiki de código abierto desarrollada por Computational Democracy.",
    description3:
      "Los participantes deben votar en al menos {minVotes} proposiciones para ser asignados a un grupo. Quienes no hayan alcanzado este umbral aparecen como sin grupo.",
  },
  fa: {
    title: "گروه‌های اجماع",
    description1:
      "گروه‌های اجماع بر اساس نحوه موافقت و مخالفت افراد با گزاره‌ها ایجاد می‌شوند.",
    description2:
      "ما از یادگیری ماشین برای شناسایی مکاتب فکری مختلف استفاده می‌کنیم. این همان الگوریتمی است که pol.is را اجرا می‌کند، ابزار نظرسنجی ویکی منبع باز توسعه یافته توسط Computational Democracy.",
    description3:
      "شرکت‌کنندگان باید حداقل به {minVotes} گزاره رأی دهند تا به یک گروه اختصاص یابند. کسانی که هنوز به این آستانه نرسیده‌اند به عنوان بدون گروه نمایش داده می‌شوند.",
  },
  fr: {
    title: "Groupes de Consensus",
    description1:
      "Les groupes de consensus sont créés en fonction de la façon dont les gens sont d'accord et en désaccord avec les propositions.",
    description2:
      "Nous utilisons l'apprentissage automatique pour identifier différentes écoles de pensée. C'est le même algorithme qui alimente pol.is, l'outil de sondage wiki open-source développé par Computational Democracy.",
    description3:
      "Les participants doivent voter sur au moins {minVotes} propositions pour être assignés à un groupe. Ceux qui n'ont pas encore atteint ce seuil apparaissent comme non groupés.",
  },
  "zh-Hans": {
    title: "共识群组",
    description1: "共识群组是根据人们对意见的同意和不同意程度创建的。",
    description2:
      "我们使用机器学习来识别不同的思想流派。这是与 pol.is 相同的算法，pol.is 是 Computational Democracy 开发的开放源码的 wiki 调查工具。",
    description3:
      "参与者必须对至少 {minVotes} 条意见进行投票才能被分配到群组。尚未达到此门槛的参与者显示为未分组。",
  },
  "zh-Hant": {
    title: "共識群組",
    description1: "共識群組是根據人們對意見的同意和不同意程度創建的。",
    description2:
      "我們使用機器學習來識別不同的思想流派。這是與 pol.is 相同的算法，pol.is 是 Computational Democracy 開發的開放源碼的 wiki 調查工具。",
    description3:
      "參與者必須對至少 {minVotes} 條意見進行投票才能被分配到群組。尚未達到此門檻的參與者顯示為未分組。",
  },
  he: {
    title: "קבוצות קונצנזוס",
    description1:
      "קבוצות קונצנזוס נוצרות על בסיס האופן שבו אנשים מסכימים ולא מסכימים עם הצהרות.",
    description2:
      "אנו משתמשים בלמידת מכונה לזיהוי אסכולות מחשבה שונות. זהו אותו אלגוריתם שמפעיל את pol.is, כלי הסקרים בקוד פתוח שפותח על ידי Computational Democracy.",
    description3:
      "משתתפים חייבים להצביע על לפחות {minVotes} הצהרות כדי להיות משויכים לקבוצה. מי שטרם הגיע לסף זה מופיע כלא משויך.",
  },
  ja: {
    title: "合意形成グループ",
    description1:
      "合意形成グループは、人々が意見に対して同意しているか、同意していないかに基づいて作成されます。",
    description2:
      "我々は機械学習を使用して、異なる思想流派を識別します。これは、 Computational Democracy によって開発されたオープンソースの wiki 調査ツール pol.is によって使用されるのと同じアルゴリズムです。",
    description3:
      "参加者は少なくとも {minVotes} 件の意見に投票する必要があります。この基準に達していない参加者はグループなしとして表示されます。",
  },
  ky: {
    title: "Консенсус топтору",
    description1:
      "Консенсус топтору адамдардын пикирлерге макулдук же макул эместик негизинде түзүлөт.",
    description2:
      "Биз ар кандай ой жүгүртүү мектептерин аныктоо үчүн машина үйрөнүүнү колдонобуз. Бул Computational Democracy тарабынан иштелип чыккан ачык булактуу wiki-сурамжылоо куралы pol.is'ти иштеткен ошол эле алгоритм.",
    description3:
      "Катышуучулар топко дайындалуу үчүн кеминде {minVotes} пикирге добуш бериши керек. Бул босогого жете электер топсуз болуп көрсөтүлөт.",
  },
  ru: {
    title: "Группы консенсуса",
    description1:
      "Группы консенсуса формируются на основе того, как люди соглашаются или не соглашаются с высказываниями.",
    description2:
      "Мы используем машинное обучение для выявления различных школ мысли. Это тот же алгоритм, что лежит в основе pol.is — инструмента вики-опросов с открытым исходным кодом, разработанного Computational Democracy.",
    description3:
      "Участники должны проголосовать минимум за {minVotes} высказываний, чтобы быть распределёнными в группу. Те, кто ещё не достиг этого порога, отображаются как нераспределённые.",
  },
};
