import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface OpinionWritingGuidelinesDialogTranslations {
  title: string;
  singleIdeaTitle: string;
  singleIdeaDescription: string;
  singleIdeaExampleGood: string;
  singleIdeaExampleBad: string;
  easyVoteTitle: string;
  easyVoteDescription: string;
  easyVoteExampleGood: string;
  easyVoteExampleBad: string;
  keepBriefTitle: string;
  keepBriefDescription: string;
  keepBriefExampleGood: string;
  keepBriefExampleBad: string;
  beClearTitle: string;
  beClearDescription: string;
  beClearExampleGood: string;
  beClearExampleBad: string;
  dontCombineTitle: string;
  dontCombineDescription: string;
  dontCombineExampleBad: string;
  dontCombineExampleGood1: string;
  dontCombineExampleGood2: string;
}

export const opinionWritingGuidelinesDialogTranslations: Record<
  SupportedDisplayLanguageCodes,
  OpinionWritingGuidelinesDialogTranslations
> = {
  en: {
    title: "Tips for Writing Good Opinions",
    singleIdeaTitle: "One specific idea",
    singleIdeaDescription: "Focus on a single point others can vote on",
    singleIdeaExampleGood:
      "Ride-sharing drivers should have the same insurance requirements as taxi drivers",
    singleIdeaExampleBad:
      "Uber should be banned and taxis need better apps and rating systems",
    easyVoteTitle: "Easy to agree/disagree",
    easyVoteDescription: "Avoid complex or multi-part statements",
    easyVoteExampleGood:
      "Social media companies should be liable for misinformation on their platforms",
    easyVoteExampleBad:
      "Social media regulation is complex and depends on various factors and cultural contexts",
    keepBriefTitle: "Keep it brief",
    keepBriefDescription: "Aim for 280 characters or less",
    keepBriefExampleGood: "Public transit should be free for students",
    keepBriefExampleBad:
      "I think that municipal transportation systems should consider implementing reduced-cost or zero-cost fare policies for individuals enrolled in educational programs because...",
    beClearTitle: "Be clear",
    beClearDescription: "Others should immediately understand your point",
    beClearExampleGood: "Remote work increases employee productivity",
    beClearExampleBad:
      "Telecommuting paradigms require reconsideration of organizational dynamics",
    dontCombineTitle: "Don't combine",
    dontCombineDescription:
      'Split "A and B" into separate opinions for clearer voting',
    dontCombineExampleBad:
      "We need universal healthcare and free college tuition",
    dontCombineExampleGood1: "Healthcare should be free at point of service",
    dontCombineExampleGood2: "College tuition should be free",
  },
  ar: {
    title: "نصائح لكتابة آراء جيدة",
    singleIdeaTitle: "فكرة واحدة محددة",
    singleIdeaDescription: "ركز على نقطة واحدة يمكن للآخرين التصويت عليها",
    singleIdeaExampleGood:
      "يجب أن يكون لسائقي مشاركة الرحلات نفس متطلبات التأمين مثل سائقي سيارات الأجرة",
    singleIdeaExampleBad:
      "يجب حظر أوبر وسيارات الأجرة تحتاج إلى تطبيقات أفضل وأنظمة تقييم",
    easyVoteTitle: "سهلة الموافقة/الرفض",
    easyVoteDescription: "تجنب العبارات المعقدة أو متعددة الأجزاء",
    easyVoteExampleGood:
      "يجب أن تكون شركات وسائل التواصل الاجتماعي مسؤولة عن المعلومات المضللة على منصاتها",
    easyVoteExampleBad:
      "تنظيم وسائل التواصل الاجتماعي معقد ويعتمد على عوامل وسياقات ثقافية مختلفة",
    keepBriefTitle: "كن موجزاً",
    keepBriefDescription: "استهدف 280 حرفاً أو أقل",
    keepBriefExampleGood: "يجب أن تكون وسائل النقل العام مجانية للطلاب",
    keepBriefExampleBad:
      "أعتقد أن أنظمة النقل البلدية يجب أن تنظر في تنفيذ سياسات أجرة مخفضة التكلفة أو معدومة التكلفة للأفراد المسجلين في البرامج التعليمية لأن...",
    beClearTitle: "كن واضحاً",
    beClearDescription: "يجب أن يفهم الآخرون نقطتك على الفور",
    beClearExampleGood: "العمل عن بُعد يزيد من إنتاجية الموظفين",
    beClearExampleBad: "نماذج العمل عن بُعد تتطلب إعادة النظر في الديناميكيات التنظيمية",
    dontCombineTitle: "لا تدمج",
    dontCombineDescription:
      'قسّم "أ و ب" إلى آراء منفصلة للحصول على تصويت أوضح',
    dontCombineExampleBad:
      "نحتاج إلى رعاية صحية شاملة ورسوم دراسية جامعية مجانية",
    dontCombineExampleGood1: "يجب أن تكون الرعاية الصحية مجانية عند نقطة الخدمة",
    dontCombineExampleGood2: "يجب أن تكون الرسوم الدراسية الجامعية مجانية",
  },
  es: {
    title: "Consejos para Escribir Buenas Opiniones",
    singleIdeaTitle: "Una idea específica",
    singleIdeaDescription: "Enfócate en un solo punto sobre el que otros puedan votar",
    singleIdeaExampleGood:
      "Los conductores de viajes compartidos deben tener los mismos requisitos de seguro que los taxistas",
    singleIdeaExampleBad:
      "Uber debería prohibirse y los taxis necesitan mejores aplicaciones y sistemas de calificación",
    easyVoteTitle: "Fácil de estar de acuerdo/en desacuerdo",
    easyVoteDescription: "Evita declaraciones complejas o de múltiples partes",
    easyVoteExampleGood:
      "Las empresas de redes sociales deben ser responsables de la desinformación en sus plataformas",
    easyVoteExampleBad:
      "La regulación de las redes sociales es compleja y depende de varios factores y contextos culturales",
    keepBriefTitle: "Sé breve",
    keepBriefDescription: "Apunta a 280 caracteres o menos",
    keepBriefExampleGood:
      "El transporte público debería ser gratuito para estudiantes",
    keepBriefExampleBad:
      "Creo que los sistemas de transporte municipal deberían considerar implementar políticas de tarifas de costo reducido o cero para personas inscritas en programas educativos porque...",
    beClearTitle: "Sé claro",
    beClearDescription: "Otros deberían entender tu punto inmediatamente",
    beClearExampleGood:
      "El trabajo remoto aumenta la productividad de los empleados",
    beClearExampleBad:
      "Los paradigmas de teletrabajo requieren reconsideración de las dinámicas organizacionales",
    dontCombineTitle: "No combines",
    dontCombineDescription:
      'Divide "A y B" en opiniones separadas para una votación más clara',
    dontCombineExampleBad:
      "Necesitamos atención médica universal y matrícula universitaria gratuita",
    dontCombineExampleGood1:
      "La atención médica debería ser gratuita en el punto de servicio",
    dontCombineExampleGood2: "La matrícula universitaria debería ser gratuita",
  },
  fr: {
    title: "Conseils pour Rédiger de Bonnes Opinions",
    singleIdeaTitle: "Une idée spécifique",
    singleIdeaDescription: "Concentrez-vous sur un point unique sur lequel les autres peuvent voter",
    singleIdeaExampleGood:
      "Les conducteurs de covoiturage devraient avoir les mêmes exigences d'assurance que les chauffeurs de taxi",
    singleIdeaExampleBad:
      "Uber devrait être interdit et les taxis ont besoin de meilleures applications et systèmes d'évaluation",
    easyVoteTitle: "Facile d'être d'accord/en désaccord",
    easyVoteDescription: "Évitez les déclarations complexes ou en plusieurs parties",
    easyVoteExampleGood:
      "Les entreprises de médias sociaux devraient être responsables de la désinformation sur leurs plateformes",
    easyVoteExampleBad:
      "La réglementation des médias sociaux est complexe et dépend de divers facteurs et contextes culturels",
    keepBriefTitle: "Soyez bref",
    keepBriefDescription: "Visez 280 caractères ou moins",
    keepBriefExampleGood:
      "Les transports publics devraient être gratuits pour les étudiants",
    keepBriefExampleBad:
      "Je pense que les systèmes de transport municipaux devraient envisager de mettre en œuvre des politiques tarifaires à coût réduit ou nul pour les personnes inscrites dans des programmes éducatifs car...",
    beClearTitle: "Soyez clair",
    beClearDescription: "Les autres devraient comprendre votre point immédiatement",
    beClearExampleGood:
      "Le travail à distance augmente la productivité des employés",
    beClearExampleBad:
      "Les paradigmes de télétravail nécessitent une reconsidération des dynamiques organisationnelles",
    dontCombineTitle: "Ne combinez pas",
    dontCombineDescription:
      "Divisez « A et B » en opinions séparées pour un vote plus clair",
    dontCombineExampleBad:
      "Nous avons besoin de soins de santé universels et de frais de scolarité gratuits",
    dontCombineExampleGood1:
      "Les soins de santé devraient être gratuits au point de service",
    dontCombineExampleGood2: "Les frais de scolarité devraient être gratuits",
  },
  "zh-Hans": {
    title: "撰写优质意见的技巧",
    singleIdeaTitle: "一个具体想法",
    singleIdeaDescription: "专注于他人可以投票的单一观点",
    singleIdeaExampleGood: "网约车司机应该与出租车司机有相同的保险要求",
    singleIdeaExampleBad: "应该禁止优步，出租车需要更好的应用程序和评级系统",
    easyVoteTitle: "易于同意/不同意",
    easyVoteDescription: "避免复杂或多部分的陈述",
    easyVoteExampleGood: "社交媒体公司应该对其平台上的错误信息负责",
    easyVoteExampleBad: "社交媒体监管很复杂，取决于各种因素和文化背景",
    keepBriefTitle: "保持简短",
    keepBriefDescription: "目标在280个字符以内",
    keepBriefExampleGood: "公共交通应该对学生免费",
    keepBriefExampleBad:
      "我认为市政交通系统应该考虑对在教育项目中注册的个人实施降低成本或零成本的票价政策，因为...",
    beClearTitle: "清晰表达",
    beClearDescription: "其他人应该立即理解您的观点",
    beClearExampleGood: "远程工作提高员工生产力",
    beClearExampleBad: "远程办公范式需要重新考虑组织动态",
    dontCombineTitle: "不要组合",
    dontCombineDescription: '将"A和B"分成单独的意见以便更清晰地投票',
    dontCombineExampleBad: "我们需要全民医疗保健和免费大学学费",
    dontCombineExampleGood1: "医疗保健应该在服务点免费",
    dontCombineExampleGood2: "大学学费应该免费",
  },
  "zh-Hant": {
    title: "撰寫優質意見的技巧",
    singleIdeaTitle: "一個具體想法",
    singleIdeaDescription: "專注於他人可以投票的單一觀點",
    singleIdeaExampleGood: "網約車司機應該與計程車司機有相同的保險要求",
    singleIdeaExampleBad: "應該禁止優步，計程車需要更好的應用程式和評級系統",
    easyVoteTitle: "易於同意/不同意",
    easyVoteDescription: "避免複雜或多部分的陳述",
    easyVoteExampleGood: "社群媒體公司應該對其平台上的錯誤資訊負責",
    easyVoteExampleBad: "社群媒體監管很複雜，取決於各種因素和文化背景",
    keepBriefTitle: "保持簡短",
    keepBriefDescription: "目標在280個字元以內",
    keepBriefExampleGood: "公共交通應該對學生免費",
    keepBriefExampleBad:
      "我認為市政交通系統應該考慮對在教育項目中註冊的個人實施降低成本或零成本的票價政策，因為...",
    beClearTitle: "清晰表達",
    beClearDescription: "其他人應該立即理解您的觀點",
    beClearExampleGood: "遠端工作提高員工生產力",
    beClearExampleBad: "遠端辦公範式需要重新考慮組織動態",
    dontCombineTitle: "不要組合",
    dontCombineDescription: "將「A和B」分成單獨的意見以便更清晰地投票",
    dontCombineExampleBad: "我們需要全民醫療保健和免費大學學費",
    dontCombineExampleGood1: "醫療保健應該在服務點免費",
    dontCombineExampleGood2: "大學學費應該免費",
  },
  ja: {
    title: "良い意見を書くためのヒント",
    singleIdeaTitle: "1つの具体的なアイデア",
    singleIdeaDescription: "他の人が投票できる単一のポイントに焦点を当てる",
    singleIdeaExampleGood:
      "ライドシェアドライバーはタクシー運転手と同じ保険要件を持つべきです",
    singleIdeaExampleBad:
      "Uberは禁止すべきで、タクシーにはより良いアプリと評価システムが必要です",
    easyVoteTitle: "賛成/反対しやすい",
    easyVoteDescription: "複雑な、または複数の部分から成る声明を避ける",
    easyVoteExampleGood:
      "ソーシャルメディア企業は、プラットフォーム上の誤情報に対して責任を負うべきです",
    easyVoteExampleBad:
      "ソーシャルメディアの規制は複雑で、さまざまな要因や文化的背景に依存します",
    keepBriefTitle: "簡潔に保つ",
    keepBriefDescription: "280文字以内を目指す",
    keepBriefExampleGood: "公共交通機関は学生に無料であるべきです",
    keepBriefExampleBad:
      "市営交通システムは、教育プログラムに登録している個人のために、コストを削減またはゼロにする運賃政策の実施を検討すべきだと思います。なぜなら...",
    beClearTitle: "明確にする",
    beClearDescription: "他の人があなたのポイントをすぐに理解できるようにする",
    beClearExampleGood: "リモートワークは従業員の生産性を向上させます",
    beClearExampleBad:
      "テレワークのパラダイムは組織のダイナミクスの再考を必要とします",
    dontCombineTitle: "組み合わせない",
    dontCombineDescription:
      "「AとB」を別々の意見に分割して、より明確な投票を実現する",
    dontCombineExampleBad: "普遍的な医療と無料の大学授業料が必要です",
    dontCombineExampleGood1: "医療はサービスポイントで無料であるべきです",
    dontCombineExampleGood2: "大学の授業料は無料であるべきです",
  },
};
