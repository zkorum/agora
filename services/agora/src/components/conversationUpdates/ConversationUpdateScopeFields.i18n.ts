import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ConversationUpdateScopeFieldsTranslations {
  projectLabel: string;
  chooseProject: string;
  projectAuthorizationDescription: string;
  conversationsHeading: string;
  recipientIntersectionDescription: string;
  includedConversationsLabel: string;
  conversationPlaceholder: string;
  chooseConversations: string;
  clearAll: string;
  noProjectHint: string;
  noProjectDialogSubtitle: string;
  projectDialogSubtitle: string;
  selectAllEligibleSingular: string;
  selectAllEligiblePlural: string;
  eligibleWithoutProjectSingular: string;
  eligibleWithoutProjectPlural: string;
  eligibleConversationSingular: string;
  eligibleConversationPlural: string;
  updatesDisabled: string;
  participantEstimateSingular: string;
  participantEstimatePlural: string;
  conversationSingular: string;
  conversationPlural: string;
}

export const conversationUpdateScopeFieldsTranslations: Record<
  SupportedDisplayLanguageCodes,
  ConversationUpdateScopeFieldsTranslations
> = {
  en: {
    projectLabel: "Project",
    chooseProject: "Choose a project",
    projectAuthorizationDescription:
      "Authorization is inferred from your eligible project memberships.",
    conversationsHeading: "Conversations",
    recipientIntersectionDescription:
      "The email will add the recipient-specific intersection automatically.",
    includedConversationsLabel: "Included conversations",
    conversationPlaceholder: "Select at least one conversation (required)",
    chooseConversations: "Choose conversations",
    clearAll: "Clear all",
    noProjectHint:
      "Choose one eligible conversation created without a project.",
    noProjectDialogSubtitle:
      "Choose exactly one conversation created without a project.",
    projectDialogSubtitle:
      "Choose one or more conversations from this project.",
    selectAllEligibleSingular: "Select the {count} eligible conversation",
    selectAllEligiblePlural: "Select all {count} eligible conversations",
    eligibleWithoutProjectSingular:
      "{count} eligible conversation without a project",
    eligibleWithoutProjectPlural:
      "{count} eligible conversations without a project",
    eligibleConversationSingular: "{count} eligible conversation",
    eligibleConversationPlural: "{count} eligible conversations",
    updatesDisabled: "Email Updates disabled for this conversation",
    participantEstimateSingular:
      "About {count} participant before email consent filters",
    participantEstimatePlural:
      "About {count} participants before email consent filters",
    conversationSingular: "{count} conversation",
    conversationPlural: "{count} conversations",
  },
  ar: {
    projectLabel: "المشروع",
    chooseProject: "اختر مشروعًا",
    projectAuthorizationDescription:
      "يُستدل على صلاحيتك من عضوياتك المؤهلة في المشاريع.",
    conversationsHeading: "المحادثات",
    recipientIntersectionDescription:
      "سيضيف البريد الإلكتروني تلقائيًا التقاطع الخاص بكل مستلم.",
    includedConversationsLabel: "المحادثات المضمّنة",
    conversationPlaceholder: "اختر محادثة واحدة على الأقل (مطلوب)",
    chooseConversations: "اختر المحادثات",
    clearAll: "مسح الكل",
    noProjectHint: "اختر محادثة مؤهلة واحدة أُنشئت من دون مشروع.",
    noProjectDialogSubtitle: "اختر محادثة واحدة فقط أُنشئت من دون مشروع.",
    projectDialogSubtitle: "اختر محادثة واحدة أو أكثر من هذا المشروع.",
    selectAllEligibleSingular: "اختيار المحادثة المؤهلة وعددها {count}",
    selectAllEligiblePlural: "اختيار كل المحادثات المؤهلة وعددها {count}",
    eligibleWithoutProjectSingular: "{count} محادثة مؤهلة من دون مشروع",
    eligibleWithoutProjectPlural: "{count} محادثات مؤهلة من دون مشروع",
    eligibleConversationSingular: "{count} محادثة مؤهلة",
    eligibleConversationPlural: "{count} محادثات مؤهلة",
    updatesDisabled: "تحديثات البريد الإلكتروني معطّلة لهذه المحادثة",
    participantEstimateSingular:
      "نحو {count} مشارك قبل تطبيق عوامل تصفية الموافقة على البريد الإلكتروني",
    participantEstimatePlural:
      "نحو {count} مشاركين قبل تطبيق عوامل تصفية الموافقة على البريد الإلكتروني",
    conversationSingular: "{count} محادثة",
    conversationPlural: "{count} محادثات",
  },
  es: {
    projectLabel: "Proyecto",
    chooseProject: "Elegir un proyecto",
    projectAuthorizationDescription:
      "La autorización se deduce de sus membresías de proyecto elegibles.",
    conversationsHeading: "Conversaciones",
    recipientIntersectionDescription:
      "El correo añadirá automáticamente la intersección específica de cada destinatario.",
    includedConversationsLabel: "Conversaciones incluidas",
    conversationPlaceholder:
      "Seleccione al menos una conversación (obligatorio)",
    chooseConversations: "Elegir conversaciones",
    clearAll: "Borrar todo",
    noProjectHint: "Elija una conversación elegible creada sin un proyecto.",
    noProjectDialogSubtitle:
      "Elija exactamente una conversación creada sin un proyecto.",
    projectDialogSubtitle: "Elija una o más conversaciones de este proyecto.",
    selectAllEligibleSingular: "Seleccionar la {count} conversación elegible",
    selectAllEligiblePlural: "Seleccionar las {count} conversaciones elegibles",
    eligibleWithoutProjectSingular:
      "{count} conversación elegible sin proyecto",
    eligibleWithoutProjectPlural:
      "{count} conversaciones elegibles sin proyecto",
    eligibleConversationSingular: "{count} conversación elegible",
    eligibleConversationPlural: "{count} conversaciones elegibles",
    updatesDisabled:
      "Las actualizaciones por correo están desactivadas para esta conversación",
    participantEstimateSingular:
      "Aproximadamente {count} participante antes de los filtros de consentimiento por correo",
    participantEstimatePlural:
      "Aproximadamente {count} participantes antes de los filtros de consentimiento por correo",
    conversationSingular: "{count} conversación",
    conversationPlural: "{count} conversaciones",
  },
  fa: {
    projectLabel: "پروژه",
    chooseProject: "انتخاب پروژه",
    projectAuthorizationDescription:
      "مجوز از عضویت‌های واجد شرایط شما در پروژه‌ها تشخیص داده می‌شود.",
    conversationsHeading: "گفت‌وگوها",
    recipientIntersectionDescription:
      "ایمیل به‌طور خودکار اشتراک ویژه هر دریافت‌کننده را اضافه می‌کند.",
    includedConversationsLabel: "گفت‌وگوهای مشمول",
    conversationPlaceholder: "دست‌کم یک گفت‌وگو انتخاب کنید (الزامی)",
    chooseConversations: "انتخاب گفت‌وگوها",
    clearAll: "پاک کردن همه",
    noProjectHint: "یک گفت‌وگوی واجد شرایطِ بدون پروژه انتخاب کنید.",
    noProjectDialogSubtitle:
      "دقیقاً یک گفت‌وگوی ایجادشده بدون پروژه انتخاب کنید.",
    projectDialogSubtitle: "یک یا چند گفت‌وگو از این پروژه انتخاب کنید.",
    selectAllEligibleSingular: "انتخاب {count} گفت‌وگوی واجد شرایط",
    selectAllEligiblePlural: "انتخاب هر {count} گفت‌وگوی واجد شرایط",
    eligibleWithoutProjectSingular: "{count} گفت‌وگوی واجد شرایط بدون پروژه",
    eligibleWithoutProjectPlural: "{count} گفت‌وگوی واجد شرایط بدون پروژه",
    eligibleConversationSingular: "{count} گفت‌وگوی واجد شرایط",
    eligibleConversationPlural: "{count} گفت‌وگوی واجد شرایط",
    updatesDisabled: "به‌روزرسانی ایمیلی برای این گفت‌وگو غیرفعال است",
    participantEstimateSingular:
      "حدود {count} شرکت‌کننده پیش از فیلترهای رضایت ایمیلی",
    participantEstimatePlural:
      "حدود {count} شرکت‌کننده پیش از فیلترهای رضایت ایمیلی",
    conversationSingular: "{count} گفت‌وگو",
    conversationPlural: "{count} گفت‌وگو",
  },
  fr: {
    projectLabel: "Projet",
    chooseProject: "Choisir un projet",
    projectAuthorizationDescription:
      "L’autorisation est déduite de vos adhésions éligibles aux projets.",
    conversationsHeading: "Conversations",
    recipientIntersectionDescription:
      "L’e-mail ajoutera automatiquement l’intersection propre à chaque destinataire.",
    includedConversationsLabel: "Conversations incluses",
    conversationPlaceholder:
      "Sélectionnez au moins une conversation (obligatoire)",
    chooseConversations: "Choisir des conversations",
    clearAll: "Tout effacer",
    noProjectHint: "Choisissez une conversation éligible créée sans projet.",
    noProjectDialogSubtitle:
      "Choisissez exactement une conversation créée sans projet.",
    projectDialogSubtitle:
      "Choisissez une ou plusieurs conversations de ce projet.",
    selectAllEligibleSingular: "Sélectionner la {count} conversation éligible",
    selectAllEligiblePlural: "Sélectionner les {count} conversations éligibles",
    eligibleWithoutProjectSingular: "{count} conversation éligible sans projet",
    eligibleWithoutProjectPlural: "{count} conversations éligibles sans projet",
    eligibleConversationSingular: "{count} conversation éligible",
    eligibleConversationPlural: "{count} conversations éligibles",
    updatesDisabled:
      "Les actualités par e-mail sont désactivées pour cette conversation",
    participantEstimateSingular:
      "Environ {count} participant avant les filtres de consentement par e-mail",
    participantEstimatePlural:
      "Environ {count} participants avant les filtres de consentement par e-mail",
    conversationSingular: "{count} conversation",
    conversationPlural: "{count} conversations",
  },
  "zh-Hans": {
    projectLabel: "项目",
    chooseProject: "选择项目",
    projectAuthorizationDescription: "授权根据您符合条件的项目成员身份推断。",
    conversationsHeading: "对话",
    recipientIntersectionDescription: "邮件会自动加入每位收件人对应的交集。",
    includedConversationsLabel: "包含的对话",
    conversationPlaceholder: "至少选择一个对话（必填）",
    chooseConversations: "选择对话",
    clearAll: "全部清除",
    noProjectHint: "选择一个未归属项目的合格对话。",
    noProjectDialogSubtitle: "仅选择一个未归属项目的对话。",
    projectDialogSubtitle: "从此项目中选择一个或多个对话。",
    selectAllEligibleSingular: "选择这 {count} 个合格对话",
    selectAllEligiblePlural: "选择全部 {count} 个合格对话",
    eligibleWithoutProjectSingular: "{count} 个未归属项目的合格对话",
    eligibleWithoutProjectPlural: "{count} 个未归属项目的合格对话",
    eligibleConversationSingular: "{count} 个合格对话",
    eligibleConversationPlural: "{count} 个合格对话",
    updatesDisabled: "此对话已关闭邮件动态",
    participantEstimateSingular: "应用邮件同意筛选前约有 {count} 名参与者",
    participantEstimatePlural: "应用邮件同意筛选前约有 {count} 名参与者",
    conversationSingular: "{count} 个对话",
    conversationPlural: "{count} 个对话",
  },
  "zh-Hant": {
    projectLabel: "專案",
    chooseProject: "選擇專案",
    projectAuthorizationDescription: "授權依據您符合資格的專案成員身分推斷。",
    conversationsHeading: "對話",
    recipientIntersectionDescription: "郵件會自動加入每位收件人對應的交集。",
    includedConversationsLabel: "包含的對話",
    conversationPlaceholder: "至少選擇一個對話（必填）",
    chooseConversations: "選擇對話",
    clearAll: "全部清除",
    noProjectHint: "選擇一個未歸屬專案的合資格對話。",
    noProjectDialogSubtitle: "僅選擇一個未歸屬專案的對話。",
    projectDialogSubtitle: "從此專案中選擇一個或多個對話。",
    selectAllEligibleSingular: "選擇這 {count} 個合資格對話",
    selectAllEligiblePlural: "選擇全部 {count} 個合資格對話",
    eligibleWithoutProjectSingular: "{count} 個未歸屬專案的合資格對話",
    eligibleWithoutProjectPlural: "{count} 個未歸屬專案的合資格對話",
    eligibleConversationSingular: "{count} 個合資格對話",
    eligibleConversationPlural: "{count} 個合資格對話",
    updatesDisabled: "此對話已關閉郵件動態",
    participantEstimateSingular: "套用郵件同意篩選前約有 {count} 名參與者",
    participantEstimatePlural: "套用郵件同意篩選前約有 {count} 名參與者",
    conversationSingular: "{count} 個對話",
    conversationPlural: "{count} 個對話",
  },
  he: {
    projectLabel: "פרויקט",
    chooseProject: "בחירת פרויקט",
    projectAuthorizationDescription:
      "ההרשאה מוסקת מהחברויות המתאימות שלך בפרויקטים.",
    conversationsHeading: "שיחות",
    recipientIntersectionDescription:
      "הדוא״ל יוסיף אוטומטית את החיתוך המתאים לכל נמען.",
    includedConversationsLabel: "שיחות כלולות",
    conversationPlaceholder: "יש לבחור לפחות שיחה אחת (חובה)",
    chooseConversations: "בחירת שיחות",
    clearAll: "ניקוי הכול",
    noProjectHint: "יש לבחור שיחה מתאימה אחת שנוצרה ללא פרויקט.",
    noProjectDialogSubtitle: "יש לבחור שיחה אחת בדיוק שנוצרה ללא פרויקט.",
    projectDialogSubtitle: "יש לבחור שיחה אחת או יותר מהפרויקט הזה.",
    selectAllEligibleSingular: "בחירת השיחה המתאימה ({count})",
    selectAllEligiblePlural: "בחירת כל {count} השיחות המתאימות",
    eligibleWithoutProjectSingular: "שיחה מתאימה אחת ({count}) ללא פרויקט",
    eligibleWithoutProjectPlural: "{count} שיחות מתאימות ללא פרויקט",
    eligibleConversationSingular: "שיחה מתאימה אחת ({count})",
    eligibleConversationPlural: "{count} שיחות מתאימות",
    updatesDisabled: "עדכוני דוא״ל מושבתים בשיחה הזו",
    participantEstimateSingular:
      "כ-{count} משתתף לפני מסנני ההסכמה לקבלת דוא״ל",
    participantEstimatePlural:
      "כ-{count} משתתפים לפני מסנני ההסכמה לקבלת דוא״ל",
    conversationSingular: "שיחה אחת ({count})",
    conversationPlural: "{count} שיחות",
  },
  ja: {
    projectLabel: "プロジェクト",
    chooseProject: "プロジェクトを選択",
    projectAuthorizationDescription:
      "権限は、対象となるプロジェクトメンバー資格から判定されます。",
    conversationsHeading: "会話",
    recipientIntersectionDescription:
      "メールには受信者ごとの共通範囲が自動的に追加されます。",
    includedConversationsLabel: "含める会話",
    conversationPlaceholder: "会話を1件以上選択（必須）",
    chooseConversations: "会話を選択",
    clearAll: "すべて解除",
    noProjectHint: "プロジェクトなしで作成された対象の会話を1件選択します。",
    noProjectDialogSubtitle:
      "プロジェクトなしで作成された会話を1件だけ選択します。",
    projectDialogSubtitle: "このプロジェクトから1件以上の会話を選択します。",
    selectAllEligibleSingular: "対象の会話{count}件を選択",
    selectAllEligiblePlural: "対象の会話{count}件をすべて選択",
    eligibleWithoutProjectSingular: "プロジェクトに属さない対象の会話{count}件",
    eligibleWithoutProjectPlural: "プロジェクトに属さない対象の会話{count}件",
    eligibleConversationSingular: "対象の会話{count}件",
    eligibleConversationPlural: "対象の会話{count}件",
    updatesDisabled: "この会話ではメール更新が無効です",
    participantEstimateSingular:
      "メール同意フィルター適用前の参加者は約{count}人",
    participantEstimatePlural:
      "メール同意フィルター適用前の参加者は約{count}人",
    conversationSingular: "会話{count}件",
    conversationPlural: "会話{count}件",
  },
  ky: {
    projectLabel: "Долбоор",
    chooseProject: "Долбоор тандаңыз",
    projectAuthorizationDescription:
      "Уруксат жарамдуу долбоор мүчөлүктөрүңүздөн аныкталат.",
    conversationsHeading: "Талкуулар",
    recipientIntersectionDescription:
      "Кат ар бир алуучуга тиешелүү кесилишти автоматтык түрдө кошот.",
    includedConversationsLabel: "Камтылган талкуулар",
    conversationPlaceholder: "Кеминде бир талкуу тандаңыз (милдеттүү)",
    chooseConversations: "Талкууларды тандаңыз",
    clearAll: "Баарын тазалоо",
    noProjectHint: "Долбоорсуз түзүлгөн бир жарамдуу талкууну тандаңыз.",
    noProjectDialogSubtitle: "Долбоорсуз түзүлгөн так бир талкууну тандаңыз.",
    projectDialogSubtitle: "Бул долбоордон бир же бир нече талкууну тандаңыз.",
    selectAllEligibleSingular: "{count} жарамдуу талкууну тандоо",
    selectAllEligiblePlural: "Жарамдуу {count} талкуунун баарын тандоо",
    eligibleWithoutProjectSingular: "Долбоорсуз {count} жарамдуу талкуу",
    eligibleWithoutProjectPlural: "Долбоорсуз {count} жарамдуу талкуу",
    eligibleConversationSingular: "{count} жарамдуу талкуу",
    eligibleConversationPlural: "{count} жарамдуу талкуу",
    updatesDisabled: "Бул талкуу үчүн электрондук жаңыртуулар өчүрүлгөн",
    participantEstimateSingular:
      "Катка макулдук чыпкаларына чейин болжол менен {count} катышуучу",
    participantEstimatePlural:
      "Катка макулдук чыпкаларына чейин болжол менен {count} катышуучу",
    conversationSingular: "{count} талкуу",
    conversationPlural: "{count} талкуу",
  },
  ru: {
    projectLabel: "Проект",
    chooseProject: "Выберите проект",
    projectAuthorizationDescription:
      "Права определяются по вашему участию в подходящих проектах.",
    conversationsHeading: "Обсуждения",
    recipientIntersectionDescription:
      "Письмо автоматически добавит пересечение, относящееся к каждому получателю.",
    includedConversationsLabel: "Включённые обсуждения",
    conversationPlaceholder: "Выберите хотя бы одно обсуждение (обязательно)",
    chooseConversations: "Выберите обсуждения",
    clearAll: "Очистить всё",
    noProjectHint:
      "Выберите одно подходящее обсуждение, созданное без проекта.",
    noProjectDialogSubtitle:
      "Выберите ровно одно обсуждение, созданное без проекта.",
    projectDialogSubtitle:
      "Выберите одно или несколько обсуждений из этого проекта.",
    selectAllEligibleSingular: "Выбрать {count} подходящее обсуждение",
    selectAllEligiblePlural: "Выбрать все подходящие обсуждения: {count}",
    eligibleWithoutProjectSingular: "{count} подходящее обсуждение без проекта",
    eligibleWithoutProjectPlural: "{count} подходящих обсуждения без проекта",
    eligibleConversationSingular: "{count} подходящее обсуждение",
    eligibleConversationPlural: "{count} подходящих обсуждения",
    updatesDisabled: "Почтовые обновления для этого обсуждения отключены",
    participantEstimateSingular:
      "Около {count} участника до фильтров согласия на рассылку",
    participantEstimatePlural:
      "Около {count} участников до фильтров согласия на рассылку",
    conversationSingular: "{count} обсуждение",
    conversationPlural: "{count} обсуждения",
  },
};
