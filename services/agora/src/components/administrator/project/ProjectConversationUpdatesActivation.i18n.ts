import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ProjectConversationUpdatesActivationTranslations {
  defaultAriaLabel: string;
  defaultLabel: string;
  editParticipantContact: string;
  listedDefaultDescription: string;
  listedDescription: string;
  missingContact: string;
  noProjectDefaultDescription: string;
  noProjectDescription: string;
  title: string;
}

const en: ProjectConversationUpdatesActivationTranslations = {
  defaultAriaLabel: "Email Updates on by default",
  defaultLabel: "On by default",
  editParticipantContact: "Edit participant contact",
  listedDefaultDescription:
    "Conversations in this project inherit this setting unless an owner overrides them.",
  listedDescription: "Set the default for conversations in {projectTitle}.",
  missingContact:
    "Add a monitored participant contact email before sending Email Updates.",
  noProjectDefaultDescription:
    "No Project conversations inherit this setting unless an owner overrides them.",
  noProjectDescription:
    "Set the default for conversations created without a listed project.",
  title: "Email Updates",
};

export const projectConversationUpdatesActivationTranslations: Record<
  SupportedDisplayLanguageCodes,
  ProjectConversationUpdatesActivationTranslations
> = {
  en,
  ar: {
    defaultAriaLabel: "تشغيل تحديثات البريد الإلكتروني افتراضيًا",
    defaultLabel: "مفعّلة افتراضيًا",
    editParticipantContact: "تعديل جهة اتصال المشاركين",
    listedDefaultDescription:
      "ترث محادثات هذا المشروع هذا الإعداد ما لم يتجاوزه أحد المالكين.",
    listedDescription: "عيّن الإعداد الافتراضي للمحادثات في {projectTitle}.",
    missingContact:
      "أضف بريدًا إلكترونيًا مراقبًا لجهة اتصال المشاركين قبل إرسال تحديثات البريد الإلكتروني.",
    noProjectDefaultDescription:
      "ترث المحادثات بلا مشروع هذا الإعداد ما لم يتجاوزه أحد المالكين.",
    noProjectDescription:
      "عيّن الإعداد الافتراضي للمحادثات المنشأة من دون مشروع مدرج.",
    title: "تحديثات البريد الإلكتروني",
  },
  es: {
    defaultAriaLabel: "Actualizaciones por correo activadas por defecto",
    defaultLabel: "Activadas por defecto",
    editParticipantContact: "Editar contacto de participantes",
    listedDefaultDescription:
      "Las conversaciones de este proyecto heredan esta opción salvo que un responsable la anule.",
    listedDescription:
      "Define el valor predeterminado de las conversaciones de {projectTitle}.",
    missingContact:
      "Añade un correo de contacto de participantes supervisado antes de enviar actualizaciones.",
    noProjectDefaultDescription:
      "Las conversaciones sin proyecto heredan esta opción salvo que un responsable la anule.",
    noProjectDescription:
      "Define el valor predeterminado de las conversaciones creadas sin un proyecto listado.",
    title: "Actualizaciones por correo",
  },
  fa: {
    defaultAriaLabel: "روشن بودن پیش‌فرض به‌روزرسانی‌های ایمیلی",
    defaultLabel: "به‌طور پیش‌فرض روشن",
    editParticipantContact: "ویرایش راه ارتباطی شرکت‌کنندگان",
    listedDefaultDescription:
      "گفتگوهای این پروژه این تنظیم را به ارث می‌برند، مگر اینکه یکی از مالکان آن را تغییر دهد.",
    listedDescription: "پیش‌فرض گفتگوهای {projectTitle} را تنظیم کنید.",
    missingContact:
      "پیش از ارسال به‌روزرسانی‌های ایمیلی، یک ایمیل پاسخ‌گویی‌شده برای ارتباط با شرکت‌کنندگان اضافه کنید.",
    noProjectDefaultDescription:
      "گفتگوهای بدون پروژه این تنظیم را به ارث می‌برند، مگر اینکه یکی از مالکان آن را تغییر دهد.",
    noProjectDescription:
      "پیش‌فرض گفتگوهایی را که بدون پروژه فهرست‌شده ایجاد می‌شوند تنظیم کنید.",
    title: "به‌روزرسانی‌های ایمیلی",
  },
  fr: {
    defaultAriaLabel: "Mises à jour par e-mail activées par défaut",
    defaultLabel: "Activées par défaut",
    editParticipantContact: "Modifier le contact des participants",
    listedDefaultDescription:
      "Les conversations de ce projet héritent de ce réglage, sauf dérogation d'un responsable.",
    listedDescription:
      "Définissez le réglage par défaut des conversations de {projectTitle}.",
    missingContact:
      "Ajoutez une adresse de contact suivie pour les participants avant d'envoyer des mises à jour.",
    noProjectDefaultDescription:
      "Les conversations sans projet héritent de ce réglage, sauf dérogation d'un responsable.",
    noProjectDescription:
      "Définissez le réglage par défaut des conversations créées sans projet répertorié.",
    title: "Mises à jour par e-mail",
  },
  he: {
    defaultAriaLabel: "עדכוני דוא״ל מופעלים כברירת מחדל",
    defaultLabel: "מופעל כברירת מחדל",
    editParticipantContact: "עריכת איש הקשר למשתתפים",
    listedDefaultDescription:
      "השיחות בפרויקט הזה יורשות את ההגדרה, אלא אם בעלים משנה אותה.",
    listedDescription: "הגדרת ברירת המחדל לשיחות ב-{projectTitle}.",
    missingContact:
      "יש להוסיף כתובת דוא״ל מנוטרת ליצירת קשר עם המשתתפים לפני שליחת עדכונים.",
    noProjectDefaultDescription:
      "שיחות ללא פרויקט יורשות את ההגדרה, אלא אם בעלים משנה אותה.",
    noProjectDescription:
      "הגדרת ברירת המחדל לשיחות שנוצרו ללא פרויקט רשום.",
    title: "עדכוני דוא״ל",
  },
  ja: {
    defaultAriaLabel: "メール更新を既定でオン",
    defaultLabel: "既定でオン",
    editParticipantContact: "参加者向け連絡先を編集",
    listedDefaultDescription:
      "所有者が上書きしない限り、このプロジェクトの会話にはこの設定が継承されます。",
    listedDescription: "{projectTitle}の会話の既定値を設定します。",
    missingContact:
      "メール更新を送信する前に、確認される参加者向け連絡先メールを追加してください。",
    noProjectDefaultDescription:
      "プロジェクトなしの会話には、所有者が上書きしない限りこの設定が継承されます。",
    noProjectDescription:
      "一覧表示されるプロジェクトなしで作成された会話の既定値を設定します。",
    title: "メール更新",
  },
  ky: {
    defaultAriaLabel: "Электрондук жаңыртуулар демейки боюнча күйүк",
    defaultLabel: "Демейки боюнча күйүк",
    editParticipantContact: "Катышуучулардын байланышын түзөтүү",
    listedDefaultDescription:
      "Ээси өзгөртпөсө, бул долбоордогу талкуулар ушул жөндөөнү мурастайт.",
    listedDescription:
      "{projectTitle} долбоорундагы талкуулар үчүн демейки жөндөөнү коюңуз.",
    missingContact:
      "Электрондук жаңыртууларды жөнөтүүдөн мурун көзөмөлдөнгөн байланыш дарегин кошуңуз.",
    noProjectDefaultDescription:
      "Долбоорсуз талкууларды ээси өзгөртпөсө, алар ушул жөндөөнү мурастайт.",
    noProjectDescription:
      "Тизмедеги долбоорсуз түзүлгөн талкуулар үчүн демейки жөндөөнү коюңуз.",
    title: "Электрондук жаңыртуулар",
  },
  ru: {
    defaultAriaLabel: "Почтовые обновления включены по умолчанию",
    defaultLabel: "Включены по умолчанию",
    editParticipantContact: "Изменить контакт для участников",
    listedDefaultDescription:
      "Обсуждения этого проекта наследуют настройку, если владелец её не переопределит.",
    listedDescription:
      "Задайте настройку по умолчанию для обсуждений проекта «{projectTitle}».",
    missingContact:
      "Добавьте отслеживаемый контактный адрес для участников перед отправкой обновлений.",
    noProjectDefaultDescription:
      "Обсуждения без проекта наследуют настройку, если владелец её не переопределит.",
    noProjectDescription:
      "Задайте настройку по умолчанию для обсуждений без указанного проекта.",
    title: "Почтовые обновления",
  },
  "zh-Hans": {
    defaultAriaLabel: "默认开启电子邮件更新",
    defaultLabel: "默认开启",
    editParticipantContact: "编辑参与者联系方式",
    listedDefaultDescription:
      "除非负责人另行设置，此项目中的对话会继承此设置。",
    listedDescription: "设置 {projectTitle} 中对话的默认值。",
    missingContact: "发送电子邮件更新前，请添加有人查收的参与者联系邮箱。",
    noProjectDefaultDescription:
      "除非负责人另行设置，无项目对话会继承此设置。",
    noProjectDescription: "设置未归入公开项目的对话的默认值。",
    title: "电子邮件更新",
  },
  "zh-Hant": {
    defaultAriaLabel: "預設開啟電子郵件更新",
    defaultLabel: "預設開啟",
    editParticipantContact: "編輯參與者聯絡方式",
    listedDefaultDescription:
      "除非負責人另行設定，此專案中的對話會沿用此設定。",
    listedDescription: "設定 {projectTitle} 中對話的預設值。",
    missingContact: "傳送電子郵件更新前，請新增有人查收的參與者聯絡信箱。",
    noProjectDefaultDescription:
      "除非負責人另行設定，無專案對話會沿用此設定。",
    noProjectDescription: "設定未歸入公開專案的對話的預設值。",
    title: "電子郵件更新",
  },
};
