import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

interface LabelledGuideline {
  label: string;
  description: string;
}

interface GuidelinesSubsection {
  heading: string;
  rules: string[];
}

export interface GuidelinesContent {
  title: string;
  automatedTranslationNotice: {
    title: string;
    message: string;
    viewEnglish: string;
    returnTranslated: string;
  };
  moderationPrinciples: {
    heading: string;
    introduction: string;
    principles: LabelledGuideline[];
  };
  communityStandards: {
    heading: string;
    introduction: string;
    subsections: GuidelinesSubsection[];
  };
  moderationProcess: {
    heading: string;
    reporting: {
      heading: string;
      introduction: string;
      categories: LabelledGuideline[];
    };
    review: GuidelinesSubsection;
  };
  consequences: {
    heading: string;
    violationHeader: string;
    consequenceHeader: string;
    rows: LabelledGuideline[];
  };
  feedback: {
    heading: string;
    points: string[];
    closing: string;
    contactBeforeEmail: string;
    contactAfterEmail: string;
  };
}

export const guidelinesContent: Record<
  SupportedDisplayLanguageCodes,
  GuidelinesContent
> = {
  en: {
    title: "Community Guidelines",
    automatedTranslationNotice: {
      title: "Automated translation",
      message:
        "This page was translated automatically. If there is any discrepancy, the English version exclusively prevails.",
      viewEnglish: "View authoritative English version",
      returnTranslated: "Return to translated version",
    },
    moderationPrinciples: {
      heading: "1. Principles of Moderation",
      introduction:
        "Agora Citizen Network is a space for open and constructive political and social discussions. To ensure a fair, respectful, and inclusive environment, our moderation system follows these principles:",
      principles: [
        {
          label: "Transparency:",
          description:
            "All moderation actions are logged and publicly reviewable.",
        },
        {
          label: "Inclusivity:",
          description:
            "Diverse perspectives are welcome, provided they adhere to respectful discourse.",
        },
        {
          label: "Verifiability:",
          description:
            "Users can review moderation history and appeal decisions.",
        },
      ],
    },
    communityStandards: {
      heading: "2. Community Standards",
      introduction:
        "To participate in Agora, users must follow these guidelines:",
      subsections: [
        {
          heading: "2.1 Respectful Discourse",
          rules: [
            "Engage in discussions with mutual respect.",
            "No personal attacks, insults, or harassment.",
            "Disagreements should be expressed constructively.",
          ],
        },
        {
          heading: "2.2 No Hate Speech or Extremism",
          rules: [
            "No content promoting racism, sexism, xenophobia, homophobia, or discrimination.",
            "No advocacy of violence, extremism, or radicalization.",
          ],
        },
        {
          heading: "2.3 No Misinformation or Manipulation",
          rules: [
            "No intentional spreading of false information or conspiracy theories.",
            "No use of bots, astroturfing, or deceptive behavior.",
          ],
        },
        {
          heading: "2.4 No Spam or Unsolicited Promotions",
          rules: [
            "No excessive self-promotion, ads, or irrelevant content.",
            "No repetitive posting of the same content across discussions.",
          ],
        },
        {
          heading: "2.5 Privacy and Safety Protection",
          rules: [
            "No sharing of private or personally identifiable information without consent.",
            "No doxxing, threats, or incitement to violence.",
          ],
        },
      ],
    },
    moderationProcess: {
      heading: "3. Moderation Process",
      reporting: {
        heading: "3.1 Community Moderation & Reporting",
        introduction:
          "Users can report content under the following categories:",
        categories: [
          {
            label: "Antisocial:",
            description: "Offensive, hateful, or targeted harassment.",
          },
          {
            label: "Misleading:",
            description: "False or misleading claims, deceptive content.",
          },
          {
            label: "Illegal:",
            description:
              "Violations of laws or promotion of illegal activities.",
          },
          {
            label: "Doxxing:",
            description: "Unauthorized sharing of private information.",
          },
          {
            label: "Sexual:",
            description: "Sexually explicit or inappropriate material.",
          },
          {
            label: "Spam:",
            description: "Repetitive, off-topic, or promotional content.",
          },
        ],
      },
      review: {
        heading: "3.2 Moderation Review & Appeal System",
        rules: [
          "Moderation actions (warnings, removals, suspensions) are logged and publicly reviewable.",
          "Users may appeal moderation decisions through an open review process.",
          "Repeated violations result in escalating consequences.",
        ],
      },
    },
    consequences: {
      heading: "4. Consequences for Violations",
      violationHeader: "Violation Level",
      consequenceHeader: "Consequence",
      rows: [
        {
          label: "First Violation",
          description: "Warning and content removal.",
        },
        {
          label: "Second Violation",
          description: "Temporary suspension.",
        },
        {
          label: "Severe Violations (e.g., threats, doxxing)",
          description: "Permanent suspension.",
        },
      ],
    },
    feedback: {
      heading: "5. Feedback & Adaptation",
      points: [
        "Users may appeal moderation decisions through a transparent review system.",
        "Feedback on moderation policies is encouraged and reviewed regularly to adapt to community needs.",
      ],
      closing:
        "These guidelines are designed to foster a space for meaningful, respectful, and impactful discussions. Thank you for being a part of Agora Citizen Network!",
      contactBeforeEmail:
        "If you have any questions or concerns about our Community Guidelines, please contact us at ",
      contactAfterEmail: ".",
    },
  },
  ar: {
    title: "إرشادات المجتمع",
    automatedTranslationNotice: {
      title: "ترجمة آلية",
      message:
        "تُرجمت هذه الصفحة آليًا. وفي حال وجود أي تعارض، تسود النسخة الإنجليزية وحدها.",
      viewEnglish: "عرض النسخة الإنجليزية المعتمدة",
      returnTranslated: "العودة إلى النسخة المترجمة",
    },
    moderationPrinciples: {
      heading: "1. مبادئ الإشراف",
      introduction:
        "شبكة أغورا للمواطنين مساحة للنقاشات السياسية والاجتماعية المفتوحة والبنّاءة. ولضمان بيئة عادلة ومحترمة وشاملة، يتبع نظام الإشراف لدينا المبادئ التالية:",
      principles: [
        {
          label: "الشفافية:",
          description:
            "تُسجَّل جميع إجراءات الإشراف وتكون متاحة للمراجعة العامة.",
        },
        {
          label: "الشمول:",
          description:
            "نرحب بوجهات النظر المتنوعة، شريطة الالتزام بخطاب محترم.",
        },
        {
          label: "قابلية التحقق:",
          description: "يمكن للمستخدمين مراجعة سجل الإشراف والطعن في القرارات.",
        },
      ],
    },
    communityStandards: {
      heading: "2. معايير المجتمع",
      introduction:
        "للمشاركة في أغورا، يجب على المستخدمين اتباع هذه الإرشادات:",
      subsections: [
        {
          heading: "2.1 الخطاب المحترم",
          rules: [
            "شارك في النقاشات باحترام متبادل.",
            "يُحظر الهجوم الشخصي أو الإهانات أو المضايقة.",
            "ينبغي التعبير عن الخلافات بطريقة بنّاءة.",
          ],
        },
        {
          heading: "2.2 حظر خطاب الكراهية والتطرف",
          rules: [
            "يُحظر المحتوى الذي يروّج للعنصرية أو التمييز الجنسي أو كراهية الأجانب أو رهاب المثلية أو التمييز.",
            "يُحظر الدعوة إلى العنف أو التطرف أو التشدد.",
          ],
        },
        {
          heading: "2.3 حظر المعلومات المضللة والتلاعب",
          rules: [
            "يُحظر النشر المتعمد للمعلومات الكاذبة أو نظريات المؤامرة.",
            "يُحظر استخدام الروبوتات أو حملات التأييد الزائفة أو السلوك المخادع.",
          ],
        },
        {
          heading: "2.4 حظر الرسائل المزعجة والترويج غير المطلوب",
          rules: [
            "يُحظر الإفراط في الترويج الذاتي أو الإعلانات أو المحتوى غير ذي الصلة.",
            "يُحظر تكرار نشر المحتوى نفسه في نقاشات متعددة.",
          ],
        },
        {
          heading: "2.5 حماية الخصوصية والسلامة",
          rules: [
            "يُحظر مشاركة المعلومات الخاصة أو معلومات التعريف الشخصية دون موافقة.",
            "يُحظر كشف المعلومات الشخصية أو التهديدات أو التحريض على العنف.",
          ],
        },
      ],
    },
    moderationProcess: {
      heading: "3. عملية الإشراف",
      reporting: {
        heading: "3.1 إشراف المجتمع والإبلاغ",
        introduction: "يمكن للمستخدمين الإبلاغ عن المحتوى ضمن الفئات التالية:",
        categories: [
          {
            label: "معادٍ للمجتمع:",
            description: "محتوى مسيء أو بغيض أو مضايقة موجّهة.",
          },
          {
            label: "مضلل:",
            description: "ادعاءات كاذبة أو مضللة، أو محتوى مخادع.",
          },
          {
            label: "غير قانوني:",
            description: "انتهاك القوانين أو الترويج لأنشطة غير قانونية.",
          },
          {
            label: "كشف المعلومات الشخصية:",
            description: "مشاركة معلومات خاصة دون تصريح.",
          },
          {
            label: "جنسي:",
            description: "مواد جنسية صريحة أو غير لائقة.",
          },
          {
            label: "رسائل مزعجة:",
            description: "محتوى متكرر أو خارج الموضوع أو ترويجي.",
          },
        ],
      },
      review: {
        heading: "3.2 نظام مراجعة الإشراف والطعن",
        rules: [
          "تُسجَّل إجراءات الإشراف (التحذيرات والإزالات وعمليات التعليق) وتكون متاحة للمراجعة العامة.",
          "يجوز للمستخدمين الطعن في قرارات الإشراف من خلال عملية مراجعة مفتوحة.",
          "تؤدي الانتهاكات المتكررة إلى عواقب متصاعدة.",
        ],
      },
    },
    consequences: {
      heading: "4. عواقب الانتهاكات",
      violationHeader: "مستوى الانتهاك",
      consequenceHeader: "العاقبة",
      rows: [
        { label: "الانتهاك الأول", description: "تحذير وإزالة المحتوى." },
        { label: "الانتهاك الثاني", description: "تعليق مؤقت." },
        {
          label: "الانتهاكات الجسيمة (مثل التهديدات وكشف المعلومات الشخصية)",
          description: "تعليق دائم.",
        },
      ],
    },
    feedback: {
      heading: "5. الملاحظات والتكيّف",
      points: [
        "يجوز للمستخدمين الطعن في قرارات الإشراف من خلال نظام مراجعة شفاف.",
        "نشجع تقديم الملاحظات بشأن سياسات الإشراف، ونراجعها بانتظام للتكيف مع احتياجات المجتمع.",
      ],
      closing:
        "صُممت هذه الإرشادات لتعزيز مساحة للنقاشات الهادفة والمحترمة والمؤثرة. شكرًا لكونك جزءًا من شبكة أغورا للمواطنين!",
      contactBeforeEmail:
        "إذا كانت لديك أي أسئلة أو مخاوف بشأن إرشادات المجتمع، فيُرجى التواصل معنا على ",
      contactAfterEmail: ".",
    },
  },
  es: {
    title: "Directrices de la comunidad",
    automatedTranslationNotice: {
      title: "Traducción automática",
      message:
        "Esta página se ha traducido automáticamente. En caso de discrepancia, prevalecerá exclusivamente la versión en inglés.",
      viewEnglish: "Ver la versión oficial en inglés",
      returnTranslated: "Volver a la versión traducida",
    },
    moderationPrinciples: {
      heading: "1. Principios de moderación",
      introduction:
        "Agora Citizen Network es un espacio para mantener debates políticos y sociales abiertos y constructivos. Para garantizar un entorno justo, respetuoso e inclusivo, nuestro sistema de moderación se rige por los siguientes principios:",
      principles: [
        {
          label: "Transparencia:",
          description:
            "Todas las medidas de moderación quedan registradas y pueden ser revisadas públicamente.",
        },
        {
          label: "Inclusión:",
          description:
            "Las perspectivas diversas son bienvenidas, siempre que mantengan un discurso respetuoso.",
        },
        {
          label: "Verificabilidad:",
          description:
            "Los usuarios pueden consultar el historial de moderación y recurrir las decisiones.",
        },
      ],
    },
    communityStandards: {
      heading: "2. Normas de la comunidad",
      introduction:
        "Para participar en Agora, los usuarios deben seguir estas directrices:",
      subsections: [
        {
          heading: "2.1 Discurso respetuoso",
          rules: [
            "Participe en los debates con respeto mutuo.",
            "No se permiten ataques personales, insultos ni acoso.",
            "Los desacuerdos deben expresarse de forma constructiva.",
          ],
        },
        {
          heading: "2.2 Prohibición del discurso de odio y el extremismo",
          rules: [
            "No se permite contenido que promueva el racismo, el sexismo, la xenofobia, la homofobia o la discriminación.",
            "No se permite defender la violencia, el extremismo ni la radicalización.",
          ],
        },
        {
          heading: "2.3 Prohibición de la desinformación y la manipulación",
          rules: [
            "No se permite difundir intencionadamente información falsa ni teorías conspirativas.",
            "No se permite usar bots, campañas de apoyo popular simuladas ni comportamientos engañosos.",
          ],
        },
        {
          heading: "2.4 Prohibición del spam y las promociones no solicitadas",
          rules: [
            "No se permite la autopromoción excesiva, los anuncios ni el contenido irrelevante.",
            "No se permite publicar repetidamente el mismo contenido en distintos debates.",
          ],
        },
        {
          heading: "2.5 Protección de la privacidad y la seguridad",
          rules: [
            "No se permite compartir información privada o de identificación personal sin consentimiento.",
            "No se permite divulgar datos personales, amenazar ni incitar a la violencia.",
          ],
        },
      ],
    },
    moderationProcess: {
      heading: "3. Proceso de moderación",
      reporting: {
        heading: "3.1 Moderación comunitaria y denuncias",
        introduction:
          "Los usuarios pueden denunciar contenido en las siguientes categorías:",
        categories: [
          {
            label: "Antisocial:",
            description: "Contenido ofensivo u hostil, o acoso dirigido.",
          },
          {
            label: "Engañoso:",
            description:
              "Afirmaciones falsas o engañosas y contenido fraudulento.",
          },
          {
            label: "Ilegal:",
            description:
              "Infracciones de la ley o promoción de actividades ilegales.",
          },
          {
            label: "Divulgación de datos personales:",
            description: "Difusión no autorizada de información privada.",
          },
          {
            label: "Sexual:",
            description: "Material sexualmente explícito o inapropiado.",
          },
          {
            label: "Spam:",
            description: "Contenido repetitivo, ajeno al tema o promocional.",
          },
        ],
      },
      review: {
        heading: "3.2 Sistema de revisión y recurso de la moderación",
        rules: [
          "Las medidas de moderación (advertencias, retiradas y suspensiones) quedan registradas y pueden ser revisadas públicamente.",
          "Los usuarios pueden recurrir las decisiones de moderación mediante un proceso de revisión abierto.",
          "Las infracciones reiteradas dan lugar a consecuencias progresivamente más graves.",
        ],
      },
    },
    consequences: {
      heading: "4. Consecuencias de las infracciones",
      violationHeader: "Nivel de infracción",
      consequenceHeader: "Consecuencia",
      rows: [
        {
          label: "Primera infracción",
          description: "Advertencia y retirada del contenido.",
        },
        { label: "Segunda infracción", description: "Suspensión temporal." },
        {
          label:
            "Infracciones graves (p. ej., amenazas o divulgación de datos personales)",
          description: "Suspensión permanente.",
        },
      ],
    },
    feedback: {
      heading: "5. Comentarios y adaptación",
      points: [
        "Los usuarios pueden recurrir las decisiones de moderación mediante un sistema de revisión transparente.",
        "Se agradecen los comentarios sobre las políticas de moderación, que se revisan periódicamente para adaptarlas a las necesidades de la comunidad.",
      ],
      closing:
        "Estas directrices están concebidas para fomentar un espacio de debates relevantes, respetuosos y de impacto. ¡Gracias por formar parte de Agora Citizen Network!",
      contactBeforeEmail:
        "Si tiene alguna pregunta o inquietud sobre nuestras Directrices de la comunidad, escríbanos a ",
      contactAfterEmail: ".",
    },
  },
  fa: {
    title: "راهنمای جامعه",
    automatedTranslationNotice: {
      title: "ترجمه خودکار",
      message:
        "این صفحه به‌صورت خودکار ترجمه شده است. در صورت هرگونه مغایرت، فقط نسخه انگلیسی معتبر و حاکم است.",
      viewEnglish: "مشاهده نسخه معتبر انگلیسی",
      returnTranslated: "بازگشت به نسخه ترجمه‌شده",
    },
    moderationPrinciples: {
      heading: "1. اصول نظارت",
      introduction:
        "شبکه شهروندی آگورا فضایی برای گفت‌وگوهای سیاسی و اجتماعی باز و سازنده است. برای تضمین محیطی عادلانه، محترمانه و فراگیر، سامانه نظارت ما از اصول زیر پیروی می‌کند:",
      principles: [
        {
          label: "شفافیت:",
          description:
            "تمام اقدامات نظارتی ثبت می‌شوند و برای عموم قابل بررسی‌اند.",
        },
        {
          label: "فراگیری:",
          description:
            "از دیدگاه‌های گوناگون استقبال می‌شود، به شرط آنکه گفت‌وگویی محترمانه را رعایت کنند.",
        },
        {
          label: "قابلیت راستی‌آزمایی:",
          description:
            "کاربران می‌توانند سابقه نظارت را بررسی کنند و به تصمیم‌ها اعتراض کنند.",
        },
      ],
    },
    communityStandards: {
      heading: "2. استانداردهای جامعه",
      introduction:
        "کاربران برای مشارکت در آگورا باید این راهنما را رعایت کنند:",
      subsections: [
        {
          heading: "2.1 گفت‌وگوی محترمانه",
          rules: [
            "با احترام متقابل در گفت‌وگوها شرکت کنید.",
            "حمله شخصی، توهین یا آزار ممنوع است.",
            "اختلاف‌نظرها باید به‌صورت سازنده بیان شوند.",
          ],
        },
        {
          heading: "2.2 ممنوعیت نفرت‌پراکنی و افراط‌گرایی",
          rules: [
            "محتوای ترویج‌کننده نژادپرستی، تبعیض جنسیتی، بیگانه‌هراسی، همجنس‌گراهراسی یا تبعیض ممنوع است.",
            "حمایت از خشونت، افراط‌گرایی یا تندروی ممنوع است.",
          ],
        },
        {
          heading: "2.3 ممنوعیت اطلاعات نادرست و دست‌کاری",
          rules: [
            "انتشار عمدی اطلاعات دروغ یا نظریه‌های توطئه ممنوع است.",
            "استفاده از ربات‌ها، حمایت‌نمایی سازمان‌یافته یا رفتار فریبکارانه ممنوع است.",
          ],
        },
        {
          heading: "2.4 ممنوعیت هرزنامه و تبلیغات ناخواسته",
          rules: [
            "خودتبلیغی بیش از حد، آگهی یا محتوای نامرتبط ممنوع است.",
            "ارسال تکراری محتوای یکسان در گفت‌وگوهای مختلف ممنوع است.",
          ],
        },
        {
          heading: "2.5 حفاظت از حریم خصوصی و ایمنی",
          rules: [
            "اشتراک‌گذاری اطلاعات خصوصی یا اطلاعات هویتی بدون رضایت ممنوع است.",
            "افشای اطلاعات شخصی، تهدید یا تحریک به خشونت ممنوع است.",
          ],
        },
      ],
    },
    moderationProcess: {
      heading: "3. فرایند نظارت",
      reporting: {
        heading: "3.1 نظارت جامعه و گزارش‌دهی",
        introduction: "کاربران می‌توانند محتوا را در دسته‌های زیر گزارش کنند:",
        categories: [
          {
            label: "ضداجتماعی:",
            description: "محتوای توهین‌آمیز یا نفرت‌انگیز، یا آزار هدفمند.",
          },
          {
            label: "گمراه‌کننده:",
            description: "ادعاهای دروغ یا گمراه‌کننده و محتوای فریبکارانه.",
          },
          {
            label: "غیرقانونی:",
            description: "نقض قوانین یا ترویج فعالیت‌های غیرقانونی.",
          },
          {
            label: "افشای اطلاعات شخصی:",
            description: "اشتراک‌گذاری بدون اجازه اطلاعات خصوصی.",
          },
          {
            label: "جنسی:",
            description: "مطالب صریح جنسی یا نامناسب.",
          },
          {
            label: "هرزنامه:",
            description: "محتوای تکراری، نامرتبط با موضوع یا تبلیغاتی.",
          },
        ],
      },
      review: {
        heading: "3.2 سامانه بررسی نظارت و اعتراض",
        rules: [
          "اقدامات نظارتی (هشدارها، حذف‌ها و تعلیق‌ها) ثبت می‌شوند و برای عموم قابل بررسی‌اند.",
          "کاربران می‌توانند از طریق فرایند بررسی باز به تصمیم‌های نظارتی اعتراض کنند.",
          "تخلف‌های مکرر پیامدهای شدیدتری در پی دارند.",
        ],
      },
    },
    consequences: {
      heading: "4. پیامدهای تخلف",
      violationHeader: "سطح تخلف",
      consequenceHeader: "پیامد",
      rows: [
        { label: "تخلف نخست", description: "هشدار و حذف محتوا." },
        { label: "تخلف دوم", description: "تعلیق موقت." },
        {
          label: "تخلف‌های شدید (مانند تهدید یا افشای اطلاعات شخصی)",
          description: "تعلیق دائمی.",
        },
      ],
    },
    feedback: {
      heading: "5. بازخورد و سازگاری",
      points: [
        "کاربران می‌توانند از طریق یک سامانه بررسی شفاف به تصمیم‌های نظارتی اعتراض کنند.",
        "از بازخورد درباره سیاست‌های نظارتی استقبال می‌شود و این سیاست‌ها برای سازگاری با نیازهای جامعه به‌طور منظم بررسی می‌شوند.",
      ],
      closing:
        "این راهنما برای ایجاد فضایی جهت گفت‌وگوهای معنادار، محترمانه و اثرگذار طراحی شده است. از اینکه عضوی از شبکه شهروندی آگورا هستید سپاسگزاریم!",
      contactBeforeEmail:
        "اگر درباره راهنمای جامعه پرسش یا نگرانی‌ای دارید، با ما از طریق ",
      contactAfterEmail: " تماس بگیرید.",
    },
  },
  fr: {
    title: "Règles de la communauté",
    automatedTranslationNotice: {
      title: "Traduction automatique",
      message:
        "Cette page a été traduite automatiquement. En cas de divergence, seule la version anglaise fait foi et prévaut.",
      viewEnglish: "Consulter la version anglaise faisant foi",
      returnTranslated: "Revenir à la version traduite",
    },
    moderationPrinciples: {
      heading: "1. Principes de modération",
      introduction:
        "Agora Citizen Network est un espace de discussions politiques et sociales ouvertes et constructives. Afin de garantir un environnement équitable, respectueux et inclusif, notre système de modération repose sur les principes suivants :",
      principles: [
        {
          label: "Transparence :",
          description:
            "Toutes les actions de modération sont consignées et peuvent être examinées publiquement.",
        },
        {
          label: "Inclusion :",
          description:
            "La diversité des points de vue est bienvenue, à condition que les échanges restent respectueux.",
        },
        {
          label: "Vérifiabilité :",
          description:
            "Les utilisateurs peuvent consulter l’historique de modération et contester les décisions.",
        },
      ],
    },
    communityStandards: {
      heading: "2. Règles de la communauté",
      introduction:
        "Pour participer à Agora, les utilisateurs doivent respecter les règles suivantes :",
      subsections: [
        {
          heading: "2.1 Échanges respectueux",
          rules: [
            "Participez aux discussions dans le respect mutuel.",
            "Les attaques personnelles, les insultes et le harcèlement sont interdits.",
            "Les désaccords doivent être exprimés de manière constructive.",
          ],
        },
        {
          heading: "2.2 Interdiction des discours haineux et de l’extrémisme",
          rules: [
            "Tout contenu faisant la promotion du racisme, du sexisme, de la xénophobie, de l’homophobie ou de la discrimination est interdit.",
            "L’apologie de la violence, de l’extrémisme ou de la radicalisation est interdite.",
          ],
        },
        {
          heading:
            "2.3 Interdiction de la désinformation et de la manipulation",
          rules: [
            "La diffusion intentionnelle de fausses informations ou de théories du complot est interdite.",
            "L’utilisation de robots, de faux mouvements citoyens ou de pratiques trompeuses est interdite.",
          ],
        },
        {
          heading: "2.4 Interdiction du spam et des promotions non sollicitées",
          rules: [
            "L’autopromotion excessive, les publicités et les contenus sans rapport avec le sujet sont interdits.",
            "La publication répétée d’un même contenu dans plusieurs discussions est interdite.",
          ],
        },
        {
          heading: "2.5 Protection de la vie privée et de la sécurité",
          rules: [
            "Le partage d’informations privées ou permettant d’identifier une personne sans son consentement est interdit.",
            "La divulgation de données personnelles, les menaces et l’incitation à la violence sont interdites.",
          ],
        },
      ],
    },
    moderationProcess: {
      heading: "3. Processus de modération",
      reporting: {
        heading: "3.1 Modération communautaire et signalement",
        introduction:
          "Les utilisateurs peuvent signaler du contenu dans les catégories suivantes :",
        categories: [
          {
            label: "Antisocial :",
            description: "Contenu offensant ou haineux, ou harcèlement ciblé.",
          },
          {
            label: "Trompeur :",
            description:
              "Allégations fausses ou trompeuses, contenu mensonger.",
          },
          {
            label: "Illégal :",
            description:
              "Infractions à la loi ou promotion d’activités illégales.",
          },
          {
            label: "Divulgation de données personnelles :",
            description: "Partage non autorisé d’informations privées.",
          },
          {
            label: "Sexuel :",
            description: "Contenu sexuellement explicite ou inapproprié.",
          },
          {
            label: "Spam :",
            description: "Contenu répétitif, hors sujet ou promotionnel.",
          },
        ],
      },
      review: {
        heading: "3.2 Système d’examen et de recours en matière de modération",
        rules: [
          "Les actions de modération (avertissements, suppressions et suspensions) sont consignées et peuvent être examinées publiquement.",
          "Les utilisateurs peuvent contester les décisions de modération au moyen d’une procédure d’examen ouverte.",
          "Les infractions répétées entraînent des sanctions de plus en plus sévères.",
        ],
      },
    },
    consequences: {
      heading: "4. Conséquences des infractions",
      violationHeader: "Niveau d’infraction",
      consequenceHeader: "Conséquence",
      rows: [
        {
          label: "Première infraction",
          description: "Avertissement et suppression du contenu.",
        },
        { label: "Deuxième infraction", description: "Suspension temporaire." },
        {
          label:
            "Infractions graves (par exemple, menaces ou divulgation de données personnelles)",
          description: "Suspension définitive.",
        },
      ],
    },
    feedback: {
      heading: "5. Retours et adaptation",
      points: [
        "Les utilisateurs peuvent contester les décisions de modération au moyen d’un système d’examen transparent.",
        "Les retours sur les politiques de modération sont encouragés et examinés régulièrement afin de les adapter aux besoins de la communauté.",
      ],
      closing:
        "Ces règles visent à favoriser un espace de discussions constructives, respectueuses et porteuses d’impact. Merci de faire partie d’Agora Citizen Network !",
      contactBeforeEmail:
        "Si vous avez des questions ou des préoccupations concernant nos Règles de la communauté, veuillez nous contacter à l’adresse ",
      contactAfterEmail: ".",
    },
  },
  he: {
    title: "הנחיות הקהילה",
    automatedTranslationNotice: {
      title: "תרגום אוטומטי",
      message:
        "דף זה תורגם באופן אוטומטי. במקרה של אי־התאמה, הגרסה האנגלית בלבד היא הקובעת וגוברת.",
      viewEnglish: "הצגת הגרסה האנגלית המחייבת",
      returnTranslated: "חזרה לגרסה המתורגמת",
    },
    moderationPrinciples: {
      heading: "1. עקרונות הניהול",
      introduction:
        "רשת האזרחים Agora היא מרחב לדיונים פוליטיים וחברתיים פתוחים ובונים. כדי להבטיח סביבה הוגנת, מכבדת ומכילה, מערכת הניהול שלנו פועלת לפי העקרונות הבאים:",
      principles: [
        {
          label: "שקיפות:",
          description: "כל פעולות הניהול מתועדות ופתוחות לעיון הציבור.",
        },
        {
          label: "הכלה:",
          description:
            "נקודות מבט מגוונות מתקבלות בברכה, בתנאי שהשיח נשאר מכבד.",
        },
        {
          label: "יכולת אימות:",
          description:
            "משתמשים יכולים לעיין בהיסטוריית הניהול ולערער על החלטות.",
        },
      ],
    },
    communityStandards: {
      heading: "2. כללי הקהילה",
      introduction: "כדי להשתתף ב-Agora, על המשתמשים לפעול לפי ההנחיות הבאות:",
      subsections: [
        {
          heading: "2.1 שיח מכבד",
          rules: [
            "יש להשתתף בדיונים מתוך כבוד הדדי.",
            "אין לבצע התקפות אישיות, להעליב או להטריד.",
            "יש להביע מחלוקות באופן בונה.",
          ],
        },
        {
          heading: "2.2 איסור על דברי שנאה וקיצוניות",
          rules: [
            "אין לפרסם תוכן המקדם גזענות, סקסיזם, שנאת זרים, הומופוביה או אפליה.",
            "אין לעודד אלימות, קיצוניות או הקצנה.",
          ],
        },
        {
          heading: "2.3 איסור על מידע כוזב ומניפולציה",
          rules: [
            "אין להפיץ במכוון מידע כוזב או תאוריות קשר.",
            "אין להשתמש בבוטים, ביצירת מראית עין של תמיכה עממית או בהתנהגות מטעה.",
          ],
        },
        {
          heading: "2.4 איסור על ספאם וקידום מכירות לא רצוי",
          rules: [
            "אין לבצע קידום עצמי מופרז או לפרסם מודעות או תוכן שאינו רלוונטי.",
            "אין לפרסם שוב ושוב את אותו תוכן בדיונים שונים.",
          ],
        },
        {
          heading: "2.5 הגנה על פרטיות ובטיחות",
          rules: [
            "אין לשתף מידע פרטי או מידע המאפשר זיהוי אישי ללא הסכמה.",
            "אין לחשוף פרטים אישיים, לאיים או להסית לאלימות.",
          ],
        },
      ],
    },
    moderationProcess: {
      heading: "3. תהליך הניהול",
      reporting: {
        heading: "3.1 ניהול קהילתי ודיווח",
        introduction: "משתמשים יכולים לדווח על תוכן לפי הקטגוריות הבאות:",
        categories: [
          {
            label: "אנטי-חברתי:",
            description: "תוכן פוגעני או מלא שנאה, או הטרדה ממוקדת.",
          },
          {
            label: "מטעה:",
            description: "טענות כוזבות או מטעות ותוכן מתעתע.",
          },
          {
            label: "לא חוקי:",
            description: "הפרת חוק או קידום פעילויות לא חוקיות.",
          },
          {
            label: "חשיפת פרטים אישיים:",
            description: "שיתוף מידע פרטי ללא הרשאה.",
          },
          {
            label: "מיני:",
            description: "חומר מיני מפורש או בלתי הולם.",
          },
          {
            label: "ספאם:",
            description: "תוכן חוזר, שאינו קשור לנושא או תוכן שיווקי.",
          },
        ],
      },
      review: {
        heading: "3.2 מערכת לבחינת החלטות ניהול ולערעור עליהן",
        rules: [
          "פעולות ניהול (אזהרות, הסרות והשעיות) מתועדות ופתוחות לעיון הציבור.",
          "משתמשים רשאים לערער על החלטות ניהול באמצעות הליך בחינה פתוח.",
          "הפרות חוזרות מובילות להחמרה הדרגתית של ההשלכות.",
        ],
      },
    },
    consequences: {
      heading: "4. השלכות של הפרות",
      violationHeader: "רמת ההפרה",
      consequenceHeader: "השלכה",
      rows: [
        { label: "הפרה ראשונה", description: "אזהרה והסרת התוכן." },
        { label: "הפרה שנייה", description: "השעיה זמנית." },
        {
          label: "הפרות חמורות (למשל איומים או חשיפת פרטים אישיים)",
          description: "השעיה לצמיתות.",
        },
      ],
    },
    feedback: {
      heading: "5. משוב והתאמה",
      points: [
        "משתמשים רשאים לערער על החלטות ניהול באמצעות מערכת בחינה שקופה.",
        "אנו מעודדים משוב על מדיניות הניהול ובוחנים אותו באופן קבוע כדי להתאים את המדיניות לצורכי הקהילה.",
      ],
      closing:
        "הנחיות אלה נועדו לטפח מרחב לדיונים משמעותיים, מכבדים ובעלי השפעה. תודה שאתם חלק מרשת האזרחים Agora!",
      contactBeforeEmail:
        "אם יש לכם שאלות או חששות בנוגע להנחיות הקהילה שלנו, צרו איתנו קשר בכתובת ",
      contactAfterEmail: ".",
    },
  },
  ja: {
    title: "コミュニティガイドライン",
    automatedTranslationNotice: {
      title: "自動翻訳",
      message:
        "このページは自動翻訳されています。内容に相違がある場合は、英語版のみが正文として優先されます。",
      viewEnglish: "正式な英語版を表示",
      returnTranslated: "翻訳版に戻る",
    },
    moderationPrinciples: {
      heading: "1. モデレーションの原則",
      introduction:
        "Agora Citizen Networkは、政治や社会について開かれた建設的な議論を行う場です。公正で敬意に満ちた、誰もが参加できる環境を確保するため、モデレーションは次の原則に基づいて行われます。",
      principles: [
        {
          label: "透明性：",
          description:
            "すべてのモデレーション措置は記録され、誰でも確認できます。",
        },
        {
          label: "包摂性：",
          description: "敬意ある対話を守る限り、多様な視点を歓迎します。",
        },
        {
          label: "検証可能性：",
          description:
            "ユーザーはモデレーション履歴を確認し、決定に異議を申し立てることができます。",
        },
      ],
    },
    communityStandards: {
      heading: "2. コミュニティ基準",
      introduction:
        "Agoraに参加するには、次のガイドラインを守る必要があります。",
      subsections: [
        {
          heading: "2.1 敬意ある対話",
          rules: [
            "互いを尊重して議論に参加してください。",
            "個人攻撃、侮辱、嫌がらせは禁止です。",
            "意見の相違は建設的に表明してください。",
          ],
        },
        {
          heading: "2.2 ヘイトスピーチと過激主義の禁止",
          rules: [
            "人種差別、性差別、外国人嫌悪、同性愛嫌悪、その他の差別を助長するコンテンツは禁止です。",
            "暴力、過激主義、または過激化を支持する行為は禁止です。",
          ],
        },
        {
          heading: "2.3 誤情報と世論操作の禁止",
          rules: [
            "虚偽の情報や陰謀論を意図的に広めることは禁止です。",
            "ボット、草の根運動を装う行為、その他の欺瞞的な行為は禁止です。",
          ],
        },
        {
          heading: "2.4 スパムと一方的な宣伝の禁止",
          rules: [
            "過度な自己宣伝、広告、無関係なコンテンツは禁止です。",
            "複数の議論に同じコンテンツを繰り返し投稿することは禁止です。",
          ],
        },
        {
          heading: "2.5 プライバシーと安全の保護",
          rules: [
            "同意なく私的情報や個人を特定できる情報を共有することは禁止です。",
            "個人情報の暴露、脅迫、暴力の扇動は禁止です。",
          ],
        },
      ],
    },
    moderationProcess: {
      heading: "3. モデレーションの手続き",
      reporting: {
        heading: "3.1 コミュニティによるモデレーションと報告",
        introduction: "ユーザーは次のカテゴリーでコンテンツを報告できます。",
        categories: [
          {
            label: "反社会的：",
            description: "攻撃的または憎悪的な内容、標的を定めた嫌がらせ。",
          },
          {
            label: "誤解を招く：",
            description: "虚偽または誤解を招く主張、欺瞞的なコンテンツ。",
          },
          {
            label: "違法：",
            description: "法律違反、または違法行為の助長。",
          },
          {
            label: "個人情報の暴露：",
            description: "許可なく私的情報を共有する行為。",
          },
          {
            label: "性的：",
            description: "露骨な性的表現または不適切な素材。",
          },
          {
            label: "スパム：",
            description: "反復的、話題外、または宣伝目的のコンテンツ。",
          },
        ],
      },
      review: {
        heading: "3.2 モデレーションの審査と異議申立て制度",
        rules: [
          "モデレーション措置（警告、削除、利用停止）は記録され、誰でも確認できます。",
          "ユーザーは公開された審査手続きを通じて、モデレーションの決定に異議を申し立てることができます。",
          "違反を繰り返すと、処分は段階的に重くなります。",
        ],
      },
    },
    consequences: {
      heading: "4. 違反した場合の措置",
      violationHeader: "違反の段階",
      consequenceHeader: "措置",
      rows: [
        { label: "初回の違反", description: "警告およびコンテンツの削除。" },
        { label: "2回目の違反", description: "一時的な利用停止。" },
        {
          label: "重大な違反（脅迫、個人情報の暴露など）",
          description: "恒久的な利用停止。",
        },
      ],
    },
    feedback: {
      heading: "5. フィードバックと改善",
      points: [
        "ユーザーは透明性のある審査制度を通じて、モデレーションの決定に異議を申し立てることができます。",
        "モデレーション方針へのご意見を歓迎します。方針はコミュニティのニーズに合わせて定期的に見直されます。",
      ],
      closing:
        "このガイドラインは、有意義で敬意があり、影響力のある議論の場を育むために設けられています。Agora Citizen Networkの一員でいてくださり、ありがとうございます。",
      contactBeforeEmail:
        "コミュニティガイドラインについてご質問やご懸念がある場合は、",
      contactAfterEmail: "までお問い合わせください。",
    },
  },
  ky: {
    title: "Коомчулуктун эрежелери",
    automatedTranslationNotice: {
      title: "Автоматтык котормо",
      message:
        "Бул барак автоматтык түрдө которулган. Кандайдыр бир айырмачылык болсо, англис тилиндеги нуска гана расмий күчкө ээ жана артыкчылыкка ээ болот.",
      viewEnglish: "Расмий англис нускасын көрүү",
      returnTranslated: "Которулган нускага кайтуу",
    },
    moderationPrinciples: {
      heading: "1. Модерациянын принциптери",
      introduction:
        "Agora Citizen Network — ачык жана конструктивдүү саясий жана коомдук талкуулар үчүн мейкиндик. Адилеттүү, сый-урматка негизделген жана бардыгын камтыган чөйрөнү камсыз кылуу үчүн модерация тутумубуз төмөнкү принциптерди карманат:",
      principles: [
        {
          label: "Ачык-айкындуулук:",
          description:
            "Модерациянын бардык чаралары катталат жана коомчулук аларды текшере алат.",
        },
        {
          label: "Баарын камтуу:",
          description:
            "Сый-урматтуу пикир алышуунун талаптары сакталган шартта ар түрдүү көз караштар кабыл алынат.",
        },
        {
          label: "Текшерилүүчүлүк:",
          description:
            "Колдонуучулар модерация таржымалын көрүп, чечимдерге даттана алышат.",
        },
      ],
    },
    communityStandards: {
      heading: "2. Коомчулуктун стандарттары",
      introduction:
        "Agoraга катышуу үчүн колдонуучулар бул эрежелерди сакташы керек:",
      subsections: [
        {
          heading: "2.1 Сый-урматтуу пикир алышуу",
          rules: [
            "Талкууларга өз ара сый-урмат менен катышыңыз.",
            "Жеке кол салууга, кемсинтүүгө же куугунтуктоого жол берилбейт.",
            "Пикир келишпестиктер конструктивдүү түрдө билдирилиши керек.",
          ],
        },
        {
          heading: "2.2 Жек көрүү сөздөрүнө жана экстремизмге тыюу салынат",
          rules: [
            "Расизмди, сексизмди, ксенофобияны, гомофобияны же басмырлоону жайылткан мазмунга жол берилбейт.",
            "Зомбулукту, экстремизмди же радикалдашууну жактоого жол берилбейт.",
          ],
        },
        {
          heading: "2.3 Жалган маалыматка жана манипуляцияга тыюу салынат",
          rules: [
            "Жалган маалыматты же кутум теорияларын атайылап таратууга жол берилбейт.",
            "Ботторду, жасалма коомдук колдоону же алдамчылык аракеттерди колдонууга жол берилбейт.",
          ],
        },
        {
          heading: "2.4 Спамга жана суралбаган жарнамага тыюу салынат",
          rules: [
            "Ашыкча өзүн-өзү жарнамалоого, жарнамага же тиешеси жок мазмунга жол берилбейт.",
            "Бир эле мазмунду ар кайсы талкууларда кайталап жарыялоого жол берилбейт.",
          ],
        },
        {
          heading: "2.5 Купуялуулукту жана коопсуздукту коргоо",
          rules: [
            "Жеке же адамды аныктоого мүмкүндүк берген маалыматты макулдуксуз бөлүшүүгө жол берилбейт.",
            "Жеке маалыматты ачыкка чыгарууга, коркутууга же зомбулукка үндөөгө жол берилбейт.",
          ],
        },
      ],
    },
    moderationProcess: {
      heading: "3. Модерация процесси",
      reporting: {
        heading: "3.1 Коомчулуктук модерация жана билдирүү",
        introduction:
          "Колдонуучулар мазмунду төмөнкү категориялар боюнча билдире алышат:",
        categories: [
          {
            label: "Антисоциалдык:",
            description:
              "Кемсинтүүчү же жек көрүүчү мазмун, же максаттуу куугунтуктоо.",
          },
          {
            label: "Адаштыруучу:",
            description: "Жалган же адаштыруучу дооматтар, алдамчы мазмун.",
          },
          {
            label: "Мыйзамсыз:",
            description: "Мыйзамдарды бузуу же мыйзамсыз аракеттерди жайылтуу.",
          },
          {
            label: "Жеке маалыматты ачыкка чыгаруу:",
            description: "Купуя маалыматты уруксатсыз бөлүшүү.",
          },
          {
            label: "Сексуалдык:",
            description: "Ачык сексуалдык же орунсуз материал.",
          },
          {
            label: "Спам:",
            description: "Кайталанма, темага тиешеси жок же жарнамалык мазмун.",
          },
        ],
      },
      review: {
        heading: "3.2 Модерацияны кароо жана даттануу тутуму",
        rules: [
          "Модерация чаралары (эскертүүлөр, өчүрүүлөр жана убактылуу четтетүүлөр) катталат жана коомчулук аларды текшере алат.",
          "Колдонуучулар ачык кароо процесси аркылуу модерация чечимдерине даттана алышат.",
          "Кайталанган бузуулар барган сайын катаал кесепеттерге алып келет.",
        ],
      },
    },
    consequences: {
      heading: "4. Эреже бузуунун кесепеттери",
      violationHeader: "Бузуунун деңгээли",
      consequenceHeader: "Кесепети",
      rows: [
        {
          label: "Биринчи бузуу",
          description: "Эскертүү жана мазмунду өчүрүү.",
        },
        { label: "Экинчи бузуу", description: "Убактылуу четтетүү." },
        {
          label:
            "Оор бузуулар (мисалы, коркутуу же жеке маалыматты ачыкка чыгаруу)",
          description: "Биротоло четтетүү.",
        },
      ],
    },
    feedback: {
      heading: "5. Пикир жана ыңгайлашуу",
      points: [
        "Колдонуучулар ачык-айкын кароо тутуму аркылуу модерация чечимдерине даттана алышат.",
        "Модерация саясаты боюнча пикирлер колдоого алынат жана саясат коомчулуктун муктаждыктарына ылайыкташтырылышы үчүн үзгүлтүксүз каралат.",
      ],
      closing:
        "Бул эрежелер мазмундуу, сый-урматтуу жана таасирдүү талкуулар үчүн мейкиндик түзүүгө багытталган. Agora Citizen Network коомчулугунун бир бөлүгү болгонуңуз үчүн рахмат!",
      contactBeforeEmail:
        "Коомчулуктун эрежелери боюнча суроолоруңуз же тынчсызданууларыңыз болсо, биз менен ",
      contactAfterEmail: " дареги аркылуу байланышыңыз.",
    },
  },
  ru: {
    title: "Правила сообщества",
    automatedTranslationNotice: {
      title: "Автоматический перевод",
      message:
        "Эта страница переведена автоматически. В случае любых расхождений исключительно версия на английском языке имеет преимущественную силу.",
      viewEnglish: "Открыть официальную английскую версию",
      returnTranslated: "Вернуться к переведённой версии",
    },
    moderationPrinciples: {
      heading: "1. Принципы модерации",
      introduction:
        "Agora Citizen Network — это пространство для открытых и конструктивных политических и общественных дискуссий. Чтобы обеспечить справедливую, уважительную и инклюзивную среду, наша система модерации следует таким принципам:",
      principles: [
        {
          label: "Прозрачность:",
          description:
            "Все действия модераторов регистрируются и доступны для публичной проверки.",
        },
        {
          label: "Инклюзивность:",
          description:
            "Различные точки зрения приветствуются при условии уважительного общения.",
        },
        {
          label: "Проверяемость:",
          description:
            "Пользователи могут просматривать историю модерации и обжаловать решения.",
        },
      ],
    },
    communityStandards: {
      heading: "2. Стандарты сообщества",
      introduction:
        "Для участия в Agora пользователи должны соблюдать следующие правила:",
      subsections: [
        {
          heading: "2.1 Уважительное общение",
          rules: [
            "Участвуйте в обсуждениях, проявляя взаимное уважение.",
            "Запрещены личные нападки, оскорбления и травля.",
            "Разногласия следует выражать конструктивно.",
          ],
        },
        {
          heading: "2.2 Запрет языка ненависти и экстремизма",
          rules: [
            "Запрещён контент, пропагандирующий расизм, сексизм, ксенофобию, гомофобию или дискриминацию.",
            "Запрещены призывы к насилию, экстремизму или радикализации.",
          ],
        },
        {
          heading: "2.3 Запрет дезинформации и манипуляций",
          rules: [
            "Запрещено намеренно распространять ложную информацию или теории заговора.",
            "Запрещено использовать ботов, имитацию массовой поддержки или обманные методы.",
          ],
        },
        {
          heading: "2.4 Запрет спама и нежелательной рекламы",
          rules: [
            "Запрещены чрезмерная самореклама, рекламные объявления и не относящийся к теме контент.",
            "Запрещено многократно публиковать один и тот же контент в разных обсуждениях.",
          ],
        },
        {
          heading: "2.5 Защита конфиденциальности и безопасности",
          rules: [
            "Запрещено без согласия публиковать частную информацию или данные, позволяющие установить личность.",
            "Запрещены раскрытие персональных данных, угрозы и подстрекательство к насилию.",
          ],
        },
      ],
    },
    moderationProcess: {
      heading: "3. Процесс модерации",
      reporting: {
        heading: "3.1 Модерация сообществом и жалобы",
        introduction:
          "Пользователи могут пожаловаться на контент по следующим категориям:",
        categories: [
          {
            label: "Антисоциальный:",
            description:
              "Оскорбительный или разжигающий ненависть контент либо целевая травля.",
          },
          {
            label: "Вводящий в заблуждение:",
            description:
              "Ложные или вводящие в заблуждение утверждения, обманный контент.",
          },
          {
            label: "Незаконный:",
            description:
              "Нарушение законов или пропаганда незаконной деятельности.",
          },
          {
            label: "Раскрытие персональных данных:",
            description: "Несанкционированная публикация частной информации.",
          },
          {
            label: "Сексуальный:",
            description:
              "Материалы откровенно сексуального или неприемлемого характера.",
          },
          {
            label: "Спам:",
            description:
              "Повторяющийся, не относящийся к теме или рекламный контент.",
          },
        ],
      },
      review: {
        heading: "3.2 Система проверки модерации и обжалования",
        rules: [
          "Действия модераторов (предупреждения, удаления и блокировки) регистрируются и доступны для публичной проверки.",
          "Пользователи могут обжаловать решения модераторов в рамках открытой процедуры рассмотрения.",
          "Повторные нарушения влекут за собой всё более строгие меры.",
        ],
      },
    },
    consequences: {
      heading: "4. Последствия нарушений",
      violationHeader: "Уровень нарушения",
      consequenceHeader: "Мера",
      rows: [
        {
          label: "Первое нарушение",
          description: "Предупреждение и удаление контента.",
        },
        { label: "Второе нарушение", description: "Временная блокировка." },
        {
          label:
            "Серьёзные нарушения (например, угрозы или раскрытие персональных данных)",
          description: "Бессрочная блокировка.",
        },
      ],
    },
    feedback: {
      heading: "5. Обратная связь и адаптация",
      points: [
        "Пользователи могут обжаловать решения модераторов через прозрачную систему рассмотрения.",
        "Мы приветствуем отзывы о правилах модерации и регулярно пересматриваем их, чтобы учитывать потребности сообщества.",
      ],
      closing:
        "Эти правила призваны создать пространство для содержательных, уважительных и значимых дискуссий. Спасибо, что вы являетесь частью Agora Citizen Network!",
      contactBeforeEmail:
        "Если у вас есть вопросы или замечания по поводу Правил сообщества, свяжитесь с нами по адресу ",
      contactAfterEmail: ".",
    },
  },
  "zh-Hans": {
    title: "社区准则",
    automatedTranslationNotice: {
      title: "自动翻译",
      message: "本页面由自动翻译生成。如有任何差异，仅以英文版本为准。",
      viewEnglish: "查看权威英文版本",
      returnTranslated: "返回翻译版本",
    },
    moderationPrinciples: {
      heading: "1. 内容管理原则",
      introduction:
        "Agora Citizen Network 是一个开展开放、建设性政治与社会讨论的平台。为确保环境公平、相互尊重且包容多元，我们的内容管理制度遵循以下原则：",
      principles: [
        {
          label: "透明：",
          description: "所有内容管理措施均会记录，并可供公众查阅。",
        },
        {
          label: "包容：",
          description: "我们欢迎不同观点，但相关表达必须尊重他人。",
        },
        {
          label: "可核查：",
          description: "用户可以查阅内容管理记录，并对相关决定提出申诉。",
        },
      ],
    },
    communityStandards: {
      heading: "2. 社区规范",
      introduction: "用户参与 Agora 时必须遵守以下准则：",
      subsections: [
        {
          heading: "2.1 尊重他人的讨论",
          rules: [
            "参与讨论时应相互尊重。",
            "不得进行人身攻击、侮辱或骚扰。",
            "应以建设性的方式表达分歧。",
          ],
        },
        {
          heading: "2.2 禁止仇恨言论或极端主义",
          rules: [
            "不得发布宣扬种族主义、性别歧视、仇外、恐同或其他歧视的内容。",
            "不得鼓吹暴力、极端主义或激进化。",
          ],
        },
        {
          heading: "2.3 禁止虚假信息或操纵行为",
          rules: [
            "不得故意传播虚假信息或阴谋论。",
            "不得使用机器人账号、制造虚假民意或采取欺骗行为。",
          ],
        },
        {
          heading: "2.4 禁止垃圾信息或未经请求的推广",
          rules: [
            "不得过度自我推广、发布广告或无关内容。",
            "不得在不同讨论中重复发布相同内容。",
          ],
        },
        {
          heading: "2.5 保护隐私与安全",
          rules: [
            "未经同意，不得分享私人信息或可识别个人身份的信息。",
            "不得曝光他人隐私、发出威胁或煽动暴力。",
          ],
        },
      ],
    },
    moderationProcess: {
      heading: "3. 内容管理流程",
      reporting: {
        heading: "3.1 社区管理与举报",
        introduction: "用户可以按以下类别举报内容：",
        categories: [
          {
            label: "反社会：",
            description: "冒犯性、仇恨性内容或针对性骚扰。",
          },
          {
            label: "误导性：",
            description: "虚假或误导性主张及欺骗性内容。",
          },
          {
            label: "违法：",
            description: "违反法律或宣扬违法活动。",
          },
          {
            label: "曝光隐私：",
            description: "未经授权分享私人信息。",
          },
          {
            label: "色情：",
            description: "露骨色情或不当材料。",
          },
          {
            label: "垃圾信息：",
            description: "重复、偏离主题或推广性质的内容。",
          },
        ],
      },
      review: {
        heading: "3.2 内容管理审查与申诉制度",
        rules: [
          "内容管理措施（警告、删除、停用）均会记录，并可供公众查阅。",
          "用户可以通过公开的审查流程对内容管理决定提出申诉。",
          "屡次违规将导致逐步加重的处罚。",
        ],
      },
    },
    consequences: {
      heading: "4. 违规后果",
      violationHeader: "违规级别",
      consequenceHeader: "处罚",
      rows: [
        { label: "首次违规", description: "警告并删除内容。" },
        { label: "第二次违规", description: "暂时停用账号。" },
        {
          label: "严重违规（例如威胁、曝光他人隐私）",
          description: "永久停用账号。",
        },
      ],
    },
    feedback: {
      heading: "5. 反馈与调整",
      points: [
        "用户可以通过透明的审查制度对内容管理决定提出申诉。",
        "我们欢迎对内容管理政策提出反馈，并会定期审查，以适应社区需求。",
      ],
      closing:
        "制定这些准则是为了营造一个能够开展有意义、相互尊重且富有影响力讨论的空间。感谢您成为 Agora Citizen Network 的一员！",
      contactBeforeEmail: "如果您对社区准则有任何疑问或顾虑，请通过 ",
      contactAfterEmail: " 联系我们。",
    },
  },
  "zh-Hant": {
    title: "社群準則",
    automatedTranslationNotice: {
      title: "自動翻譯",
      message: "本頁面由自動翻譯產生。如有任何歧異，僅以英文版本為準。",
      viewEnglish: "查看具權威效力的英文版本",
      returnTranslated: "返回翻譯版本",
    },
    moderationPrinciples: {
      heading: "1. 內容管理原則",
      introduction:
        "Agora Citizen Network 是一個進行開放、建設性政治與社會討論的平台。為確保環境公平、相互尊重且包容多元，我們的內容管理制度遵循以下原則：",
      principles: [
        {
          label: "透明：",
          description: "所有內容管理措施都會記錄，並可供公眾查閱。",
        },
        {
          label: "包容：",
          description: "我們歡迎不同觀點，但相關表達必須尊重他人。",
        },
        {
          label: "可查核：",
          description: "使用者可以查閱內容管理紀錄，並對相關決定提出申訴。",
        },
      ],
    },
    communityStandards: {
      heading: "2. 社群規範",
      introduction: "使用者參與 Agora 時必須遵守以下準則：",
      subsections: [
        {
          heading: "2.1 尊重他人的討論",
          rules: [
            "參與討論時應相互尊重。",
            "不得進行人身攻擊、侮辱或騷擾。",
            "應以建設性的方式表達分歧。",
          ],
        },
        {
          heading: "2.2 禁止仇恨言論或極端主義",
          rules: [
            "不得發布宣揚種族主義、性別歧視、仇外、恐同或其他歧視的內容。",
            "不得鼓吹暴力、極端主義或激進化。",
          ],
        },
        {
          heading: "2.3 禁止虛假資訊或操弄行為",
          rules: [
            "不得故意散播虛假資訊或陰謀論。",
            "不得使用機器人帳號、製造虛假民意或採取欺騙行為。",
          ],
        },
        {
          heading: "2.4 禁止垃圾訊息或未經請求的推廣",
          rules: [
            "不得過度自我推廣、發布廣告或無關內容。",
            "不得在不同討論中重複發布相同內容。",
          ],
        },
        {
          heading: "2.5 保護隱私與安全",
          rules: [
            "未經同意，不得分享私人資訊或可識別個人身分的資訊。",
            "不得公開他人隱私、發出威脅或煽動暴力。",
          ],
        },
      ],
    },
    moderationProcess: {
      heading: "3. 內容管理流程",
      reporting: {
        heading: "3.1 社群管理與檢舉",
        introduction: "使用者可以按以下類別檢舉內容：",
        categories: [
          {
            label: "反社會：",
            description: "冒犯性、仇恨性內容或針對性騷擾。",
          },
          {
            label: "誤導性：",
            description: "虛假或誤導性主張及欺騙性內容。",
          },
          {
            label: "違法：",
            description: "違反法律或宣揚違法活動。",
          },
          {
            label: "公開隱私：",
            description: "未經授權分享私人資訊。",
          },
          {
            label: "色情：",
            description: "露骨色情或不當素材。",
          },
          {
            label: "垃圾訊息：",
            description: "重複、偏離主題或推廣性質的內容。",
          },
        ],
      },
      review: {
        heading: "3.2 內容管理審查與申訴制度",
        rules: [
          "內容管理措施（警告、移除、停權）都會記錄，並可供公眾查閱。",
          "使用者可以透過公開的審查流程對內容管理決定提出申訴。",
          "屢次違規將導致逐步加重的處分。",
        ],
      },
    },
    consequences: {
      heading: "4. 違規後果",
      violationHeader: "違規級別",
      consequenceHeader: "處分",
      rows: [
        { label: "首次違規", description: "警告並移除內容。" },
        { label: "第二次違規", description: "暫時停權。" },
        {
          label: "嚴重違規（例如威脅、公開他人隱私）",
          description: "永久停權。",
        },
      ],
    },
    feedback: {
      heading: "5. 意見回饋與調整",
      points: [
        "使用者可以透過透明的審查制度對內容管理決定提出申訴。",
        "我們歡迎對內容管理政策提出意見，並會定期審查，以配合社群需求。",
      ],
      closing:
        "制定這些準則是為了營造一個能進行有意義、相互尊重且具影響力討論的空間。感謝您成為 Agora Citizen Network 的一員！",
      contactBeforeEmail: "如果您對社群準則有任何疑問或疑慮，請透過 ",
      contactAfterEmail: " 與我們聯絡。",
    },
  },
};
