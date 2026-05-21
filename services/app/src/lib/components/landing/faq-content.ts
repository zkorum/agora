export interface FaqItem {
  question: string;
  answer: string;
}

export interface FaqGroup {
  title: string;
  items: FaqItem[];
}

interface FaqContent {
  questionCountLabel: string;
  groups: FaqGroup[];
}

const faqLocales = [
  "en",
  "fr",
  "es",
  "ar",
  "fa",
  "he",
  "ja",
  "zh-hans",
  "zh-hant",
  "ky",
  "ru",
] as const;

type Locale = (typeof faqLocales)[number];

function isFaqLocale(locale: string): locale is Locale {
  return faqLocales.some((supportedLocale) => supportedLocale === locale);
}

export const faqContentByLocale: Record<Locale, FaqContent> = {
  en: {
    questionCountLabel: "questions",
    groups: [
      {
        title: "Using Agora",
        items: [
          {
            question: "Who is Agora for?",
            answer:
              "Agora is for facilitators, event organizers, civic engagement teams, community managers, companies, DAOs, NGOs, public institutions, and any group that needs to understand people across differences.",
          },
          {
            question:
              "How do I choose between Conversation Mode and Prioritization Mode?",
            answer:
              "Use Conversation Mode when the question is still open and you want to gather perspectives, map disagreement, and find common ground. Use Prioritization Mode when you already have proposals and need a ranked list of what matters most. [Read the Facilitation Guide](/resources/facilitation-guide).",
          },
          {
            question: "Can I use both modes together?",
            answer:
              "Yes. A common process is to start with Conversation Mode, identify strong or bridging proposals, then use Prioritization Mode to turn them into an actionable ranking.",
          },
        ],
      },
      {
        title: "How Consensus Works",
        items: [
          {
            question: "How does Agora find common ground?",
            answer:
              "Participants vote agree, disagree, or unsure on statements. Agora then maps patterns in those votes, not the wording of the statements, to show where people cluster, where they diverge, and which statements receive support across different opinion groups. The opinion mapping is based on machine learning, not LLM, using [Red Dwarf](https://github.com/polis-community/red-dwarf), an open-source reimplementation of the original [Pol.is](https://compdemocracy.org/Polis/).",
          },
          {
            question: "What is the difference between consensus and majority?",
            answer:
              "A majority statement is supported by most participants overall. A consensus statement is supported across opinion groups, so it cannot simply override a smaller group. In Agora, consensus does not mean everyone agrees; it means the statement has legitimacy across the main differences in the room.",
          },
          {
            question: "What are opinion groups and bridging statements?",
            answer:
              "Opinion groups are clusters of participants who vote in similar ways. They are inferred from voting behavior, not from demographics or AI labels. Bridging statements are statements that different groups support, even when those same groups disagree on many other things. This is the Pol.is-inspired part of the algorithm that makes hidden common ground visible.",
          },
          {
            question: "Is AI deciding the results?",
            answer:
              "No. The opinion groups and common-ground signals come from deterministic voting-pattern analysis, not from generative AI. After the opinion grouping step, Agora uses Mistral Large to label and summarize the representative opinions of each group, but those summaries are only an aid for reading the results. The source statements remain visible under each group, and AI summaries can be turned off by conversation owners.",
          },
          {
            question: "What is Plural Voting?",
            answer:
              "Plural Voting is used when a group needs to prioritize proposals, not just map opinions. It helps produce a ranked list while accounting for diversity within the group. Instead of only rewarding the largest bloc, it looks for priorities that can hold legitimacy across differences.",
          },
        ],
      },
      {
        title: "Privacy & Trust",
        items: [
          {
            question:
              "How does Agora protect privacy with zero-knowledge proofs?",
            answer:
              "[Zero-knowledge proofs (ZKP)](https://en.wikipedia.org/wiki/Zero-knowledge_proof) let participants prove eligibility or uniqueness without revealing any personal data. For example, proving your age group to Agora without revealing your actual age. Currently Agora supports [ZK Passport](https://rarimo.com/), which allows you to prove citizenship, age, and gender anonymously. Contact us if you want to discover and configure other identity systems such as anonymous proof of event attendance, GPS location, or even WiFi connection.",
          },
          {
            question: "Is participation on Agora anonymous?",
            answer:
              "Agora supports privacy-preserving participation, but anonymity depends on the setup and on what people write. [Why ZKPs alone are not enough to protect privacy](/resources/why-zk-proofs-alone-arent-enough).",
          },
          {
            question: "How does moderation work?",
            answer:
              "Anyone can report content such as spam, misleading, antisocial, sexual, doxxing, or illegal content. Conversation creators and moderators can act on reports, and moderation actions are recorded in moderation history.",
          },
          {
            question: "Is Agora GDPR compliant?",
            answer:
              "Agora is developed by ZKorum SAS in France and is designed around privacy by design, data minimization, user rights, and GDPR obligations.",
          },
        ],
      },
      {
        title: "Open Infrastructure",
        items: [
          {
            question: "Is Agora open source?",
            answer:
              "Yes. Agora's code is available on [GitHub](https://github.com/zkorum/agora) under open-source licenses. We encourage auditing, feedback, and contributions from the community. We uphold the vision that democracy needs digital infrastructure that anyone can use, modify, and improve.",
          },
          {
            question: "Can Agora work with other tools?",
            answer:
              "Yes. Agora supports practical interoperability through imports, exports, embeds, APIs (under development), and open-source code. We also launched the [DDS (Decentralized Deliberation Standard)](https://dds.xyz) initiative, for broader protocol-level interoperability.",
          },
        ],
      },
    ],
  },
  fr: {
    questionCountLabel: "questions",
    groups: [
      {
        title: "Utiliser Agora",
        items: [
          {
            question: "A qui s'adresse Agora ?",
            answer:
              "Agora s'adresse aux facilitateurs, organisateurs d'evenements, equipes de participation citoyenne, community managers, entreprises, DAO, ONG, institutions publiques et a tout groupe qui doit comprendre des personnes aux points de vue differents.",
          },
          {
            question:
              "Comment choisir entre le mode Conversation et le mode Priorisation ?",
            answer:
              "Utilisez le mode Conversation lorsque la question reste ouverte et que vous voulez recueillir des perspectives, cartographier les desaccords et trouver des terrains d'entente. Utilisez le mode Priorisation lorsque vous avez deja des propositions et que vous avez besoin d'une liste classee de ce qui compte le plus. [Lire le guide de facilitation](/resources/facilitation-guide).",
          },
          {
            question: "Puis-je utiliser les deux modes ensemble ?",
            answer:
              "Oui. Un processus courant consiste a commencer par le mode Conversation, a identifier les propositions fortes ou passerelles, puis a utiliser le mode Priorisation pour les transformer en classement actionnable.",
          },
        ],
      },
      {
        title: "Fonctionnement du consensus",
        items: [
          {
            question: "Comment Agora trouve-t-il un terrain d'entente ?",
            answer:
              "Les participants votent d'accord, pas d'accord ou incertain sur des affirmations. Agora cartographie ensuite les motifs de ces votes, et non la formulation des affirmations, pour montrer ou les personnes se regroupent, ou elles divergent et quelles affirmations recoivent du soutien dans differents groupes d'opinion. La cartographie d'opinion repose sur l'apprentissage automatique, pas sur un LLM, avec [Red Dwarf](https://github.com/polis-community/red-dwarf), une reimplementation open source du [Pol.is](https://compdemocracy.org/Polis/) original.",
          },
          {
            question: "Quelle est la difference entre consensus et majorite ?",
            answer:
              "Une affirmation majoritaire est soutenue par la plupart des participants dans l'ensemble. Une affirmation de consensus est soutenue a travers les groupes d'opinion, elle ne peut donc pas simplement ecraser un groupe plus petit. Dans Agora, consensus ne signifie pas que tout le monde est d'accord ; cela signifie que l'affirmation a une legitimite a travers les principales differences presentes.",
          },
          {
            question:
              "Que sont les groupes d'opinion et les affirmations passerelles ?",
            answer:
              "Les groupes d'opinion sont des ensembles de participants qui votent de maniere similaire. Ils sont deduits du comportement de vote, et non de donnees demographiques ou d'etiquettes d'IA. Les affirmations passerelles sont des affirmations soutenues par differents groupes, meme lorsque ces memes groupes sont en desaccord sur beaucoup d'autres points. C'est la partie inspiree de Pol.is qui rend visible le terrain d'entente cache.",
          },
          {
            question: "L'IA decide-t-elle des resultats ?",
            answer:
              "Non. Les groupes d'opinion et les signaux de terrain d'entente viennent d'une analyse deterministe des motifs de vote, pas de l'IA generative. Apres l'etape de regroupement, Agora utilise Mistral Large pour nommer et resumer les opinions representatives de chaque groupe, mais ces resumes servent seulement d'aide a la lecture des resultats. Les affirmations sources restent visibles sous chaque groupe, et les proprietaires de conversation peuvent desactiver les resumes par IA.",
          },
          {
            question: "Qu'est-ce que le vote plural ?",
            answer:
              "Le vote plural est utilise lorsqu'un groupe doit prioriser des propositions, et pas seulement cartographier des opinions. Il aide a produire une liste classee tout en tenant compte de la diversite du groupe. Au lieu de recompenser uniquement le bloc le plus nombreux, il recherche des priorites qui peuvent conserver leur legitimite a travers les differences.",
          },
        ],
      },
      {
        title: "Confidentialite et confiance",
        items: [
          {
            question:
              "Comment Agora protege-t-il la vie privee avec les preuves a divulgation nulle de connaissance ?",
            answer:
              "Les [preuves a divulgation nulle de connaissance (ZKP)](https://en.wikipedia.org/wiki/Zero-knowledge_proof) permettent aux participants de prouver une eligibilite ou une unicite sans reveler de donnees personnelles. Par exemple, prouver votre tranche d'age a Agora sans reveler votre age exact. Agora prend actuellement en charge [ZK Passport](https://rarimo.com/), qui permet de prouver anonymement la citoyennete, l'age et le genre. Contactez-nous si vous souhaitez decouvrir et configurer d'autres systemes d'identite, comme une preuve anonyme de presence a un evenement, une localisation GPS ou meme une connexion WiFi.",
          },
          {
            question: "La participation sur Agora est-elle anonyme ?",
            answer:
              "Agora permet une participation respectueuse de la vie privee, mais l'anonymat depend de la configuration et de ce que les personnes ecrivent. [Pourquoi les ZKP seules ne suffisent pas a proteger la vie privee](/resources/why-zk-proofs-alone-arent-enough).",
          },
          {
            question: "Comment fonctionne la moderation ?",
            answer:
              "Tout le monde peut signaler du contenu comme du spam, du contenu trompeur, antisocial, sexuel, de doxxing ou illegal. Les createurs de conversations et les moderateurs peuvent agir sur les signalements, et les actions de moderation sont enregistrees dans l'historique de moderation.",
          },
          {
            question: "Agora est-il conforme au RGPD ?",
            answer:
              "Agora est developpe par ZKorum SAS en France et concu autour de la protection de la vie privee des la conception, de la minimisation des donnees, des droits des utilisateurs et des obligations du RGPD.",
          },
        ],
      },
      {
        title: "Infrastructure ouverte",
        items: [
          {
            question: "Agora est-il open source ?",
            answer:
              "Oui. Le code d'Agora est disponible sur [GitHub](https://github.com/zkorum/agora) sous licences open source. Nous encourageons les audits, les retours et les contributions de la communaute. Nous defendons l'idee que la democratie a besoin d'une infrastructure numerique que chacun peut utiliser, modifier et ameliorer.",
          },
          {
            question: "Agora peut-il fonctionner avec d'autres outils ?",
            answer:
              "Oui. Agora prend en charge une interoperabilite pratique via les imports, exports, integrations, API en cours de developpement et code open source. Nous avons aussi lance l'initiative [DDS (Decentralized Deliberation Standard)](https://dds.xyz), pour une interoperabilite plus large au niveau protocolaire.",
          },
        ],
      },
    ],
  },
  es: {
    questionCountLabel: "preguntas",
    groups: [
      {
        title: "Usar Agora",
        items: [
          {
            question: "Para quien es Agora?",
            answer:
              "Agora es para facilitadores, organizadores de eventos, equipos de participacion civica, responsables de comunidades, empresas, DAO, ONG, instituciones publicas y cualquier grupo que necesite entender a personas con diferencias.",
          },
          {
            question:
              "Como elijo entre el modo Conversacion y el modo Priorizacion?",
            answer:
              "Usa el modo Conversacion cuando la pregunta sigue abierta y quieres recoger perspectivas, mapear desacuerdos y encontrar puntos en comun. Usa el modo Priorizacion cuando ya tienes propuestas y necesitas una lista ordenada de lo que mas importa. [Lee la guia de facilitacion](/resources/facilitation-guide).",
          },
          {
            question: "Puedo usar ambos modos juntos?",
            answer:
              "Si. Un proceso habitual es empezar con el modo Conversacion, identificar propuestas fuertes o puente, y luego usar el modo Priorizacion para convertirlas en un ranking accionable.",
          },
        ],
      },
      {
        title: "Como funciona el consenso",
        items: [
          {
            question: "Como encuentra Agora puntos en comun?",
            answer:
              "Las personas participantes votan de acuerdo, en desacuerdo o no estoy seguro sobre afirmaciones. Luego Agora mapea los patrones de esos votos, no la redaccion de las afirmaciones, para mostrar donde se agrupan las personas, donde divergen y que afirmaciones reciben apoyo entre distintos grupos de opinion. El mapeo de opinion se basa en aprendizaje automatico, no en un LLM, usando [Red Dwarf](https://github.com/polis-community/red-dwarf), una reimplementacion open source del [Pol.is](https://compdemocracy.org/Polis/) original.",
          },
          {
            question: "Cual es la diferencia entre consenso y mayoria?",
            answer:
              "Una afirmacion mayoritaria esta apoyada por la mayoria de participantes en conjunto. Una afirmacion de consenso esta apoyada entre grupos de opinion, por lo que no puede simplemente imponerse sobre un grupo menor. En Agora, consenso no significa que todo el mundo este de acuerdo; significa que la afirmacion tiene legitimidad a traves de las principales diferencias presentes.",
          },
          {
            question:
              "Que son los grupos de opinion y las afirmaciones puente?",
            answer:
              "Los grupos de opinion son grupos de participantes que votan de forma similar. Se infieren del comportamiento de voto, no de datos demograficos ni etiquetas de IA. Las afirmaciones puente son afirmaciones que distintos grupos apoyan, incluso cuando esos mismos grupos discrepan en muchas otras cosas. Esta es la parte inspirada en Pol.is del algoritmo que hace visible el terreno comun oculto.",
          },
          {
            question: "La IA decide los resultados?",
            answer:
              "No. Los grupos de opinion y las senales de terreno comun vienen de un analisis determinista de patrones de voto, no de IA generativa. Despues del agrupamiento de opiniones, Agora usa Mistral Large para etiquetar y resumir las opiniones representativas de cada grupo, pero esos resumenes solo ayudan a leer los resultados. Las afirmaciones fuente siguen visibles bajo cada grupo, y los propietarios de la conversacion pueden desactivar los resumenes con IA.",
          },
          {
            question: "Que es Plural Voting?",
            answer:
              "Plural Voting se usa cuando un grupo necesita priorizar propuestas, no solo mapear opiniones. Ayuda a producir una lista ordenada teniendo en cuenta la diversidad del grupo. En vez de premiar solo al bloque mas grande, busca prioridades que puedan mantener legitimidad a traves de las diferencias.",
          },
        ],
      },
      {
        title: "Privacidad y confianza",
        items: [
          {
            question:
              "Como protege Agora la privacidad con pruebas de conocimiento cero?",
            answer:
              "Las [pruebas de conocimiento cero (ZKP)](https://en.wikipedia.org/wiki/Zero-knowledge_proof) permiten a las personas demostrar elegibilidad o unicidad sin revelar datos personales. Por ejemplo, demostrar tu grupo de edad a Agora sin revelar tu edad real. Actualmente Agora admite [ZK Passport](https://rarimo.com/), que permite demostrar ciudadania, edad y genero de forma anonima. Contactanos si quieres descubrir y configurar otros sistemas de identidad, como prueba anonima de asistencia a eventos, ubicacion GPS o incluso conexion WiFi.",
          },
          {
            question: "La participacion en Agora es anonima?",
            answer:
              "Agora admite participacion que preserva la privacidad, pero el anonimato depende de la configuracion y de lo que escriban las personas. [Por que las ZKP por si solas no bastan para proteger la privacidad](/resources/why-zk-proofs-alone-arent-enough).",
          },
          {
            question: "Como funciona la moderacion?",
            answer:
              "Cualquier persona puede reportar contenido como spam, informacion enganosa, contenido antisocial, sexual, doxxing o ilegal. Los creadores de conversaciones y moderadores pueden actuar sobre los reportes, y las acciones de moderacion quedan registradas en el historial de moderacion.",
          },
          {
            question: "Agora cumple con el GDPR?",
            answer:
              "Agora es desarrollado por ZKorum SAS en Francia y esta disenado alrededor de la privacidad desde el diseno, la minimizacion de datos, los derechos de las personas usuarias y las obligaciones del GDPR.",
          },
        ],
      },
      {
        title: "Infraestructura abierta",
        items: [
          {
            question: "Agora es open source?",
            answer:
              "Si. El codigo de Agora esta disponible en [GitHub](https://github.com/zkorum/agora) bajo licencias open source. Animamos a la comunidad a auditar, enviar comentarios y contribuir. Defendemos la vision de que la democracia necesita infraestructura digital que cualquiera pueda usar, modificar y mejorar.",
          },
          {
            question: "Agora puede funcionar con otras herramientas?",
            answer:
              "Si. Agora admite interoperabilidad practica mediante importaciones, exportaciones, embeds, API en desarrollo y codigo open source. Tambien lanzamos la iniciativa [DDS (Decentralized Deliberation Standard)](https://dds.xyz), para una interoperabilidad mas amplia a nivel de protocolo.",
          },
        ],
      },
    ],
  },
  ar: {
    questionCountLabel: "أسئلة",
    groups: [
      {
        title: "استخدام Agora",
        items: [
          {
            question: "لمن صممت Agora؟",
            answer:
              "Agora موجهة للميسرين، ومنظمي الفعاليات، وفرق المشاركة المدنية، ومديري المجتمعات، والشركات، والـ DAOs، والمنظمات غير الحكومية، والمؤسسات العامة، وأي مجموعة تحتاج إلى فهم الناس عبر اختلافاتهم.",
          },
          {
            question: "كيف أختار بين وضع المحادثة ووضع تحديد الأولويات؟",
            answer:
              "استخدم وضع المحادثة عندما يكون السؤال ما زال مفتوحا وتريد جمع وجهات النظر، ورسم خريطة الخلاف، وإيجاد أرضية مشتركة. استخدم وضع تحديد الأولويات عندما تكون لديك مقترحات بالفعل وتحتاج إلى قائمة مرتبة بما هو الأهم. [اقرأ دليل التيسير](/resources/facilitation-guide).",
          },
          {
            question: "هل يمكنني استخدام الوضعين معا؟",
            answer:
              "نعم. من الشائع أن تبدأ بوضع المحادثة، وتحدد المقترحات القوية أو الجسرية، ثم تستخدم وضع تحديد الأولويات لتحويلها إلى ترتيب قابل للتنفيذ.",
          },
        ],
      },
      {
        title: "كيف يعمل الإجماع",
        items: [
          {
            question: "كيف تجد Agora الأرضية المشتركة؟",
            answer:
              "يصوت المشاركون بالموافقة أو الرفض أو عدم التأكد على عبارات. بعد ذلك ترسم Agora أنماط هذه الأصوات، وليس صياغة العبارات، لتوضح أين يتجمع الناس، وأين يختلفون، وأي العبارات تحظى بدعم عبر مجموعات رأي مختلفة. يعتمد رسم خريطة الآراء على تعلم الآلة، وليس على نموذج لغوي كبير، باستخدام [Red Dwarf](https://github.com/polis-community/red-dwarf)، وهو إعادة تنفيذ مفتوحة المصدر لنظام [Pol.is](https://compdemocracy.org/Polis/) الأصلي.",
          },
          {
            question: "ما الفرق بين الإجماع والأغلبية؟",
            answer:
              "عبارة الأغلبية يدعمها معظم المشاركين إجمالا. أما عبارة الإجماع فتلقى دعما عبر مجموعات الرأي، لذلك لا تستطيع ببساطة أن تتجاوز مجموعة أصغر. في Agora، لا يعني الإجماع أن الجميع متفقون؛ بل يعني أن العبارة لها شرعية عبر الاختلافات الرئيسية في الغرفة.",
          },
          {
            question: "ما مجموعات الرأي والعبارات الجسرية؟",
            answer:
              "مجموعات الرأي هي تجمعات من المشاركين الذين يصوتون بطرق متشابهة. يتم استنتاجها من سلوك التصويت، لا من البيانات الديموغرافية أو تسميات الذكاء الاصطناعي. العبارات الجسرية هي عبارات تدعمها مجموعات مختلفة، حتى عندما تختلف تلك المجموعات نفسها حول أشياء كثيرة أخرى. هذا هو الجزء المستلهم من Pol.is في الخوارزمية، وهو ما يجعل الأرضية المشتركة المخفية مرئية.",
          },
          {
            question: "هل يقرر الذكاء الاصطناعي النتائج؟",
            answer:
              "لا. مجموعات الرأي وإشارات الأرضية المشتركة تأتي من تحليل حتمي لأنماط التصويت، وليس من ذكاء اصطناعي توليدي. بعد خطوة تجميع الآراء، تستخدم Agora نموذج Mistral Large لتسمية وتلخيص الآراء التمثيلية لكل مجموعة، لكن هذه الملخصات مجرد أداة تساعد على قراءة النتائج. تبقى العبارات الأصلية ظاهرة تحت كل مجموعة، ويمكن لمالكي المحادثة إيقاف ملخصات الذكاء الاصطناعي.",
          },
          {
            question: "ما هو Plural Voting؟",
            answer:
              "يستخدم Plural Voting عندما تحتاج مجموعة إلى ترتيب المقترحات حسب الأولوية، وليس فقط رسم خريطة الآراء. يساعد على إنتاج قائمة مرتبة مع أخذ التنوع داخل المجموعة في الاعتبار. وبدلا من مكافأة الكتلة الأكبر فقط، يبحث عن أولويات يمكن أن تحتفظ بشرعيتها عبر الاختلافات.",
          },
        ],
      },
      {
        title: "الخصوصية والثقة",
        items: [
          {
            question:
              "كيف تحمي Agora الخصوصية باستخدام براهين المعرفة الصفرية؟",
            answer:
              "تتيح [براهين المعرفة الصفرية (ZKP)](https://en.wikipedia.org/wiki/Zero-knowledge_proof) للمشاركين إثبات الأهلية أو التفرد دون كشف أي بيانات شخصية. مثلا، يمكن إثبات فئتك العمرية لـ Agora دون كشف عمرك الفعلي. تدعم Agora حاليا [ZK Passport](https://rarimo.com/)، الذي يسمح بإثبات الجنسية والعمر والجندر بشكل مجهول. تواصل معنا إذا أردت استكشاف وتهيئة أنظمة هوية أخرى، مثل إثبات حضور فعالية بشكل مجهول، أو الموقع الجغرافي، أو حتى اتصال WiFi.",
          },
          {
            question: "هل المشاركة في Agora مجهولة؟",
            answer:
              "تدعم Agora مشاركة حافظة للخصوصية، لكن المجهولية تعتمد على الإعداد وعلى ما يكتبه الأشخاص. [لماذا لا تكفي براهين ZKP وحدها لحماية الخصوصية](/resources/why-zk-proofs-alone-arent-enough).",
          },
          {
            question: "كيف تعمل الإشرافات؟",
            answer:
              "يمكن لأي شخص الإبلاغ عن محتوى مثل الرسائل المزعجة أو المضللة أو المعادية للمجتمع أو الجنسية أو التي تكشف معلومات شخصية أو غير القانونية. يمكن لمنشئي المحادثات والمشرفين التصرف بناء على البلاغات، ويتم تسجيل إجراءات الإشراف في سجل الإشراف.",
          },
          {
            question: "هل Agora متوافقة مع GDPR؟",
            answer:
              "تطور ZKorum SAS في فرنسا منصة Agora، وهي مصممة حول الخصوصية حسب التصميم، وتقليل البيانات، وحقوق المستخدمين، والتزامات GDPR.",
          },
        ],
      },
      {
        title: "بنية تحتية مفتوحة",
        items: [
          {
            question: "هل Agora مفتوحة المصدر؟",
            answer:
              "نعم. كود Agora متاح على [GitHub](https://github.com/zkorum/agora) بموجب تراخيص مفتوحة المصدر. نشجع المجتمع على التدقيق وإرسال الملاحظات والمساهمة. نتمسك برؤية أن الديمقراطية تحتاج إلى بنية تحتية رقمية يستطيع أي شخص استخدامها وتعديلها وتحسينها.",
          },
          {
            question: "هل يمكن أن تعمل Agora مع أدوات أخرى؟",
            answer:
              "نعم. تدعم Agora قابلية تشغيل بيني عملية عبر الاستيراد والتصدير والتضمين وواجهات API قيد التطوير والكود المفتوح المصدر. أطلقنا أيضا مبادرة [DDS (Decentralized Deliberation Standard)](https://dds.xyz)، من أجل قابلية تشغيل بيني أوسع على مستوى البروتوكول.",
          },
        ],
      },
    ],
  },
  fa: {
    questionCountLabel: "پرسش",
    groups: [
      {
        title: "استفاده از Agora",
        items: [
          {
            question: "Agora برای چه کسانی است؟",
            answer:
              "Agora برای تسهیلگران، برگزارکنندگان رویداد، تیم‌های مشارکت مدنی، مدیران جامعه، شرکت‌ها، DAOها، سازمان‌های مردم‌نهاد، نهادهای عمومی و هر گروهی است که نیاز دارد افراد را در میان تفاوت‌ها بهتر درک کند.",
          },
          {
            question: "چطور بین حالت گفت‌وگو و حالت اولویت‌بندی انتخاب کنم؟",
            answer:
              "وقتی پرسش هنوز باز است و می‌خواهید دیدگاه‌ها را جمع‌آوری کنید، اختلاف‌ها را نقشه‌برداری کنید و زمینه مشترک پیدا کنید، از حالت گفت‌وگو استفاده کنید. وقتی از قبل پیشنهادهایی دارید و به فهرستی رتبه‌بندی‌شده از مهم‌ترین موارد نیاز دارید، از حالت اولویت‌بندی استفاده کنید. [راهنمای تسهیلگری را بخوانید](/resources/facilitation-guide).",
          },
          {
            question: "آیا می‌توانم هر دو حالت را با هم استفاده کنم؟",
            answer:
              "بله. یک فرایند رایج این است که با حالت گفت‌وگو شروع کنید، پیشنهادهای قوی یا پل‌ساز را شناسایی کنید، سپس از حالت اولویت‌بندی استفاده کنید تا آن‌ها را به یک رتبه‌بندی قابل اقدام تبدیل کنید.",
          },
        ],
      },
      {
        title: "اجماع چگونه کار می‌کند",
        items: [
          {
            question: "Agora چطور زمینه مشترک را پیدا می‌کند؟",
            answer:
              "شرکت‌کنندگان درباره گزاره‌ها رای موافق، مخالف یا نامطمئن می‌دهند. سپس Agora الگوهای این رای‌ها را، نه متن گزاره‌ها را، نقشه‌برداری می‌کند تا نشان دهد افراد کجا خوشه‌بندی می‌شوند، کجا واگرا هستند و کدام گزاره‌ها در میان گروه‌های مختلف نظر حمایت می‌گیرند. نقشه‌برداری نظر بر پایه یادگیری ماشین است، نه LLM، و از [Red Dwarf](https://github.com/polis-community/red-dwarf)، بازپیاده‌سازی متن‌باز [Pol.is](https://compdemocracy.org/Polis/) اصلی، استفاده می‌کند.",
          },
          {
            question: "تفاوت اجماع و اکثریت چیست؟",
            answer:
              "یک گزاره اکثریتی از سوی بیشتر شرکت‌کنندگان در کل حمایت می‌شود. یک گزاره اجماعی در میان گروه‌های نظر حمایت می‌شود، بنابراین نمی‌تواند صرفا یک گروه کوچک‌تر را کنار بزند. در Agora، اجماع به معنای موافقت همه نیست؛ یعنی گزاره در میان تفاوت‌های اصلی حاضر در جمع مشروعیت دارد.",
          },
          {
            question: "گروه‌های نظر و گزاره‌های پل‌ساز چیستند؟",
            answer:
              "گروه‌های نظر خوشه‌هایی از شرکت‌کنندگان هستند که به شکل مشابه رای می‌دهند. آن‌ها از رفتار رای‌دادن استنتاج می‌شوند، نه از داده‌های جمعیت‌شناختی یا برچسب‌های هوش مصنوعی. گزاره‌های پل‌ساز گزاره‌هایی هستند که گروه‌های مختلف از آن‌ها حمایت می‌کنند، حتی وقتی همان گروه‌ها درباره بسیاری از موضوعات دیگر اختلاف دارند. این بخش الهام‌گرفته از Pol.is در الگوریتم است که زمینه مشترک پنهان را آشکار می‌کند.",
          },
          {
            question: "آیا هوش مصنوعی نتیجه‌ها را تعیین می‌کند؟",
            answer:
              "خیر. گروه‌های نظر و نشانه‌های زمینه مشترک از تحلیل قطعی الگوهای رای می‌آیند، نه از هوش مصنوعی مولد. پس از مرحله گروه‌بندی نظر، Agora از Mistral Large برای برچسب‌گذاری و خلاصه‌کردن نظرهای نماینده هر گروه استفاده می‌کند، اما این خلاصه‌ها فقط برای خواندن آسان‌تر نتایج هستند. گزاره‌های منبع زیر هر گروه همچنان دیده می‌شوند و مالکان گفت‌وگو می‌توانند خلاصه‌های هوش مصنوعی را خاموش کنند.",
          },
          {
            question: "Plural Voting چیست؟",
            answer:
              "Plural Voting زمانی استفاده می‌شود که یک گروه باید پیشنهادها را اولویت‌بندی کند، نه فقط نظرها را نقشه‌برداری کند. این روش کمک می‌کند فهرستی رتبه‌بندی‌شده تولید شود و در عین حال تنوع درون گروه لحاظ شود. به جای پاداش‌دادن فقط به بزرگ‌ترین بلوک، به دنبال اولویت‌هایی می‌گردد که بتوانند در میان تفاوت‌ها مشروعیت داشته باشند.",
          },
        ],
      },
      {
        title: "حریم خصوصی و اعتماد",
        items: [
          {
            question:
              "Agora چگونه با براهین دانش صفر از حریم خصوصی محافظت می‌کند؟",
            answer:
              "[براهین دانش صفر (ZKP)](https://en.wikipedia.org/wiki/Zero-knowledge_proof) به شرکت‌کنندگان اجازه می‌دهد واجد شرایط بودن یا یکتایی خود را بدون افشای هیچ داده شخصی ثابت کنند. مثلا می‌توانید گروه سنی خود را به Agora ثابت کنید بدون آنکه سن واقعی خود را نشان دهید. Agora در حال حاضر از [ZK Passport](https://rarimo.com/) پشتیبانی می‌کند که امکان اثبات ناشناس شهروندی، سن و جنسیت را فراهم می‌کند. اگر می‌خواهید سامانه‌های هویتی دیگر مانند اثبات ناشناس حضور در رویداد، موقعیت GPS یا حتی اتصال WiFi را کشف و پیکربندی کنید، با ما تماس بگیرید.",
          },
          {
            question: "آیا مشارکت در Agora ناشناس است؟",
            answer:
              "Agora از مشارکت حافظ حریم خصوصی پشتیبانی می‌کند، اما ناشناس‌بودن به پیکربندی و به آنچه افراد می‌نویسند بستگی دارد. [چرا ZKPها به‌تنهایی برای محافظت از حریم خصوصی کافی نیستند](/resources/why-zk-proofs-alone-arent-enough).",
          },
          {
            question: "مدیریت محتوا چگونه کار می‌کند؟",
            answer:
              "هر کسی می‌تواند محتوایی مانند اسپم، محتوای گمراه‌کننده، ضداجتماعی، جنسی، افشای اطلاعات شخصی یا غیرقانونی را گزارش کند. سازندگان گفت‌وگو و مدیران می‌توانند به گزارش‌ها رسیدگی کنند و اقدام‌های مدیریت محتوا در تاریخچه مدیریت ثبت می‌شوند.",
          },
          {
            question: "آیا Agora با GDPR سازگار است؟",
            answer:
              "Agora توسط ZKorum SAS در فرانسه توسعه یافته و بر پایه حریم خصوصی در طراحی، کمینه‌سازی داده، حقوق کاربران و تعهدات GDPR طراحی شده است.",
          },
        ],
      },
      {
        title: "زیرساخت باز",
        items: [
          {
            question: "آیا Agora متن‌باز است؟",
            answer:
              "بله. کد Agora در [GitHub](https://github.com/zkorum/agora) تحت مجوزهای متن‌باز در دسترس است. ما از ممیزی، بازخورد و مشارکت جامعه استقبال می‌کنیم. ما از این دیدگاه پشتیبانی می‌کنیم که دموکراسی به زیرساخت دیجیتالی نیاز دارد که هر کسی بتواند از آن استفاده کند، تغییرش دهد و بهترش کند.",
          },
          {
            question: "آیا Agora با ابزارهای دیگر کار می‌کند؟",
            answer:
              "بله. Agora از تعامل‌پذیری عملی از راه واردکردن، صادرکردن، جاسازی، APIهای در حال توسعه و کد متن‌باز پشتیبانی می‌کند. ما همچنین ابتکار [DDS (Decentralized Deliberation Standard)](https://dds.xyz) را برای تعامل‌پذیری گسترده‌تر در سطح پروتکل راه‌اندازی کرده‌ایم.",
          },
        ],
      },
    ],
  },
  he: {
    questionCountLabel: "שאלות",
    groups: [
      {
        title: "שימוש ב-Agora",
        items: [
          {
            question: "למי Agora מיועדת?",
            answer:
              "Agora מיועדת למנחים, מארגני אירועים, צוותי מעורבות אזרחית, מנהלי קהילות, חברות, DAO, עמותות, מוסדות ציבוריים וכל קבוצה שצריכה להבין אנשים מעבר להבדלים ביניהם.",
          },
          {
            question: "איך בוחרים בין מצב שיחה למצב תעדוף?",
            answer:
              "השתמשו במצב שיחה כאשר השאלה עדיין פתוחה ואתם רוצים לאסוף נקודות מבט, למפות אי-הסכמה ולמצוא בסיס משותף. השתמשו במצב תעדוף כאשר כבר יש לכם הצעות ואתם צריכים רשימה מדורגת של הדברים החשובים ביותר. [קראו את מדריך ההנחיה](/resources/facilitation-guide).",
          },
          {
            question: "אפשר להשתמש בשני המצבים יחד?",
            answer:
              "כן. תהליך נפוץ הוא להתחיל במצב שיחה, לזהות הצעות חזקות או מגשרות, ואז להשתמש במצב תעדוף כדי להפוך אותן לדירוג שאפשר לפעול לפיו.",
          },
        ],
      },
      {
        title: "איך קונצנזוס עובד",
        items: [
          {
            question: "איך Agora מוצאת בסיס משותף?",
            answer:
              "המשתתפים מצביעים מסכים, לא מסכים או לא בטוח על אמירות. לאחר מכן Agora ממפה את דפוסי ההצבעה, ולא את ניסוח האמירות, כדי להראות היכן אנשים מתקבצים, היכן הם מתפצלים ואילו אמירות מקבלות תמיכה בין קבוצות דעה שונות. מיפוי הדעות מבוסס על למידת מכונה, לא על LLM, ומשתמש ב-[Red Dwarf](https://github.com/polis-community/red-dwarf), מימוש קוד פתוח מחדש של [Pol.is](https://compdemocracy.org/Polis/) המקורי.",
          },
          {
            question: "מה ההבדל בין קונצנזוס לרוב?",
            answer:
              "אמירת רוב נתמכת על ידי רוב המשתתפים בסך הכול. אמירת קונצנזוס נתמכת בין קבוצות דעה, ולכן היא לא פשוט מוחקת קבוצה קטנה יותר. ב-Agora, קונצנזוס לא אומר שכולם מסכימים; הוא אומר שלאמירה יש לגיטימיות בין ההבדלים המרכזיים בחדר.",
          },
          {
            question: "מהן קבוצות דעה ואמירות מגשרות?",
            answer:
              "קבוצות דעה הן אשכולות של משתתפים שמצביעים בדרכים דומות. הן מוסקות מהתנהגות ההצבעה, לא מדמוגרפיה או מתוויות של בינה מלאכותית. אמירות מגשרות הן אמירות שקבוצות שונות תומכות בהן, גם כאשר אותן קבוצות חלוקות בנושאים רבים אחרים. זהו החלק בהשראת Pol.is באלגוריתם, שהופך בסיס משותף נסתר לגלוי.",
          },
          {
            question: "האם בינה מלאכותית מחליטה את התוצאות?",
            answer:
              "לא. קבוצות הדעה ואותות הבסיס המשותף מגיעים מניתוח דטרמיניסטי של דפוסי הצבעה, לא מבינה מלאכותית יוצרת. לאחר שלב קיבוץ הדעות, Agora משתמשת ב-Mistral Large כדי לתייג ולסכם את הדעות המייצגות של כל קבוצה, אבל הסיכומים האלה הם רק עזר לקריאת התוצאות. אמירות המקור נשארות גלויות תחת כל קבוצה, ובעלי השיחה יכולים לכבות סיכומי AI.",
          },
          {
            question: "מהו Plural Voting?",
            answer:
              "Plural Voting משמש כאשר קבוצה צריכה לתעדף הצעות, ולא רק למפות דעות. הוא עוזר לייצר רשימה מדורגת תוך התחשבות במגוון בתוך הקבוצה. במקום לתגמל רק את הגוש הגדול ביותר, הוא מחפש סדרי עדיפויות שיכולים לשמור על לגיטימיות בין ההבדלים.",
          },
        ],
      },
      {
        title: "פרטיות ואמון",
        items: [
          {
            question: "איך Agora מגנה על פרטיות באמצעות הוכחות אפס ידע?",
            answer:
              "[הוכחות אפס ידע (ZKP)](https://en.wikipedia.org/wiki/Zero-knowledge_proof) מאפשרות למשתתפים להוכיח זכאות או ייחודיות בלי לחשוף מידע אישי. למשל, להוכיח ל-Agora את קבוצת הגיל שלכם בלי לחשוף את הגיל האמיתי. כיום Agora תומכת ב-[ZK Passport](https://rarimo.com/), שמאפשר להוכיח אזרחות, גיל ומגדר באופן אנונימי. צרו איתנו קשר אם תרצו לגלות ולהגדיר מערכות זהות אחרות, כמו הוכחת השתתפות אנונימית באירוע, מיקום GPS או אפילו חיבור WiFi.",
          },
          {
            question: "האם ההשתתפות ב-Agora אנונימית?",
            answer:
              "Agora תומכת בהשתתפות השומרת על פרטיות, אך האנונימיות תלויה בהגדרה ובמה שאנשים כותבים. [מדוע ZKP לבדן אינן מספיקות להגנה על פרטיות](/resources/why-zk-proofs-alone-arent-enough).",
          },
          {
            question: "איך פועל המודרציה?",
            answer:
              "כל אחד יכול לדווח על תוכן כמו ספאם, תוכן מטעה, אנטי-חברתי, מיני, דוקסינג או בלתי חוקי. יוצרי שיחות ומודרטורים יכולים לפעול לפי דיווחים, ופעולות המודרציה נרשמות בהיסטוריית המודרציה.",
          },
          {
            question: "האם Agora עומדת ב-GDPR?",
            answer:
              "Agora מפותחת על ידי ZKorum SAS בצרפת ומתוכננת סביב פרטיות כברירת תכנון, מזעור נתונים, זכויות משתמשים וחובות GDPR.",
          },
        ],
      },
      {
        title: "תשתית פתוחה",
        items: [
          {
            question: "האם Agora היא קוד פתוח?",
            answer:
              "כן. הקוד של Agora זמין ב-[GitHub](https://github.com/zkorum/agora) תחת רישיונות קוד פתוח. אנו מעודדים ביקורת, משוב ותרומות מהקהילה. אנו מחזיקים בחזון שלפיו דמוקרטיה צריכה תשתית דיגיטלית שכל אחד יכול להשתמש בה, לשנות ולשפר.",
          },
          {
            question: "האם Agora יכולה לעבוד עם כלים אחרים?",
            answer:
              "כן. Agora תומכת באינטראופרביליות מעשית דרך יבוא, יצוא, הטמעות, API בפיתוח וקוד פתוח. השקנו גם את יוזמת [DDS (Decentralized Deliberation Standard)](https://dds.xyz), לאינטראופרביליות רחבה יותר ברמת הפרוטוקול.",
          },
        ],
      },
    ],
  },
  ja: {
    questionCountLabel: "件の質問",
    groups: [
      {
        title: "Agoraの使い方",
        items: [
          {
            question: "Agoraは誰のためのものですか？",
            answer:
              "Agoraは、ファシリテーター、イベント主催者、市民参加チーム、コミュニティマネージャー、企業、DAO、NGO、公共機関、そして違いを越えて人々を理解する必要があるあらゆるグループのためのものです。",
          },
          {
            question:
              "Conversation ModeとPrioritization Modeはどう選べばよいですか？",
            answer:
              "問いがまだ開かれており、視点を集め、意見の相違を可視化し、共通点を見つけたい場合はConversation Modeを使います。すでに提案があり、何が最も重要かを順位づけしたい場合はPrioritization Modeを使います。[ファシリテーションガイドを読む](/resources/facilitation-guide)。",
          },
          {
            question: "両方のモードを一緒に使えますか？",
            answer:
              "はい。一般的には、Conversation Modeから始めて、強い提案や橋渡しになる提案を見つけ、その後Prioritization Modeで実行可能な順位づけに変換します。",
          },
        ],
      },
      {
        title: "合意形成の仕組み",
        items: [
          {
            question: "Agoraはどのように共通点を見つけますか？",
            answer:
              "参加者はステートメントに対して、賛成、反対、わからないで投票します。Agoraはステートメントの文言ではなく投票パターンを分析し、人々がどこでまとまり、どこで分かれ、どのステートメントが異なる意見グループをまたいで支持されているかを示します。意見マッピングはLLMではなく機械学習に基づき、元の[Pol.is](https://compdemocracy.org/Polis/)をオープンソースで再実装した[Red Dwarf](https://github.com/polis-community/red-dwarf)を使用しています。",
          },
          {
            question: "コンセンサスと多数派の違いは何ですか？",
            answer:
              "多数派のステートメントは、参加者全体の多くに支持されています。コンセンサスのステートメントは、複数の意見グループをまたいで支持されているため、小さなグループを単に押しつぶすものではありません。Agoraにおけるコンセンサスは全員一致を意味しません。場にある主要な違いを越えて正当性がある、という意味です。",
          },
          {
            question: "意見グループと橋渡しステートメントとは何ですか？",
            answer:
              "意見グループは、似た投票行動をする参加者のクラスターです。人口統計やAIラベルではなく、投票行動から推定されます。橋渡しステートメントは、他の多くの点で対立しているグループ同士でも支持できるステートメントです。これはPol.isに着想を得たアルゴリズムの一部で、隠れた共通点を見えるようにします。",
          },
          {
            question: "AIが結果を決めているのですか？",
            answer:
              "いいえ。意見グループと共通点のシグナルは、生成AIではなく、投票パターンの決定論的な分析から得られます。意見グループ化の後、AgoraはMistral Largeを使って各グループの代表的な意見にラベルを付け、要約しますが、これらの要約は結果を読みやすくする補助にすぎません。元のステートメントは各グループの下に表示され続け、会話のオーナーはAI要約をオフにできます。",
          },
          {
            question: "Plural Votingとは何ですか？",
            answer:
              "Plural Votingは、意見をマッピングするだけでなく、グループが提案を優先順位づけする必要があるときに使われます。グループ内の多様性を考慮しながら、順位づけされたリストを作るのに役立ちます。最大勢力だけを有利にするのではなく、違いを越えて正当性を保てる優先事項を探します。",
          },
        ],
      },
      {
        title: "プライバシーと信頼",
        items: [
          {
            question:
              "Agoraはゼロ知識証明でどのようにプライバシーを守りますか？",
            answer:
              "[ゼロ知識証明（ZKP）](https://en.wikipedia.org/wiki/Zero-knowledge_proof)により、参加者は個人データを明かさずに資格や一意性を証明できます。たとえば、実年齢を明かさずに年齢層をAgoraに証明できます。現在Agoraは[ZK Passport](https://rarimo.com/)をサポートしており、国籍、年齢、ジェンダーを匿名で証明できます。イベント参加の匿名証明、GPS位置情報、WiFi接続など、他のIDシステムを見つけて設定したい場合はお問い合わせください。",
          },
          {
            question: "Agoraでの参加は匿名ですか？",
            answer:
              "Agoraはプライバシーを保護する参加をサポートしていますが、匿名性は設定と参加者が書く内容に依存します。[ZKPだけではプライバシー保護に十分でない理由](/resources/why-zk-proofs-alone-arent-enough)。",
          },
          {
            question: "モデレーションはどのように機能しますか？",
            answer:
              "誰でも、スパム、誤解を招く内容、反社会的な内容、性的な内容、個人情報の晒し、違法な内容などを報告できます。会話の作成者とモデレーターは報告に対応でき、モデレーション操作は履歴に記録されます。",
          },
          {
            question: "AgoraはGDPRに準拠していますか？",
            answer:
              "AgoraはフランスのZKorum SASによって開発されており、プライバシー・バイ・デザイン、データ最小化、ユーザーの権利、GDPR上の義務を中心に設計されています。",
          },
        ],
      },
      {
        title: "オープンインフラ",
        items: [
          {
            question: "Agoraはオープンソースですか？",
            answer:
              "はい。Agoraのコードはオープンソースライセンスのもとで[GitHub](https://github.com/zkorum/agora)に公開されています。私たちはコミュニティからの監査、フィードバック、貢献を歓迎しています。民主主義には、誰もが使い、変更し、改善できるデジタルインフラが必要だというビジョンを大切にしています。",
          },
          {
            question: "Agoraは他のツールと連携できますか？",
            answer:
              "はい。Agoraは、インポート、エクスポート、埋め込み、開発中のAPI、オープンソースコードを通じて実用的な相互運用性をサポートしています。また、より広いプロトコルレベルの相互運用性に向けて[DDS (Decentralized Deliberation Standard)](https://dds.xyz)イニシアチブも立ち上げました。",
          },
        ],
      },
    ],
  },
  "zh-hans": {
    questionCountLabel: "个问题",
    groups: [
      {
        title: "使用 Agora",
        items: [
          {
            question: "Agora 适合谁使用？",
            answer:
              "Agora 面向引导者、活动组织者、公民参与团队、社区经理、公司、DAO、NGO、公共机构，以及任何需要理解不同人群观点的组织。",
          },
          {
            question: "如何在对话模式和优先级模式之间选择？",
            answer:
              "当问题仍然开放，你想收集不同视角、绘制分歧并找到共同点时，请使用对话模式。当你已经有若干提案，并需要按重要性排序时，请使用优先级模式。[阅读引导指南](/resources/facilitation-guide)。",
          },
          {
            question: "两个模式可以一起使用吗？",
            answer:
              "可以。常见流程是先用对话模式，识别有力的提案或能连接不同群体的提案，再用优先级模式将它们转化为可行动的排序。",
          },
        ],
      },
      {
        title: "共识如何运作",
        items: [
          {
            question: "Agora 如何找到共同点？",
            answer:
              "参与者对陈述投票：同意、不同意或不确定。Agora 随后分析这些投票模式，而不是陈述的文字本身，以展示人们在哪里聚集、在哪里分歧，以及哪些陈述在不同意见群体之间都获得支持。意见地图基于机器学习，而不是 LLM，使用 [Red Dwarf](https://github.com/polis-community/red-dwarf)，这是原始 [Pol.is](https://compdemocracy.org/Polis/) 的开源再实现。",
          },
          {
            question: "共识和多数有什么区别？",
            answer:
              "多数陈述是整体上得到大多数参与者支持的陈述。共识陈述则是在不同意见群体之间都得到支持的陈述，因此它不能简单地压过较小群体。在 Agora 中，共识并不意味着所有人都同意；它意味着该陈述在场内主要差异之间具有正当性。",
          },
          {
            question: "什么是意见群体和桥接陈述？",
            answer:
              "意见群体是投票方式相似的参与者聚类。它们来自投票行为，而不是人口统计数据或 AI 标签。桥接陈述是不同群体都支持的陈述，即使这些群体在许多其他问题上存在分歧。这是算法中受 Pol.is 启发的部分，让隐藏的共同点变得可见。",
          },
          {
            question: "结果是由 AI 决定的吗？",
            answer:
              "不是。意见群体和共同点信号来自对投票模式的确定性分析，而不是生成式 AI。在意见分组之后，Agora 使用 Mistral Large 为每个群体的代表性观点命名和总结，但这些总结只是帮助阅读结果。原始陈述仍会显示在每个群体下方，讨论创建者也可以关闭 AI 总结。",
          },
          {
            question: "什么是 Plural Voting？",
            answer:
              "Plural Voting 用于群体需要对提案排序时，而不仅仅是绘制意见地图。它在考虑群体内部多样性的同时，帮助生成一个排序列表。它不是只奖励最大的阵营，而是寻找能够在差异之间保持正当性的优先事项。",
          },
        ],
      },
      {
        title: "隐私与信任",
        items: [
          {
            question: "Agora 如何用零知识证明保护隐私？",
            answer:
              "[零知识证明（ZKP）](https://en.wikipedia.org/wiki/Zero-knowledge_proof)让参与者无需透露任何个人数据，也能证明资格或唯一性。例如，向 Agora 证明你的年龄段，而不透露真实年龄。目前 Agora 支持 [ZK Passport](https://rarimo.com/)，可以匿名证明公民身份、年龄和性别。如果你想了解并配置其他身份系统，例如匿名活动出席证明、GPS 位置，甚至 WiFi 连接，请联系我们。",
          },
          {
            question: "在 Agora 上参与是匿名的吗？",
            answer:
              "Agora 支持保护隐私的参与方式，但匿名性取决于具体设置以及人们写下的内容。[为什么仅靠 ZKP 不足以保护隐私](/resources/why-zk-proofs-alone-arent-enough)。",
          },
          {
            question: "内容审核如何运作？",
            answer:
              "任何人都可以举报垃圾信息、误导性内容、反社会内容、性内容、人肉搜索或非法内容。讨论创建者和审核员可以处理举报，审核操作会记录在审核历史中。",
          },
          {
            question: "Agora 符合 GDPR 吗？",
            answer:
              "Agora 由法国 ZKorum SAS 开发，并围绕隐私保护设计、数据最小化、用户权利和 GDPR 义务进行设计。",
          },
        ],
      },
      {
        title: "开放基础设施",
        items: [
          {
            question: "Agora 是开源的吗？",
            answer:
              "是的。Agora 的代码以开源许可证发布在 [GitHub](https://github.com/zkorum/agora) 上。我们鼓励社区进行审计、反馈和贡献。我们坚持这样的愿景：民主需要任何人都能使用、修改和改进的数字基础设施。",
          },
          {
            question: "Agora 能与其他工具配合使用吗？",
            answer:
              "可以。Agora 通过导入、导出、嵌入、正在开发的 API 和开源代码支持实用的互操作性。我们还发起了 [DDS（Decentralized Deliberation Standard）](https://dds.xyz) 倡议，以实现更广泛的协议层互操作性。",
          },
        ],
      },
    ],
  },
  "zh-hant": {
    questionCountLabel: "個問題",
    groups: [
      {
        title: "使用 Agora",
        items: [
          {
            question: "Agora 適合誰使用？",
            answer:
              "Agora 面向引導者、活動組織者、公民參與團隊、社群經理、公司、DAO、NGO、公共機構，以及任何需要理解不同人群觀點的組織。",
          },
          {
            question: "如何在對話模式和優先級模式之間選擇？",
            answer:
              "當問題仍然開放，你想收集不同視角、繪製分歧並找到共同點時，請使用對話模式。當你已經有若干提案，並需要按重要性排序時，請使用優先級模式。[閱讀引導指南](/resources/facilitation-guide)。",
          },
          {
            question: "兩個模式可以一起使用嗎？",
            answer:
              "可以。常見流程是先用對話模式，識別有力的提案或能連接不同群體的提案，再用優先級模式將它們轉化為可行動的排序。",
          },
        ],
      },
      {
        title: "共識如何運作",
        items: [
          {
            question: "Agora 如何找到共同點？",
            answer:
              "參與者對陳述投票：同意、不同意或不確定。Agora 隨後分析這些投票模式，而不是陳述的文字本身，以展示人們在哪裡聚集、在哪裡分歧，以及哪些陳述在不同意見群體之間都獲得支持。意見地圖基於機器學習，而不是 LLM，使用 [Red Dwarf](https://github.com/polis-community/red-dwarf)，這是原始 [Pol.is](https://compdemocracy.org/Polis/) 的開源再實現。",
          },
          {
            question: "共識和多數有什麼區別？",
            answer:
              "多數陳述是整體上得到大多數參與者支持的陳述。共識陳述則是在不同意見群體之間都得到支持的陳述，因此它不能簡單地壓過較小群體。在 Agora 中，共識並不意味著所有人都同意；它意味著該陳述在場內主要差異之間具有正當性。",
          },
          {
            question: "什麼是意見群體和橋接陳述？",
            answer:
              "意見群體是投票方式相似的參與者聚類。它們來自投票行為，而不是人口統計資料或 AI 標籤。橋接陳述是不同群體都支持的陳述，即使這些群體在許多其他問題上存在分歧。這是演算法中受 Pol.is 啟發的部分，讓隱藏的共同點變得可見。",
          },
          {
            question: "結果是由 AI 決定的嗎？",
            answer:
              "不是。意見群體和共同點訊號來自對投票模式的確定性分析，而不是生成式 AI。在意見分組之後，Agora 使用 Mistral Large 為每個群體的代表性觀點命名和總結，但這些總結只是幫助閱讀結果。原始陳述仍會顯示在每個群體下方，討論建立者也可以關閉 AI 總結。",
          },
          {
            question: "什麼是 Plural Voting？",
            answer:
              "Plural Voting 用於群體需要對提案排序時，而不僅僅是繪製意見地圖。它在考慮群體內部多樣性的同時，幫助生成一個排序列表。它不是只獎勵最大的陣營，而是尋找能夠在差異之間保持正當性的優先事項。",
          },
        ],
      },
      {
        title: "隱私與信任",
        items: [
          {
            question: "Agora 如何用零知識證明保護隱私？",
            answer:
              "[零知識證明（ZKP）](https://en.wikipedia.org/wiki/Zero-knowledge_proof)讓參與者無需透露任何個人資料，也能證明資格或唯一性。例如，向 Agora 證明你的年齡層，而不透露真實年齡。目前 Agora 支援 [ZK Passport](https://rarimo.com/)，可以匿名證明公民身份、年齡和性別。如果你想了解並配置其他身份系統，例如匿名活動出席證明、GPS 位置，甚至 WiFi 連線，請聯絡我們。",
          },
          {
            question: "在 Agora 上參與是匿名的嗎？",
            answer:
              "Agora 支援保護隱私的參與方式，但匿名性取決於具體設定以及人們寫下的內容。[為什麼僅靠 ZKP 不足以保護隱私](/resources/why-zk-proofs-alone-arent-enough)。",
          },
          {
            question: "內容審核如何運作？",
            answer:
              "任何人都可以舉報垃圾訊息、誤導性內容、反社會內容、性內容、人肉搜尋或非法內容。討論建立者和審核員可以處理舉報，審核操作會記錄在審核歷史中。",
          },
          {
            question: "Agora 符合 GDPR 嗎？",
            answer:
              "Agora 由法國 ZKorum SAS 開發，並圍繞隱私保護設計、資料最小化、使用者權利和 GDPR 義務進行設計。",
          },
        ],
      },
      {
        title: "開放基礎設施",
        items: [
          {
            question: "Agora 是開源的嗎？",
            answer:
              "是的。Agora 的程式碼以開源授權發布在 [GitHub](https://github.com/zkorum/agora) 上。我們鼓勵社群進行審計、回饋和貢獻。我們堅持這樣的願景：民主需要任何人都能使用、修改和改進的數位基礎設施。",
          },
          {
            question: "Agora 能與其他工具配合使用嗎？",
            answer:
              "可以。Agora 透過匯入、匯出、嵌入、正在開發的 API 和開源程式碼支援實用的互操作性。我們還發起了 [DDS（Decentralized Deliberation Standard）](https://dds.xyz) 倡議，以實現更廣泛的協議層互操作性。",
          },
        ],
      },
    ],
  },
  ky: {
    questionCountLabel: "суроо",
    groups: [
      {
        title: "Agora колдонуу",
        items: [
          {
            question: "Agora кимдер үчүн?",
            answer:
              "Agora фасилитаторлор, иш-чара уюштуруучулары, жарандык катышуу командалары, коомчулук менеджерлери, компаниялар, DAOлор, бейөкмөт уюмдар, мамлекеттик мекемелер жана айырмачылыктары бар адамдарды түшүнүшү керек болгон бардык топтор үчүн.",
          },
          {
            question:
              "Conversation Mode менен Prioritization Mode ортосунда кантип тандайм?",
            answer:
              "Суроо дагы эле ачык болуп, ар түрдүү көз караштарды чогултуп, пикир келишпестиктерди картага түшүрүп жана жалпы негиз табууну кааласаңыз, Conversation Mode колдонуңуз. Эгер сунуштар даяр болуп, эң маанилүү нерселердин рейтингин түзүү керек болсо, Prioritization Mode колдонуңуз. [Фасилитация боюнча колдонмону окуңуз](/resources/facilitation-guide).",
          },
          {
            question: "Эки режимди чогуу колдонсо болобу?",
            answer:
              "Ооба. Көп колдонулган жол: Conversation Mode менен баштап, күчтүү же көпүрө болгон сунуштарды аныктоо, андан кийин Prioritization Mode аркылуу аларды аракетке жарай турган рейтингге айлантуу.",
          },
        ],
      },
      {
        title: "Консенсус кантип иштейт",
        items: [
          {
            question: "Agora жалпы негизди кантип табат?",
            answer:
              "Катышуучулар билдирүүлөргө макул, каршы же ишенимсиз деп добуш беришет. Андан соң Agora билдирүүлөрдүн текстин эмес, ошол добуштардагы үлгүлөрдү картага түшүрөт: адамдар кайсы жерде топтолот, кайсы жерде айырмаланат жана кайсы билдирүүлөр ар башка пикир топторунда колдоо табат. Пикир картасы LLM эмес, машина үйрөнүүсүнө негизделет жана баштапкы [Pol.is](https://compdemocracy.org/Polis/) системасынын ачык булактуу кайра ишке ашырылышы болгон [Red Dwarf](https://github.com/polis-community/red-dwarf) колдонулат.",
          },
          {
            question: "Консенсус менен көпчүлүктүн айырмасы эмнеде?",
            answer:
              "Көпчүлүк билдирүүсүн катышуучулардын көбү жалпы деңгээлде колдойт. Консенсус билдирүүсү болсо пикир топторунун ортосунда колдоо табат, ошондуктан ал кичине топту жөн эле басып өтпөйт. Agoraда консенсус баары макул дегенди билдирбейт; ал бөлмөдөгү негизги айырмачылыктар боюнча билдирүүнүн мыйзамдуулугу бар дегенди билдирет.",
          },
          {
            question: "Пикир топтору жана көпүрө билдирүүлөр деген эмне?",
            answer:
              "Пикир топтору окшош добуш берген катышуучулардын кластерлери. Алар демографиядан же AI белгилеринен эмес, добуш берүү жүрүм-турумунан чыгарылат. Көпүрө билдирүүлөр ар башка топтор колдогон билдирүүлөр, ошол эле топтор башка көп маселеде келишпесе да. Бул Pol.isтен шыктанган алгоритмдин бөлүгү жана жашыруун жалпы негизди көрүнүктүү кылат.",
          },
          {
            question: "Натыйжаларды AI чечеби?",
            answer:
              "Жок. Пикир топтору жана жалпы негиз сигналдары генеративдик AIден эмес, добуш берүү үлгүлөрүнүн детерминисттик анализинен чыгат. Пикир топтоо кадамынан кийин Agora ар бир топтун өкүл пикирлерин белгилеп жана кыскача түшүндүрүү үчүн Mistral Large колдонот, бирок бул кыскача түшүндүрмөлөр натыйжаларды окууга гана жардам берет. Баштапкы билдирүүлөр ар бир топтун астында көрүнүп турат жана сүйлөшүү ээлери AI кыскача баяндарын өчүрө алышат.",
          },
          {
            question: "Plural Voting деген эмне?",
            answer:
              "Plural Voting топ пикирлерди гана картага түшүрбөй, сунуштарды артыкчылык боюнча иреттеши керек болгондо колдонулат. Ал топ ичиндеги ар түрдүүлүктү эске алуу менен рейтинг түзүүгө жардам берет. Эң чоң блокту гана сыйлоонун ордуна, айырмачылыктар арасында мыйзамдуулугун сактай алган артыкчылыктарды издейт.",
          },
        ],
      },
      {
        title: "Купуялык жана ишеним",
        items: [
          {
            question:
              "Agora нөлдүк билим далилдери менен купуялыкты кантип коргойт?",
            answer:
              "[Нөлдүк билим далилдери (ZKP)](https://en.wikipedia.org/wiki/Zero-knowledge_proof) катышуучуларга жеке маалыматтарды ачпастан жарактуулугун же уникалдуулугун далилдөөгө мүмкүндүк берет. Мисалы, Agoraга өз жаш курак тобуңузду так жашыңызды көрсөтпөстөн далилдей аласыз. Учурда Agora [ZK Passport](https://rarimo.com/) колдойт, ал жарандыкты, жашты жана жынысты анонимдүү далилдөөгө мүмкүндүк берет. Иш-чарага катышууну анонимдүү далилдөө, GPS жайгашуу же WiFi туташуусу сыяктуу башка идентификация системаларын билгиңиз жана конфигурациялагыңыз келсе, биз менен байланышыңыз.",
          },
          {
            question: "Agoraдагы катышуу анонимдүүбү?",
            answer:
              "Agora купуялыкты сактаган катышууну колдойт, бирок анонимдүүлүк орнотуудан жана адамдар эмне жазганынан көз каранды. [Эмне үчүн ZKPлер гана купуялыкты коргоого жетишсиз](/resources/why-zk-proofs-alone-arent-enough).",
          },
          {
            question: "Модерация кантип иштейт?",
            answer:
              "Ар ким спам, адаштыруучу, коомго каршы, сексуалдык, doxxing же мыйзамсыз мазмун тууралуу билдире алат. Сүйлөшүү түзүүчүлөрү жана модераторлор билдирүүлөр боюнча аракет кыла алышат, ал эми модерация аракеттери модерация тарыхында жазылат.",
          },
          {
            question: "Agora GDPR талаптарына ылайыкпы?",
            answer:
              "Agora Франциядагы ZKorum SAS тарабынан иштелип чыгат жана дизайндагы купуялык, маалыматты минималдаштыруу, колдонуучу укуктары жана GDPR милдеттенмелери айланасында түзүлгөн.",
          },
        ],
      },
      {
        title: "Ачык инфраструктура",
        items: [
          {
            question: "Agora ачык булактуубу?",
            answer:
              "Ооба. Agoraнын коду [GitHub](https://github.com/zkorum/agora) сайтында ачык булак лицензиялары менен жеткиликтүү. Биз коомчулуктан аудитти, пикирди жана салымдарды кубаттайбыз. Демократияга ар ким колдонуп, өзгөртүп жана жакшырта ала турган санариптик инфраструктура керек деген көз карашты колдойбуз.",
          },
          {
            question: "Agora башка куралдар менен иштей алабы?",
            answer:
              "Ооба. Agora импорт, экспорт, embed, иштелип жаткан APIлер жана ачык булактуу код аркылуу практикалык өз ара иштешүүнү колдойт. Ошондой эле биз протокол деңгээлиндеги кеңири өз ара иштешүү үчүн [DDS (Decentralized Deliberation Standard)](https://dds.xyz) демилгесин баштадык.",
          },
        ],
      },
    ],
  },
  ru: {
    questionCountLabel: "вопросов",
    groups: [
      {
        title: "Использование Agora",
        items: [
          {
            question: "Для кого предназначена Agora?",
            answer:
              "Agora предназначена для фасилитаторов, организаторов мероприятий, команд гражданского участия, менеджеров сообществ, компаний, DAO, НКО, государственных учреждений и любых групп, которым нужно понимать людей с разными взглядами.",
          },
          {
            question:
              "Как выбрать между режимом обсуждения и режимом приоритизации?",
            answer:
              "Используйте режим обсуждения, когда вопрос все еще открыт и вы хотите собрать точки зрения, нанести разногласия на карту и найти общую основу. Используйте режим приоритизации, когда у вас уже есть предложения и нужен ранжированный список того, что важнее всего. [Прочитайте руководство по фасилитации](/resources/facilitation-guide).",
          },
          {
            question: "Можно ли использовать оба режима вместе?",
            answer:
              "Да. Частый процесс: начать с режима обсуждения, определить сильные или мостовые предложения, а затем использовать режим приоритизации, чтобы превратить их в практический рейтинг.",
          },
        ],
      },
      {
        title: "Как работает консенсус",
        items: [
          {
            question: "Как Agora находит общую основу?",
            answer:
              "Участники голосуют за утверждения: согласен, не согласен или не уверен. Затем Agora анализирует паттерны этих голосов, а не формулировки утверждений, чтобы показать, где люди группируются, где расходятся и какие утверждения получают поддержку в разных группах мнений. Картирование мнений основано на машинном обучении, а не на LLM, и использует [Red Dwarf](https://github.com/polis-community/red-dwarf), открытую реализацию оригинального [Pol.is](https://compdemocracy.org/Polis/).",
          },
          {
            question: "В чем разница между консенсусом и большинством?",
            answer:
              "Утверждение большинства поддерживает большинство участников в целом. Консенсусное утверждение поддерживается в разных группах мнений, поэтому оно не просто подавляет меньшую группу. В Agora консенсус не означает, что все согласны; он означает, что утверждение имеет легитимность среди главных различий в комнате.",
          },
          {
            question: "Что такое группы мнений и мостовые утверждения?",
            answer:
              "Группы мнений — это кластеры участников, которые голосуют похожим образом. Они выводятся из поведения при голосовании, а не из демографии или AI-меток. Мостовые утверждения — это утверждения, которые поддерживают разные группы, даже если эти же группы расходятся по многим другим вопросам. Это вдохновленная Pol.is часть алгоритма, которая делает скрытую общую основу видимой.",
          },
          {
            question: "Решает ли ИИ результаты?",
            answer:
              "Нет. Группы мнений и сигналы общей основы приходят из детерминированного анализа паттернов голосования, а не из генеративного ИИ. После этапа группировки мнений Agora использует Mistral Large, чтобы назвать и резюмировать репрезентативные мнения каждой группы, но эти резюме только помогают читать результаты. Исходные утверждения остаются видимыми под каждой группой, а владельцы обсуждения могут отключить AI-резюме.",
          },
          {
            question: "Что такое Plural Voting?",
            answer:
              "Plural Voting используется, когда группе нужно приоритизировать предложения, а не только картировать мнения. Он помогает сформировать ранжированный список с учетом разнообразия внутри группы. Вместо того чтобы вознаграждать только самый большой блок, он ищет приоритеты, которые могут сохранять легитимность при наличии различий.",
          },
        ],
      },
      {
        title: "Конфиденциальность и доверие",
        items: [
          {
            question:
              "Как Agora защищает конфиденциальность с помощью доказательств с нулевым разглашением?",
            answer:
              "[Доказательства с нулевым разглашением (ZKP)](https://en.wikipedia.org/wiki/Zero-knowledge_proof) позволяют участникам доказывать право на участие или уникальность, не раскрывая персональные данные. Например, можно доказать Agora свою возрастную группу, не раскрывая фактический возраст. Сейчас Agora поддерживает [ZK Passport](https://rarimo.com/), который позволяет анонимно доказывать гражданство, возраст и гендер. Свяжитесь с нами, если хотите изучить и настроить другие системы идентичности, например анонимное доказательство посещения мероприятия, GPS-локацию или даже WiFi-подключение.",
          },
          {
            question: "Участие в Agora анонимно?",
            answer:
              "Agora поддерживает участие с сохранением конфиденциальности, но анонимность зависит от настроек и от того, что люди пишут. [Почему одних ZKP недостаточно для защиты конфиденциальности](/resources/why-zk-proofs-alone-arent-enough).",
          },
          {
            question: "Как работает модерация?",
            answer:
              "Любой может пожаловаться на спам, вводящий в заблуждение, антисоциальный, сексуальный, doxxing или незаконный контент. Создатели обсуждений и модераторы могут реагировать на жалобы, а действия модерации записываются в историю модерации.",
          },
          {
            question: "Соответствует ли Agora GDPR?",
            answer:
              "Agora разрабатывается ZKorum SAS во Франции и спроектирована вокруг privacy by design, минимизации данных, прав пользователей и обязательств GDPR.",
          },
        ],
      },
      {
        title: "Открытая инфраструктура",
        items: [
          {
            question: "Agora имеет открытый исходный код?",
            answer:
              "Да. Код Agora доступен на [GitHub](https://github.com/zkorum/agora) под лицензиями открытого исходного кода. Мы поощряем аудит, обратную связь и вклад сообщества. Мы придерживаемся идеи, что демократии нужна цифровая инфраструктура, которую любой может использовать, изменять и улучшать.",
          },
          {
            question: "Может ли Agora работать с другими инструментами?",
            answer:
              "Да. Agora поддерживает практическую совместимость через импорт, экспорт, встраивание, API в разработке и открытый исходный код. Мы также запустили инициативу [DDS (Decentralized Deliberation Standard)](https://dds.xyz) для более широкой совместимости на уровне протокола.",
          },
        ],
      },
    ],
  },
};

export function getFaqContent(locale: string): FaqContent {
  if (isFaqLocale(locale)) return faqContentByLocale[locale];

  return faqContentByLocale.en;
}
