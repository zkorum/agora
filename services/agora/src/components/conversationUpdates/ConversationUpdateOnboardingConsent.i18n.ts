import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ConversationUpdateOnboardingConsentTranslations {
  projectLabel: string;
  conversationLabel: string;
  emailGuarantee: string;
  projectDescription: string;
  conversationDescription: string;
}

export const conversationUpdateOnboardingConsentTranslations: Record<
  SupportedDisplayLanguageCodes,
  ConversationUpdateOnboardingConsentTranslations
> = {
  en: {
    projectLabel: "Receive project updates by email (optional)",
    conversationLabel: "Receive conversation updates by email (optional)",
    emailGuarantee: "No ads or marketing emails.",
    projectDescription:
      "Only project-related updates from the team running it. You can change your preference at any time in your email settings.",
    conversationDescription:
      "Only conversation-related updates from the team running it. You can change your preference at any time in your email settings.",
  },
  de: {
    projectLabel: "Projekt-Updates per E-Mail erhalten (optional)",
    conversationLabel: "Diskussions-Updates per E-Mail erhalten (optional)",
    emailGuarantee: "Keine Werbe- oder Marketing-E-Mails.",
    projectDescription:
      "Nur projektbezogene Aktualisierungen vom verantwortlichen Team. Sie können Ihre Präferenz jederzeit in Ihren E-Mail-Einstellungen ändern.",
    conversationDescription:
      "Nur Nachrichten zur Diskussion vom verantwortlichen Team. Sie können Ihre Präferenz jederzeit in Ihren E-Mail-Einstellungen ändern.",
  },
  hi: {
    projectLabel: "ईमेल द्वारा परियोजना अपडेट प्राप्त करें (वैकल्पिक)",
    conversationLabel: "ईमेल द्वारा चर्चा अपडेट प्राप्त करें (वैकल्पिक)",
    emailGuarantee: "कोई विज्ञापन या मार्केटिंग ईमेल नहीं।",
    projectDescription:
      "केवल उस टीम से परियोजना से संबंधित अपडेट। आप अपनी ईमेल सेटिंग्स में किसी भी समय अपनी प्राथमिकता बदल सकते हैं।",
    conversationDescription:
      "केवल उस टीम से चर्चा से संबंधित अपडेट। आप अपनी ईमेल सेटिंग्स में किसी भी समय अपनी प्राथमिकता बदल सकते हैं।",
  },
  ar: {
    emailGuarantee: "لا إعلانات أو رسائل تسويقية.",
    projectLabel:
      "أرسل إليّ تحديثات عرضية عن هذا المشروع عبر البريد الإلكتروني",
    conversationLabel:
      "أرسل إليّ تحديثات عرضية عن هذه المحادثة عبر البريد الإلكتروني",
    projectDescription:
      "يكتب هذه التحديثات ويرسلها ميسّرو المشروع. لا جمع تبرعات أو حملات سياسية أو ترويج غير ذي صلة. يمكنك تغيير ذلك في أي وقت من إعدادات البريد الإلكتروني.",
    conversationDescription:
      "يكتب هذه التحديثات ويرسلها ميسّرو المحادثة. لا جمع تبرعات أو حملات سياسية أو ترويج غير ذي صلة. يمكنك تغيير ذلك في أي وقت من إعدادات البريد الإلكتروني.",
  },
  es: {
    emailGuarantee: "Sin publicidad ni correos comerciales.",
    projectLabel: "Seguir el proyecto por correo",
    conversationLabel: "Seguir la conversación por correo",
    projectDescription:
      "Estas novedades son redactadas y enviadas por quienes facilitan el proyecto para mantenerle al día y permitirle volver a participar. No se permite recaudación de fondos, campañas políticas ni promoción que no esté relacionada con el proyecto. Puede cambiar esta opción cuando quiera en los ajustes de correo.",
    conversationDescription:
      "Estas novedades son redactadas y enviadas por quienes facilitan la conversación para mantenerle al día y permitirle volver a participar. No se permite recaudación de fondos, campañas políticas ni promoción que no esté relacionada con la conversación. Puede cambiar esta opción cuando quiera en los ajustes de correo.",
  },
  fa: {
    emailGuarantee: "بدون تبلیغات یا ایمیل‌های بازاریابی.",
    projectLabel: "گاهی به‌روزرسانی‌های این پروژه را برایم ایمیل کن",
    conversationLabel: "گاهی به‌روزرسانی‌های این گفت‌وگو را برایم ایمیل کن",
    projectDescription:
      "این به‌روزرسانی‌ها را تسهیل‌گران پروژه می‌نویسند و ارسال می‌کنند. جمع‌آوری کمک مالی، کارزار سیاسی یا ترویج نامرتبط مجاز نیست. هر زمان بخواهید می‌توانید این گزینه را در تنظیمات ایمیل تغییر دهید.",
    conversationDescription:
      "این به‌روزرسانی‌ها را تسهیل‌گران گفت‌وگو می‌نویسند و ارسال می‌کنند. جمع‌آوری کمک مالی، کارزار سیاسی یا ترویج نامرتبط مجاز نیست. هر زمان بخواهید می‌توانید این گزینه را در تنظیمات ایمیل تغییر دهید.",
  },
  fr: {
    projectLabel: "Recevoir les nouvelles du projet par e-mail (facultatif)",
    conversationLabel:
      "Recevoir les nouvelles de la conversation par e-mail (facultatif)",
    emailGuarantee: "Sans publicité ni communication commerciale.",
    projectDescription:
      "Uniquement des nouvelles liées au projet, envoyées par l’équipe qui l’anime. Vous pouvez modifier votre choix à tout moment dans les paramètres d’e-mail.",
    conversationDescription:
      "Uniquement des nouvelles liées à la conversation, envoyées par l’équipe qui l’anime. Vous pouvez modifier votre choix à tout moment dans les paramètres d’e-mail.",
  },
  "zh-Hans": {
    emailGuarantee: "无广告或营销邮件。",
    projectLabel: "偶尔向我发送有关此项目的邮件动态",
    conversationLabel: "偶尔向我发送有关此对话的邮件动态",
    projectDescription:
      "这些动态由项目协作者撰写并发送，不包含募款、政治宣传或无关推广。您可以随时在邮件设置中更改此选项。",
    conversationDescription:
      "这些动态由对话协作者撰写并发送，不包含募款、政治宣传或无关推广。您可以随时在邮件设置中更改此选项。",
  },
  "zh-Hant": {
    emailGuarantee: "無廣告或行銷郵件。",
    projectLabel: "偶爾向我傳送有關此專案的郵件動態",
    conversationLabel: "偶爾向我傳送有關此對話的郵件動態",
    projectDescription:
      "這些動態由專案協作者撰寫並傳送，不包含募款、政治宣傳或無關推廣。您可以隨時在郵件設定中變更此選項。",
    conversationDescription:
      "這些動態由對話協作者撰寫並傳送，不包含募款、政治宣傳或無關推廣。您可以隨時在郵件設定中變更此選項。",
  },
  he: {
    emailGuarantee: "ללא פרסומות או הודעות שיווקיות.",
    projectLabel: "שליחת עדכונים מזדמנים על הפרויקט הזה בדוא״ל",
    conversationLabel: "שליחת עדכונים מזדמנים על השיחה הזו בדוא״ל",
    projectDescription:
      "העדכונים האלה נכתבים ונשלחים בידי מנחי הפרויקט. אין בהם גיוס תרומות, תעמולה פוליטית או קידום שאינו קשור. אפשר לשנות זאת בכל עת בהגדרות הדוא״ל.",
    conversationDescription:
      "העדכונים האלה נכתבים ונשלחים בידי מנחי השיחה. אין בהם גיוס תרומות, תעמולה פוליטית או קידום שאינו קשור. אפשר לשנות זאת בכל עת בהגדרות הדוא״ל.",
  },
  ja: {
    emailGuarantee: "広告やマーケティングメールはありません。",
    projectLabel: "このプロジェクトの更新をときどきメールで受け取る",
    conversationLabel: "この会話の更新をときどきメールで受け取る",
    projectDescription:
      "これらの更新はプロジェクトのファシリテーターが作成して送信します。資金集め、政治運動、無関係な宣伝は含まれません。メール設定からいつでも変更できます。",
    conversationDescription:
      "これらの更新は会話のファシリテーターが作成して送信します。資金集め、政治運動、無関係な宣伝は含まれません。メール設定からいつでも変更できます。",
  },
  ky: {
    emailGuarantee: "Жарнама же маркетинг каттары жок.",
    projectLabel:
      "Бул долбоор тууралуу жаңыртууларды маал-маалы менен катка жөнөтүү",
    conversationLabel:
      "Бул талкуу тууралуу жаңыртууларды маал-маалы менен катка жөнөтүү",
    projectDescription:
      "Бул жаңыртууларды долбоордун фасилитаторлору жазып, жөнөтүшөт. Каражат чогултууга, саясий үгүткө же тиешеси жок илгерилетүүгө жол берилбейт. Муну кат жөндөөлөрүнөн каалаган убакта өзгөртө аласыз.",
    conversationDescription:
      "Бул жаңыртууларды талкуунун фасилитаторлору жазып, жөнөтүшөт. Каражат чогултууга, саясий үгүткө же тиешеси жок илгерилетүүгө жол берилбейт. Муну кат жөндөөлөрүнөн каалаган убакта өзгөртө аласыз.",
  },
  ru: {
    emailGuarantee: "Без рекламы и маркетинговых писем.",
    projectLabel: "Иногда присылать мне обновления этого проекта",
    conversationLabel: "Иногда присылать мне обновления этого обсуждения",
    projectDescription:
      "Эти обновления составляют и отправляют фасилитаторы проекта. Сбор средств, политическая агитация и несвязанное продвижение запрещены. Это можно изменить в любой момент в настройках почты.",
    conversationDescription:
      "Эти обновления составляют и отправляют фасилитаторы обсуждения. Сбор средств, политическая агитация и несвязанное продвижение запрещены. Это можно изменить в любой момент в настройках почты.",
  },
};
