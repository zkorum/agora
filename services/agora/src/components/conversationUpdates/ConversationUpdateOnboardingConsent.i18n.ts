import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ConversationUpdateOnboardingConsentTranslations {
  projectLabel: string;
  conversationLabel: string;
  projectDescription: string;
  conversationDescription: string;
}

export const conversationUpdateOnboardingConsentTranslations: Record<
  SupportedDisplayLanguageCodes,
  ConversationUpdateOnboardingConsentTranslations
> = {
  en: {
    projectLabel: "Email me occasional updates about this project",
    conversationLabel: "Email me occasional updates about this conversation",
    projectDescription:
      "These updates are written and sent by project facilitators. No advertising, fundraising, political campaigning, or unrelated promotion. You can change this anytime in email settings.",
    conversationDescription:
      "These updates are written and sent by conversation facilitators. No advertising, fundraising, political campaigning, or unrelated promotion. You can change this anytime in email settings.",
  },
  ar: {
    projectLabel:
      "أرسل إليّ تحديثات عرضية عن هذا المشروع عبر البريد الإلكتروني",
    conversationLabel:
      "أرسل إليّ تحديثات عرضية عن هذه المحادثة عبر البريد الإلكتروني",
    projectDescription:
      "يكتب هذه التحديثات ويرسلها ميسّرو المشروع. لا إعلانات أو جمع تبرعات أو حملات سياسية أو ترويج غير ذي صلة. يمكنك تغيير ذلك في أي وقت من إعدادات البريد الإلكتروني.",
    conversationDescription:
      "يكتب هذه التحديثات ويرسلها ميسّرو المحادثة. لا إعلانات أو جمع تبرعات أو حملات سياسية أو ترويج غير ذي صلة. يمكنك تغيير ذلك في أي وقت من إعدادات البريد الإلكتروني.",
  },
  es: {
    projectLabel: "Seguir el proyecto por correo",
    conversationLabel: "Seguir la conversación por correo",
    projectDescription:
      "Estas novedades son redactadas y enviadas por quienes facilitan el proyecto para mantenerte al día y permitirte volver a participar. No se permite publicidad, recaudación de fondos, campañas políticas ni promoción que no esté relacionada con el proyecto. Puedes cambiar esta opción cuando quieras en los ajustes de correo.",
    conversationDescription:
      "Estas novedades son redactadas y enviadas por quienes facilitan la conversación para mantenerte al día y permitirte volver a participar. No se permite publicidad, recaudación de fondos, campañas políticas ni promoción que no esté relacionada con la conversación. Puedes cambiar esta opción cuando quieras en los ajustes de correo.",
  },
  fa: {
    projectLabel: "گاهی به‌روزرسانی‌های این پروژه را برایم ایمیل کن",
    conversationLabel: "گاهی به‌روزرسانی‌های این گفت‌وگو را برایم ایمیل کن",
    projectDescription:
      "این به‌روزرسانی‌ها را تسهیل‌گران پروژه می‌نویسند و ارسال می‌کنند. تبلیغات، جمع‌آوری کمک مالی، کارزار سیاسی یا ترویج نامرتبط مجاز نیست. هر زمان بخواهید می‌توانید این گزینه را در تنظیمات ایمیل تغییر دهید.",
    conversationDescription:
      "این به‌روزرسانی‌ها را تسهیل‌گران گفت‌وگو می‌نویسند و ارسال می‌کنند. تبلیغات، جمع‌آوری کمک مالی، کارزار سیاسی یا ترویج نامرتبط مجاز نیست. هر زمان بخواهید می‌توانید این گزینه را در تنظیمات ایمیل تغییر دهید.",
  },
  fr: {
    projectLabel: "Suivre le projet par e-mail",
    conversationLabel: "Suivre la conversation par e-mail",
    projectDescription:
      "Ces nouvelles sont rédigées et envoyées par les facilitateurs du projet pour vous tenir informé et vous permettre de participer à nouveau. Aucun contenu publicitaire, appel aux dons, campagne politique ou promotion sans rapport avec le projet n’est autorisé. Vous pouvez modifier ce choix à tout moment dans les paramètres d’e-mail.",
    conversationDescription:
      "Ces nouvelles sont rédigées et envoyées par les facilitateurs de la conversation pour vous tenir informé et vous permettre de participer à nouveau. Aucun contenu publicitaire, appel aux dons, campagne politique ou promotion sans rapport avec la conversation n’est autorisé. Vous pouvez modifier ce choix à tout moment dans les paramètres d’e-mail.",
  },
  "zh-Hans": {
    projectLabel: "偶尔向我发送有关此项目的邮件动态",
    conversationLabel: "偶尔向我发送有关此对话的邮件动态",
    projectDescription:
      "这些动态由项目协作者撰写并发送，不包含广告、募款、政治宣传或无关推广。您可以随时在邮件设置中更改此选项。",
    conversationDescription:
      "这些动态由对话协作者撰写并发送，不包含广告、募款、政治宣传或无关推广。您可以随时在邮件设置中更改此选项。",
  },
  "zh-Hant": {
    projectLabel: "偶爾向我傳送有關此專案的郵件動態",
    conversationLabel: "偶爾向我傳送有關此對話的郵件動態",
    projectDescription:
      "這些動態由專案協作者撰寫並傳送，不包含廣告、募款、政治宣傳或無關推廣。您可以隨時在郵件設定中變更此選項。",
    conversationDescription:
      "這些動態由對話協作者撰寫並傳送，不包含廣告、募款、政治宣傳或無關推廣。您可以隨時在郵件設定中變更此選項。",
  },
  he: {
    projectLabel: "שליחת עדכונים מזדמנים על הפרויקט הזה בדוא״ל",
    conversationLabel: "שליחת עדכונים מזדמנים על השיחה הזו בדוא״ל",
    projectDescription:
      "העדכונים האלה נכתבים ונשלחים בידי מנחי הפרויקט. אין בהם פרסום, גיוס תרומות, תעמולה פוליטית או קידום שאינו קשור. אפשר לשנות זאת בכל עת בהגדרות הדוא״ל.",
    conversationDescription:
      "העדכונים האלה נכתבים ונשלחים בידי מנחי השיחה. אין בהם פרסום, גיוס תרומות, תעמולה פוליטית או קידום שאינו קשור. אפשר לשנות זאת בכל עת בהגדרות הדוא״ל.",
  },
  ja: {
    projectLabel: "このプロジェクトの更新をときどきメールで受け取る",
    conversationLabel: "この会話の更新をときどきメールで受け取る",
    projectDescription:
      "これらの更新はプロジェクトのファシリテーターが作成して送信します。広告、資金集め、政治運動、無関係な宣伝は含まれません。メール設定からいつでも変更できます。",
    conversationDescription:
      "これらの更新は会話のファシリテーターが作成して送信します。広告、資金集め、政治運動、無関係な宣伝は含まれません。メール設定からいつでも変更できます。",
  },
  ky: {
    projectLabel:
      "Бул долбоор тууралуу жаңыртууларды маал-маалы менен катка жөнөтүү",
    conversationLabel:
      "Бул талкуу тууралуу жаңыртууларды маал-маалы менен катка жөнөтүү",
    projectDescription:
      "Бул жаңыртууларды долбоордун фасилитаторлору жазып, жөнөтүшөт. Жарнамага, каражат чогултууга, саясий үгүткө же тиешеси жок илгерилетүүгө жол берилбейт. Муну кат жөндөөлөрүнөн каалаган убакта өзгөртө аласыз.",
    conversationDescription:
      "Бул жаңыртууларды талкуунун фасилитаторлору жазып, жөнөтүшөт. Жарнамага, каражат чогултууга, саясий үгүткө же тиешеси жок илгерилетүүгө жол берилбейт. Муну кат жөндөөлөрүнөн каалаган убакта өзгөртө аласыз.",
  },
  ru: {
    projectLabel: "Иногда присылать мне обновления этого проекта",
    conversationLabel: "Иногда присылать мне обновления этого обсуждения",
    projectDescription:
      "Эти обновления составляют и отправляют фасилитаторы проекта. Реклама, сбор средств, политическая агитация и несвязанное продвижение запрещены. Это можно изменить в любой момент в настройках почты.",
    conversationDescription:
      "Эти обновления составляют и отправляют фасилитаторы обсуждения. Реклама, сбор средств, политическая агитация и несвязанное продвижение запрещены. Это можно изменить в любой момент в настройках почты.",
  },
};
