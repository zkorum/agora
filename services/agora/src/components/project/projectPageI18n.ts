import {
  getDisplayLanguageFallbackChain,
  parseSupportedDisplayLanguageOrUndefined,
  type SupportedDisplayLanguageCodes,
} from "src/shared/languages";

type PluralizableProjectPageTranslationKey =
  | "uniqueParticipantsCount"
  | "participationsCount"
  | "activitiesCount"
  | "votesCount"
  | "statementsCount"
  | "participantsCount";

type ProjectPageCountTranslations = Readonly<
  Partial<Record<Intl.LDMLPluralRule, string>> & { other: string }
>;

const pluralizableProjectPageTranslationKeys: Readonly<
  Record<PluralizableProjectPageTranslationKey, true>
> = {
  uniqueParticipantsCount: true,
  participationsCount: true,
  activitiesCount: true,
  votesCount: true,
  statementsCount: true,
  participantsCount: true,
};

export interface ProjectPageTranslations {
  loadErrorTitle: string;
  retryAction: string;
  languageLabel: string;
  languageDialogTitle: string;
  languageSearchPlaceholder: string;
  languageNoResults: string;
  languageSupportedByProject: string;
  languageSupportedByConversation: string;
  bannerImageAlt: string;
  liveConsultation: string;
  closedConsultation: string;
  uniqueParticipantsCount: string;
  participationsCount: string;
  activitiesCount: string;
  votesCount: string;
  activitiesTitle: string;
  documentsTitle: string;
  documentsAccessHint: string;
  viewDocument: string;
  downloadDocument: string;
  reloadDocument: string;
  closeDocument: string;
  documentLoadFailed: string;
  documentAccessDenied: string;
  documentLoading: string;
  emptyActivities: string;
  loadMoreActivities: string;
  activitiesLoadFailed: string;
  allActivitiesLoaded: string;
  projectDetailsAriaLabel: string;
  sponsorsTitle: string;
  projectOwnersTitle: string;
  partnersTitle: string;
  projectContactTitle: string;
  facilitatorTitle: string;
  poweredBy: string;
  homeAriaLabel: string;
  contentOwnedByProjectOwners: string;
  activityStatisticsAriaLabel: string;
  conversationType: string;
  voteType: string;
  closedStatus: string;
  openStatus: string;
  statementsCount: string;
  participantsCount: string;
  viewAction: string;
  joinAction: string;
  voteAction: string;
  invitationOnlyAction: string;
  activityActionAriaLabel: string;
  openWebsiteAriaLabel: string;
  contactImageAlt: string;
  emailContactLabel: string;
  emailContactAriaLabel: string;
  contactPageLabel: string;
  contactPageAriaLabel: string;
}

export const projectPageTranslations: Readonly<
  Record<SupportedDisplayLanguageCodes, ProjectPageTranslations>
> = {
  en: {
    loadErrorTitle: "Project could not be loaded",
    retryAction: "Retry",
    languageLabel: "Language",
    languageDialogTitle: "Display language",
    languageSearchPlaceholder: "Search languages",
    languageNoResults: "No matching languages",
    languageSupportedByProject: "Supported by this project",
    languageSupportedByConversation: "Supported by this conversation",
    bannerImageAlt: "{title} banner",
    liveConsultation: "Live consultation",
    closedConsultation: "Closed consultation",
    uniqueParticipantsCount: "{count} unique participants",
    participationsCount: "{count} participations",
    activitiesCount: "{count} activities",
    votesCount: "{count} votes",
    activitiesTitle: "Activities",
    documentsTitle: "Project Documents",
    documentsAccessHint:
      "Available to project owners and people who participated in any consultation in this project.",
    viewDocument: "View",
    downloadDocument: "Download",
    reloadDocument: "Reload",
    closeDocument: "Back to project",
    documentLoadFailed: "The document could not be opened.",
    documentAccessDenied: "You do not have access to this document.",
    documentLoading: "Loading document",
    emptyActivities: "No activities have been published yet.",
    loadMoreActivities: "Load more activities",
    activitiesLoadFailed: "More activities could not be loaded.",
    allActivitiesLoaded: "All activities loaded",
    projectDetailsAriaLabel: "Project details",
    sponsorsTitle: "Sponsors",
    projectOwnersTitle: "Project Owners",
    partnersTitle: "Partners",
    projectContactTitle: "Contact",
    facilitatorTitle: "Facilitator",
    poweredBy: "Powered by",
    homeAriaLabel: "Go to Agora Citizen Network home",
    contentOwnedByProjectOwners:
      "Project content is owned by the Project Owners",
    activityStatisticsAriaLabel: "Activity statistics",
    conversationType: "Conversation",
    voteType: "Vote",
    closedStatus: "Closed",
    openStatus: "Open",
    statementsCount: "{count} statements",
    participantsCount: "{count} participants",
    viewAction: "View",
    joinAction: "Join",
    voteAction: "Vote",
    invitationOnlyAction: "Link available by invitation",
    activityActionAriaLabel: "{action} {title}",
    openWebsiteAriaLabel: "Open {name} website",
    contactImageAlt: "{name} image",
    emailContactLabel: "Email contact",
    emailContactAriaLabel: "Email {name}",
    contactPageLabel: "Contact page",
    contactPageAriaLabel: "Open {name} contact page",
  },
  es: {
    loadErrorTitle: "No se pudo cargar el proyecto",
    retryAction: "Reintentar",
    languageLabel: "Idioma",
    languageDialogTitle: "Idioma de visualización",
    languageSearchPlaceholder: "Buscar idiomas",
    languageNoResults: "No hay idiomas coincidentes",
    languageSupportedByProject: "Compatible con este proyecto",
    languageSupportedByConversation: "Compatible con esta conversación",
    bannerImageAlt: "Banner de {title}",
    liveConsultation: "Consulta en directo",
    closedConsultation: "Consulta cerrada",
    uniqueParticipantsCount: "{count} participantes únicos",
    participationsCount: "{count} participaciones",
    activitiesCount: "{count} actividades",
    votesCount: "{count} votos",
    activitiesTitle: "Actividades",
    documentsTitle: "Documentos del proyecto",
    documentsAccessHint:
      "Inicia sesión para acceder a los documentos disponibles para participantes.",
    viewDocument: "Ver",
    downloadDocument: "Descargar",
    reloadDocument: "Recargar",
    closeDocument: "Cerrar documento",
    documentLoadFailed: "No se pudo abrir el documento.",
    documentAccessDenied: "No tienes acceso a este documento.",
    documentLoading: "Cargando documento",
    emptyActivities: "Todavía no se han publicado actividades.",
    loadMoreActivities: "Cargar más actividades",
    activitiesLoadFailed: "No se pudieron cargar más actividades.",
    allActivitiesLoaded: "Todas las actividades cargadas",
    projectDetailsAriaLabel: "Detalles del proyecto",
    sponsorsTitle: "Patrocinadores",
    projectOwnersTitle: "Responsables del proyecto",
    partnersTitle: "Socios",
    projectContactTitle: "Contacto",
    facilitatorTitle: "Facilitación",
    poweredBy: "Con tecnología de",
    homeAriaLabel: "Ir al inicio de Agora Citizen Network",
    contentOwnedByProjectOwners:
      "El contenido del proyecto pertenece a sus responsables",
    activityStatisticsAriaLabel: "Estadísticas de la actividad",
    conversationType: "Conversación",
    voteType: "Votación",
    closedStatus: "Cerrada",
    openStatus: "Abierta",
    statementsCount: "{count} declaraciones",
    participantsCount: "{count} participantes",
    viewAction: "Ver",
    joinAction: "Unirse",
    voteAction: "Votar",
    invitationOnlyAction: "Enlace disponible por invitación",
    activityActionAriaLabel: "{action}: {title}",
    openWebsiteAriaLabel: "Abrir el sitio web de {name}",
    contactImageAlt: "Imagen de {name}",
    emailContactLabel: "Enviar email",
    emailContactAriaLabel: "Enviar email a {name}",
    contactPageLabel: "Página de contacto",
    contactPageAriaLabel: "Abrir la página de contacto de {name}",
  },
  fr: {
    loadErrorTitle: "Le projet n'a pas pu être chargé",
    retryAction: "Réessayer",
    languageLabel: "Langue",
    languageDialogTitle: "Langue d'affichage",
    languageSearchPlaceholder: "Rechercher des langues",
    languageNoResults: "Aucune langue correspondante",
    languageSupportedByProject: "Prise en charge par ce projet",
    languageSupportedByConversation: "Prise en charge par cette conversation",
    bannerImageAlt: "Bannière de {title}",
    liveConsultation: "Consultation en direct",
    closedConsultation: "Consultation terminée",
    uniqueParticipantsCount: "{count} participants uniques",
    participationsCount: "{count} participations",
    activitiesCount: "{count} activités",
    votesCount: "{count} votes",
    activitiesTitle: "Activités",
    documentsTitle: "Documents du projet",
    documentsAccessHint:
      "Connectez-vous pour accéder aux documents réservés aux participants.",
    viewDocument: "Voir",
    downloadDocument: "Télécharger",
    reloadDocument: "Recharger",
    closeDocument: "Fermer le document",
    documentLoadFailed: "Le document n'a pas pu être ouvert.",
    documentAccessDenied: "Vous n'avez pas accès à ce document.",
    documentLoading: "Chargement du document",
    emptyActivities: "Aucune activité n'a encore été publiée.",
    loadMoreActivities: "Charger plus d'activités",
    activitiesLoadFailed: "Les activités suivantes n'ont pas pu être chargées.",
    allActivitiesLoaded: "Toutes les activités sont chargées",
    projectDetailsAriaLabel: "Détails du projet",
    sponsorsTitle: "Financeurs",
    projectOwnersTitle: "Porteurs du projet",
    partnersTitle: "Partenaires",
    projectContactTitle: "Contact",
    facilitatorTitle: "Facilitateur",
    poweredBy: "Propulsé par",
    homeAriaLabel: "Aller à l'accueil d'Agora Citizen Network",
    contentOwnedByProjectOwners:
      "Le contenu du projet appartient aux porteurs du projet",
    activityStatisticsAriaLabel: "Statistiques de l'activité",
    conversationType: "Conversation",
    voteType: "Vote",
    closedStatus: "Terminée",
    openStatus: "Ouverte",
    statementsCount: "{count} propositions",
    participantsCount: "{count} participants",
    viewAction: "Voir",
    joinAction: "Participer",
    voteAction: "Voter",
    invitationOnlyAction: "Lien disponible sur invitation",
    activityActionAriaLabel: "{action} : {title}",
    openWebsiteAriaLabel: "Ouvrir le site web de {name}",
    contactImageAlt: "Image de {name}",
    emailContactLabel: "Contacter par email",
    emailContactAriaLabel: "Envoyer un email à {name}",
    contactPageLabel: "Page de contact",
    contactPageAriaLabel: "Ouvrir la page de contact de {name}",
  },
  "zh-Hans": {
    loadErrorTitle: "无法加载项目",
    retryAction: "重试",
    languageLabel: "语言",
    languageDialogTitle: "显示语言",
    languageSearchPlaceholder: "搜索语言",
    languageNoResults: "没有匹配的语言",
    languageSupportedByProject: "此项目支持",
    languageSupportedByConversation: "此对话支持",
    bannerImageAlt: "{title} 横幅",
    liveConsultation: "进行中的咨询",
    closedConsultation: "已结束的咨询",
    uniqueParticipantsCount: "{count} 位独立参与者",
    participationsCount: "{count} 次对话参与",
    activitiesCount: "{count} 个活动",
    votesCount: "{count} 票",
    activitiesTitle: "活动",
    documentsTitle: "项目文档",
    documentsAccessHint: "登录后可访问向咨询参与者开放的文档。",
    viewDocument: "查看",
    downloadDocument: "下载",
    reloadDocument: "重新加载",
    closeDocument: "关闭文档",
    documentLoadFailed: "无法打开文档。",
    documentAccessDenied: "您无权访问此文档。",
    documentLoading: "正在加载文档",
    emptyActivities: "尚未发布任何活动。",
    loadMoreActivities: "加载更多活动",
    activitiesLoadFailed: "无法加载更多活动。",
    allActivitiesLoaded: "所有活动已加载",
    projectDetailsAriaLabel: "项目详情",
    sponsorsTitle: "赞助方",
    projectOwnersTitle: "项目负责人",
    partnersTitle: "合作伙伴",
    projectContactTitle: "联系人",
    facilitatorTitle: "协调人",
    poweredBy: "技术支持",
    homeAriaLabel: "前往 Agora Citizen Network 首页",
    contentOwnedByProjectOwners: "项目内容归项目负责人所有",
    activityStatisticsAriaLabel: "活动统计",
    conversationType: "对话",
    voteType: "投票",
    closedStatus: "已关闭",
    openStatus: "开放中",
    statementsCount: "{count} 条陈述",
    participantsCount: "{count} 位参与者",
    viewAction: "查看",
    joinAction: "加入",
    voteAction: "投票",
    invitationOnlyAction: "链接仅凭邀请提供",
    activityActionAriaLabel: "{action}：{title}",
    openWebsiteAriaLabel: "打开 {name} 的网站",
    contactImageAlt: "{name} 图片",
    emailContactLabel: "发送邮件",
    emailContactAriaLabel: "给 {name} 发送邮件",
    contactPageLabel: "联系页面",
    contactPageAriaLabel: "打开 {name} 的联系页面",
  },
  "zh-Hant": {
    loadErrorTitle: "無法載入專案",
    retryAction: "重試",
    languageLabel: "語言",
    languageDialogTitle: "顯示語言",
    languageSearchPlaceholder: "搜尋語言",
    languageNoResults: "沒有相符的語言",
    languageSupportedByProject: "此專案支援",
    languageSupportedByConversation: "此對話支援",
    bannerImageAlt: "{title} 橫幅",
    liveConsultation: "進行中的諮詢",
    closedConsultation: "已結束的諮詢",
    uniqueParticipantsCount: "{count} 位不重複參與者",
    participationsCount: "{count} 次對話參與",
    activitiesCount: "{count} 個活動",
    votesCount: "{count} 票",
    activitiesTitle: "活動",
    documentsTitle: "專案文件",
    documentsAccessHint: "登入後可存取向諮詢參與者開放的文件。",
    viewDocument: "查看",
    downloadDocument: "下載",
    reloadDocument: "重新載入",
    closeDocument: "關閉文件",
    documentLoadFailed: "無法開啟文件。",
    documentAccessDenied: "您無權存取此文件。",
    documentLoading: "正在載入文件",
    emptyActivities: "尚未發布任何活動。",
    loadMoreActivities: "載入更多活動",
    activitiesLoadFailed: "無法載入更多活動。",
    allActivitiesLoaded: "所有活動已載入",
    projectDetailsAriaLabel: "專案詳情",
    sponsorsTitle: "贊助方",
    projectOwnersTitle: "專案負責人",
    partnersTitle: "合作夥伴",
    projectContactTitle: "聯絡人",
    facilitatorTitle: "協調人",
    poweredBy: "技術支援",
    homeAriaLabel: "前往 Agora Citizen Network 首頁",
    contentOwnedByProjectOwners: "專案內容歸專案負責人所有",
    activityStatisticsAriaLabel: "活動統計",
    conversationType: "對話",
    voteType: "投票",
    closedStatus: "已關閉",
    openStatus: "開放中",
    statementsCount: "{count} 條陳述",
    participantsCount: "{count} 位參與者",
    viewAction: "查看",
    joinAction: "加入",
    voteAction: "投票",
    invitationOnlyAction: "連結僅憑邀請提供",
    activityActionAriaLabel: "{action}：{title}",
    openWebsiteAriaLabel: "開啟 {name} 的網站",
    contactImageAlt: "{name} 圖片",
    emailContactLabel: "傳送電子郵件",
    emailContactAriaLabel: "傳送電子郵件給 {name}",
    contactPageLabel: "聯絡頁面",
    contactPageAriaLabel: "開啟 {name} 的聯絡頁面",
  },
  ja: {
    loadErrorTitle: "プロジェクトを読み込めませんでした",
    retryAction: "再試行",
    languageLabel: "言語",
    languageDialogTitle: "表示言語",
    languageSearchPlaceholder: "言語を検索",
    languageNoResults: "一致する言語はありません",
    languageSupportedByProject: "このプロジェクトで対応",
    languageSupportedByConversation: "この会話で対応",
    bannerImageAlt: "{title} のバナー",
    liveConsultation: "進行中の協議",
    closedConsultation: "終了した協議",
    uniqueParticipantsCount: "{count}人のユニーク参加者",
    participationsCount: "{count}件の会話参加",
    activitiesCount: "{count}件のアクティビティ",
    votesCount: "{count}票",
    activitiesTitle: "アクティビティ",
    documentsTitle: "プロジェクト文書",
    documentsAccessHint:
      "参加者向け文書にアクセスするにはログインしてください。",
    viewDocument: "表示",
    downloadDocument: "ダウンロード",
    reloadDocument: "再読み込み",
    closeDocument: "文書を閉じる",
    documentLoadFailed: "文書を開けませんでした。",
    documentAccessDenied: "この文書にアクセスする権限がありません。",
    documentLoading: "文書を読み込んでいます",
    emptyActivities: "まだアクティビティは公開されていません。",
    loadMoreActivities: "さらにアクティビティを読み込む",
    activitiesLoadFailed: "追加のアクティビティを読み込めませんでした。",
    allActivitiesLoaded: "すべてのアクティビティを読み込みました",
    projectDetailsAriaLabel: "プロジェクト詳細",
    sponsorsTitle: "スポンサー",
    projectOwnersTitle: "プロジェクトオーナー",
    partnersTitle: "パートナー",
    projectContactTitle: "連絡先",
    facilitatorTitle: "ファシリテーター",
    poweredBy: "提供",
    homeAriaLabel: "Agora Citizen Network ホームへ移動",
    contentOwnedByProjectOwners:
      "プロジェクトのコンテンツはプロジェクトオーナーに帰属します",
    activityStatisticsAriaLabel: "アクティビティ統計",
    conversationType: "会話",
    voteType: "投票",
    closedStatus: "終了",
    openStatus: "公開中",
    statementsCount: "{count}件のステートメント",
    participantsCount: "{count}人の参加者",
    viewAction: "見る",
    joinAction: "参加",
    voteAction: "投票",
    invitationOnlyAction: "招待された方にリンクを提供",
    activityActionAriaLabel: "{action}: {title}",
    openWebsiteAriaLabel: "{name} のウェブサイトを開く",
    contactImageAlt: "{name} の画像",
    emailContactLabel: "メールで連絡",
    emailContactAriaLabel: "{name} にメールを送信",
    contactPageLabel: "連絡先ページ",
    contactPageAriaLabel: "{name} の連絡先ページを開く",
  },
  ar: {
    loadErrorTitle: "تعذر تحميل المشروع",
    retryAction: "إعادة المحاولة",
    languageLabel: "اللغة",
    languageDialogTitle: "لغة العرض",
    languageSearchPlaceholder: "البحث عن اللغات",
    languageNoResults: "لا توجد لغات مطابقة",
    languageSupportedByProject: "مدعومة من هذا المشروع",
    languageSupportedByConversation: "مدعومة من هذه المحادثة",
    bannerImageAlt: "لافتة {title}",
    liveConsultation: "استشارة مباشرة",
    closedConsultation: "استشارة مغلقة",
    uniqueParticipantsCount: "{count} مشاركين فريدين",
    participationsCount: "{count} مشاركات في المحادثات",
    activitiesCount: "{count} أنشطة",
    votesCount: "{count} أصوات",
    activitiesTitle: "الأنشطة",
    documentsTitle: "مستندات المشروع",
    documentsAccessHint: "سجّل الدخول للوصول إلى المستندات المتاحة للمشاركين.",
    viewDocument: "عرض",
    downloadDocument: "تنزيل",
    reloadDocument: "إعادة التحميل",
    closeDocument: "إغلاق المستند",
    documentLoadFailed: "تعذر فتح المستند.",
    documentAccessDenied: "ليس لديك صلاحية الوصول إلى هذا المستند.",
    documentLoading: "جارٍ تحميل المستند",
    emptyActivities: "لم يتم نشر أي أنشطة بعد.",
    loadMoreActivities: "تحميل المزيد من الأنشطة",
    activitiesLoadFailed: "تعذر تحميل المزيد من الأنشطة.",
    allActivitiesLoaded: "تم تحميل جميع الأنشطة",
    projectDetailsAriaLabel: "تفاصيل المشروع",
    sponsorsTitle: "الرعاة",
    projectOwnersTitle: "مالكو المشروع",
    partnersTitle: "الشركاء",
    projectContactTitle: "جهة الاتصال",
    facilitatorTitle: "المُيسّر",
    poweredBy: "مدعوم من",
    homeAriaLabel: "الانتقال إلى الصفحة الرئيسية لـ Agora Citizen Network",
    contentOwnedByProjectOwners: "محتوى المشروع مملوك لمالكي المشروع",
    activityStatisticsAriaLabel: "إحصاءات النشاط",
    conversationType: "محادثة",
    voteType: "تصويت",
    closedStatus: "مغلقة",
    openStatus: "مفتوحة",
    statementsCount: "{count} عبارات",
    participantsCount: "{count} مشاركين",
    viewAction: "عرض",
    joinAction: "انضمام",
    voteAction: "تصويت",
    invitationOnlyAction: "الرابط متاح بدعوة",
    activityActionAriaLabel: "{action}: {title}",
    openWebsiteAriaLabel: "فتح موقع {name}",
    contactImageAlt: "صورة {name}",
    emailContactLabel: "إرسال بريد إلكتروني",
    emailContactAriaLabel: "إرسال بريد إلكتروني إلى {name}",
    contactPageLabel: "صفحة التواصل",
    contactPageAriaLabel: "فتح صفحة التواصل مع {name}",
  },
  fa: {
    loadErrorTitle: "پروژه بارگذاری نشد",
    retryAction: "تلاش دوباره",
    languageLabel: "زبان",
    languageDialogTitle: "زبان نمایش",
    languageSearchPlaceholder: "جستجوی زبان‌ها",
    languageNoResults: "هیچ زبان مطابقی پیدا نشد",
    languageSupportedByProject: "پشتیبانی‌شده توسط این پروژه",
    languageSupportedByConversation: "پشتیبانی‌شده توسط این گفت‌وگو",
    bannerImageAlt: "بنر {title}",
    liveConsultation: "مشاوره زنده",
    closedConsultation: "مشاوره بسته‌شده",
    uniqueParticipantsCount: "{count} شرکت‌کننده منحصربه‌فرد",
    participationsCount: "{count} مشارکت در گفتگوها",
    activitiesCount: "{count} فعالیت",
    votesCount: "{count} رأی",
    activitiesTitle: "فعالیت‌ها",
    documentsTitle: "اسناد پروژه",
    documentsAccessHint: "برای دسترسی به اسناد ویژه شرکت‌کنندگان وارد شوید.",
    viewDocument: "مشاهده",
    downloadDocument: "دانلود",
    reloadDocument: "بارگذاری دوباره",
    closeDocument: "بستن سند",
    documentLoadFailed: "سند باز نشد.",
    documentAccessDenied: "شما به این سند دسترسی ندارید.",
    documentLoading: "در حال بارگذاری سند",
    emptyActivities: "هنوز هیچ فعالیتی منتشر نشده است.",
    loadMoreActivities: "بارگذاری فعالیت‌های بیشتر",
    activitiesLoadFailed: "فعالیت‌های بیشتری بارگذاری نشد.",
    allActivitiesLoaded: "همه فعالیت‌ها بارگذاری شدند",
    projectDetailsAriaLabel: "جزئیات پروژه",
    sponsorsTitle: "حامیان مالی",
    projectOwnersTitle: "مالکان پروژه",
    partnersTitle: "شرکا",
    projectContactTitle: "تماس",
    facilitatorTitle: "تسهیل‌گر",
    poweredBy: "قدرت‌گرفته از",
    homeAriaLabel: "رفتن به صفحه اصلی Agora Citizen Network",
    contentOwnedByProjectOwners: "محتوای پروژه متعلق به مالکان پروژه است",
    activityStatisticsAriaLabel: "آمار فعالیت",
    conversationType: "گفت‌وگو",
    voteType: "رأی‌گیری",
    closedStatus: "بسته",
    openStatus: "باز",
    statementsCount: "{count} گزاره",
    participantsCount: "{count} شرکت‌کننده",
    viewAction: "مشاهده",
    joinAction: "پیوستن",
    voteAction: "رأی دادن",
    invitationOnlyAction: "پیوند با دعوت در دسترس است",
    activityActionAriaLabel: "{action}: {title}",
    openWebsiteAriaLabel: "باز کردن وب‌سایت {name}",
    contactImageAlt: "تصویر {name}",
    emailContactLabel: "ارسال ایمیل",
    emailContactAriaLabel: "ارسال ایمیل به {name}",
    contactPageLabel: "صفحه تماس",
    contactPageAriaLabel: "باز کردن صفحه تماس {name}",
  },
  he: {
    loadErrorTitle: "לא ניתן לטעון את הפרויקט",
    retryAction: "ניסיון חוזר",
    languageLabel: "שפה",
    languageDialogTitle: "שפת תצוגה",
    languageSearchPlaceholder: "חיפוש שפות",
    languageNoResults: "לא נמצאו שפות מתאימות",
    languageSupportedByProject: "נתמך על ידי הפרויקט הזה",
    languageSupportedByConversation: "נתמך על ידי השיחה הזו",
    bannerImageAlt: "באנר של {title}",
    liveConsultation: "התייעצות פעילה",
    closedConsultation: "התייעצות סגורה",
    uniqueParticipantsCount: "{count} משתתפים ייחודיים",
    participationsCount: "{count} השתתפויות בשיחות",
    activitiesCount: "{count} פעילויות",
    votesCount: "{count} הצבעות",
    activitiesTitle: "פעילויות",
    documentsTitle: "מסמכי הפרויקט",
    documentsAccessHint: "יש להתחבר כדי לגשת למסמכים הזמינים למשתתפים.",
    viewDocument: "הצגה",
    downloadDocument: "הורדה",
    reloadDocument: "טעינה מחדש",
    closeDocument: "סגירת המסמך",
    documentLoadFailed: "לא ניתן לפתוח את המסמך.",
    documentAccessDenied: "אין לך גישה למסמך הזה.",
    documentLoading: "המסמך נטען",
    emptyActivities: "עדיין לא פורסמו פעילויות.",
    loadMoreActivities: "טעינת פעילויות נוספות",
    activitiesLoadFailed: "לא ניתן לטעון פעילויות נוספות.",
    allActivitiesLoaded: "כל הפעילויות נטענו",
    projectDetailsAriaLabel: "פרטי הפרויקט",
    sponsorsTitle: "נותני חסות",
    projectOwnersTitle: "בעלי הפרויקט",
    partnersTitle: "שותפים",
    projectContactTitle: "איש קשר",
    facilitatorTitle: "מנחה",
    poweredBy: "מופעל על ידי",
    homeAriaLabel: "מעבר לדף הבית של Agora Citizen Network",
    contentOwnedByProjectOwners: "תוכן הפרויקט שייך לבעלי הפרויקט",
    activityStatisticsAriaLabel: "סטטיסטיקות פעילות",
    conversationType: "שיחה",
    voteType: "הצבעה",
    closedStatus: "סגור",
    openStatus: "פתוח",
    statementsCount: "{count} הצהרות",
    participantsCount: "{count} משתתפים",
    viewAction: "צפייה",
    joinAction: "הצטרפות",
    voteAction: "הצבעה",
    invitationOnlyAction: "הקישור זמין בהזמנה",
    activityActionAriaLabel: "{action}: {title}",
    openWebsiteAriaLabel: "פתיחת האתר של {name}",
    contactImageAlt: "תמונה של {name}",
    emailContactLabel: "שליחת אימייל",
    emailContactAriaLabel: "שליחת אימייל אל {name}",
    contactPageLabel: "דף יצירת קשר",
    contactPageAriaLabel: "פתיחת דף יצירת הקשר של {name}",
  },
  ky: {
    loadErrorTitle: "Долбоорду жүктөө мүмкүн болгон жок",
    retryAction: "Кайра аракет кылуу",
    languageLabel: "Тил",
    languageDialogTitle: "Көрсөтүү тили",
    languageSearchPlaceholder: "Тилдерди издөө",
    languageNoResults: "Дал келген тилдер жок",
    languageSupportedByProject: "Бул долбоор колдойт",
    languageSupportedByConversation: "Бул талкуу колдойт",
    bannerImageAlt: "{title} баннери",
    liveConsultation: "Жандуу консультация",
    closedConsultation: "Жабылган консультация",
    uniqueParticipantsCount: "{count} уникалдуу катышуучу",
    participationsCount: "{count} талкууга катышуу",
    activitiesCount: "{count} иш-чара",
    votesCount: "{count} добуш",
    activitiesTitle: "Иш-чаралар",
    documentsTitle: "Долбоордун документтери",
    documentsAccessHint: "Катышуучулар үчүн документтерге кирүү үчүн кириңиз.",
    viewDocument: "Көрүү",
    downloadDocument: "Жүктөп алуу",
    reloadDocument: "Кайра жүктөө",
    closeDocument: "Документти жабуу",
    documentLoadFailed: "Документти ачуу мүмкүн болгон жок.",
    documentAccessDenied: "Бул документке кирүүгө укугуңуз жок.",
    documentLoading: "Документ жүктөлүүдө",
    emptyActivities: "Азырынча иш-чаралар жарыялана элек.",
    loadMoreActivities: "Дагы иш-чараларды жүктөө",
    activitiesLoadFailed: "Кошумча иш-чаралар жүктөлгөн жок.",
    allActivitiesLoaded: "Бардык иш-чаралар жүктөлдү",
    projectDetailsAriaLabel: "Долбоор тууралуу маалымат",
    sponsorsTitle: "Демөөрчүлөр",
    projectOwnersTitle: "Долбоор ээлери",
    partnersTitle: "Өнөктөштөр",
    projectContactTitle: "Байланыш",
    facilitatorTitle: "Фасилитатор",
    poweredBy: "Түзгөн",
    homeAriaLabel: "Agora Citizen Network башкы бетине өтүү",
    contentOwnedByProjectOwners: "Долбоордун мазмуну Долбоор ээлерине таандык",
    activityStatisticsAriaLabel: "Иш-чара статистикасы",
    conversationType: "Талкуу",
    voteType: "Добуш берүү",
    closedStatus: "Жабык",
    openStatus: "Ачык",
    statementsCount: "{count} пикир",
    participantsCount: "{count} катышуучу",
    viewAction: "Көрүү",
    joinAction: "Кошулуу",
    voteAction: "Добуш берүү",
    invitationOnlyAction: "Шилтеме чакыруу менен жеткиликтүү",
    activityActionAriaLabel: "{action}: {title}",
    openWebsiteAriaLabel: "{name} веб-сайтын ачуу",
    contactImageAlt: "{name} сүрөтү",
    emailContactLabel: "Email аркылуу байланышуу",
    emailContactAriaLabel: "{name} дарегине email жазуу",
    contactPageLabel: "Байланыш барагы",
    contactPageAriaLabel: "{name} байланыш барагын ачуу",
  },
  ru: {
    loadErrorTitle: "Не удалось загрузить проект",
    retryAction: "Повторить",
    languageLabel: "Язык",
    languageDialogTitle: "Язык отображения",
    languageSearchPlaceholder: "Поиск языков",
    languageNoResults: "Подходящие языки не найдены",
    languageSupportedByProject: "Поддерживается этим проектом",
    languageSupportedByConversation: "Поддерживается этим обсуждением",
    bannerImageAlt: "Баннер: {title}",
    liveConsultation: "Живая консультация",
    closedConsultation: "Закрытая консультация",
    uniqueParticipantsCount: "{count} уникальных участников",
    participationsCount: "{count} участий в обсуждениях",
    activitiesCount: "{count} активности",
    votesCount: "{count} голосов",
    activitiesTitle: "Активности",
    documentsTitle: "Документы проекта",
    documentsAccessHint:
      "Войдите, чтобы получить доступ к документам для участников.",
    viewDocument: "Просмотреть",
    downloadDocument: "Скачать",
    reloadDocument: "Перезагрузить",
    closeDocument: "Закрыть документ",
    documentLoadFailed: "Не удалось открыть документ.",
    documentAccessDenied: "У вас нет доступа к этому документу.",
    documentLoading: "Загрузка документа",
    emptyActivities: "Активности пока не опубликованы.",
    loadMoreActivities: "Загрузить больше активностей",
    activitiesLoadFailed: "Не удалось загрузить больше активностей.",
    allActivitiesLoaded: "Все активности загружены",
    projectDetailsAriaLabel: "Информация о проекте",
    sponsorsTitle: "Спонсоры",
    projectOwnersTitle: "Владельцы проекта",
    partnersTitle: "Партнеры",
    projectContactTitle: "Контакт",
    facilitatorTitle: "Фасилитатор",
    poweredBy: "Работает на",
    homeAriaLabel: "Перейти на главную Agora Citizen Network",
    contentOwnedByProjectOwners:
      "Содержание проекта принадлежит владельцам проекта",
    activityStatisticsAriaLabel: "Статистика активности",
    conversationType: "Обсуждение",
    voteType: "Голосование",
    closedStatus: "Закрыто",
    openStatus: "Открыто",
    statementsCount: "{count} высказываний",
    participantsCount: "{count} участников",
    viewAction: "Посмотреть",
    joinAction: "Присоединиться",
    voteAction: "Голосовать",
    invitationOnlyAction: "Ссылка доступна по приглашению",
    activityActionAriaLabel: "{action}: {title}",
    openWebsiteAriaLabel: "Открыть сайт: {name}",
    contactImageAlt: "Изображение: {name}",
    emailContactLabel: "Написать контакту",
    emailContactAriaLabel: "Написать {name}",
    contactPageLabel: "Страница контактов",
    contactPageAriaLabel: "Открыть страницу контактов: {name}",
  },
};

const projectPageCountTranslations: Readonly<
  Record<
    SupportedDisplayLanguageCodes,
    Record<PluralizableProjectPageTranslationKey, ProjectPageCountTranslations>
  >
> = {
  en: {
    uniqueParticipantsCount: {
      one: "{count} unique participant",
      other: "{count} unique participants",
    },
    participationsCount: {
      one: "{count} participation",
      other: "{count} participations",
    },
    activitiesCount: { one: "{count} activity", other: "{count} activities" },
    votesCount: { one: "{count} vote", other: "{count} votes" },
    statementsCount: { one: "{count} statement", other: "{count} statements" },
    participantsCount: {
      one: "{count} participant",
      other: "{count} participants",
    },
  },
  es: {
    uniqueParticipantsCount: {
      one: "{count} participante único",
      other: "{count} participantes únicos",
    },
    participationsCount: {
      one: "{count} participación",
      other: "{count} participaciones",
    },
    activitiesCount: { one: "{count} actividad", other: "{count} actividades" },
    votesCount: { one: "{count} voto", other: "{count} votos" },
    statementsCount: {
      one: "{count} declaración",
      other: "{count} declaraciones",
    },
    participantsCount: {
      one: "{count} participante",
      other: "{count} participantes",
    },
  },
  fr: {
    uniqueParticipantsCount: {
      one: "{count} participant unique",
      other: "{count} participants uniques",
    },
    participationsCount: {
      one: "{count} participation",
      other: "{count} participations",
    },
    activitiesCount: { one: "{count} activité", other: "{count} activités" },
    votesCount: { one: "{count} vote", other: "{count} votes" },
    statementsCount: {
      one: "{count} proposition",
      other: "{count} propositions",
    },
    participantsCount: {
      one: "{count} participant",
      other: "{count} participants",
    },
  },
  "zh-Hans": {
    uniqueParticipantsCount: { other: "{count} 位独立参与者" },
    participationsCount: { other: "{count} 次对话参与" },
    activitiesCount: { other: "{count} 个活动" },
    votesCount: { other: "{count} 票" },
    statementsCount: { other: "{count} 条陈述" },
    participantsCount: { other: "{count} 位参与者" },
  },
  "zh-Hant": {
    uniqueParticipantsCount: { other: "{count} 位不重複參與者" },
    participationsCount: { other: "{count} 次對話參與" },
    activitiesCount: { other: "{count} 個活動" },
    votesCount: { other: "{count} 票" },
    statementsCount: { other: "{count} 條陳述" },
    participantsCount: { other: "{count} 位參與者" },
  },
  ja: {
    uniqueParticipantsCount: { other: "{count}人のユニーク参加者" },
    participationsCount: { other: "{count}件の会話参加" },
    activitiesCount: { other: "{count}件のアクティビティ" },
    votesCount: { other: "{count}票" },
    statementsCount: { other: "{count}件のステートメント" },
    participantsCount: { other: "{count}人の参加者" },
  },
  ar: {
    uniqueParticipantsCount: {
      one: "{count} مشارك فريد",
      two: "{count} مشاركان فريدان",
      few: "{count} مشاركين فريدين",
      many: "{count} مشاركًا فريدًا",
      other: "{count} مشارك فريد",
    },
    participationsCount: {
      one: "{count} مشاركة في المحادثات",
      two: "{count} مشاركتان في المحادثات",
      few: "{count} مشاركات في المحادثات",
      many: "{count} مشاركة في المحادثات",
      other: "{count} مشاركة في المحادثات",
    },
    activitiesCount: {
      one: "{count} نشاط",
      two: "{count} نشاطان",
      few: "{count} أنشطة",
      many: "{count} نشاطًا",
      other: "{count} نشاط",
    },
    votesCount: {
      one: "{count} صوت",
      two: "{count} صوتان",
      few: "{count} أصوات",
      many: "{count} صوتًا",
      other: "{count} صوت",
    },
    statementsCount: {
      one: "{count} عبارة",
      two: "{count} عبارتان",
      few: "{count} عبارات",
      many: "{count} عبارة",
      other: "{count} عبارة",
    },
    participantsCount: {
      one: "{count} مشارك",
      two: "{count} مشاركان",
      few: "{count} مشاركين",
      many: "{count} مشاركًا",
      other: "{count} مشارك",
    },
  },
  fa: {
    uniqueParticipantsCount: { other: "{count} شرکت‌کننده منحصربه‌فرد" },
    participationsCount: { other: "{count} مشارکت در گفتگوها" },
    activitiesCount: { other: "{count} فعالیت" },
    votesCount: { other: "{count} رأی" },
    statementsCount: { other: "{count} گزاره" },
    participantsCount: { other: "{count} شرکت‌کننده" },
  },
  he: {
    uniqueParticipantsCount: {
      one: "{count} משתתף ייחודי",
      other: "{count} משתתפים ייחודיים",
    },
    participationsCount: {
      one: "{count} השתתפות בשיחות",
      other: "{count} השתתפויות בשיחות",
    },
    activitiesCount: { one: "{count} פעילות", other: "{count} פעילויות" },
    votesCount: { one: "{count} הצבעה", other: "{count} הצבעות" },
    statementsCount: { one: "{count} הצהרה", other: "{count} הצהרות" },
    participantsCount: { one: "{count} משתתף", other: "{count} משתתפים" },
  },
  ky: {
    uniqueParticipantsCount: { other: "{count} уникалдуу катышуучу" },
    participationsCount: { other: "{count} талкууга катышуу" },
    activitiesCount: { other: "{count} иш-чара" },
    votesCount: { other: "{count} добуш" },
    statementsCount: { other: "{count} пикир" },
    participantsCount: { other: "{count} катышуучу" },
  },
  ru: {
    uniqueParticipantsCount: {
      one: "{count} уникальный участник",
      few: "{count} уникальных участника",
      many: "{count} уникальных участников",
      other: "{count} уникального участника",
    },
    participationsCount: {
      one: "{count} участие в обсуждениях",
      few: "{count} участия в обсуждениях",
      many: "{count} участий в обсуждениях",
      other: "{count} участия в обсуждениях",
    },
    activitiesCount: {
      one: "{count} активность",
      few: "{count} активности",
      many: "{count} активностей",
      other: "{count} активности",
    },
    votesCount: {
      one: "{count} голос",
      few: "{count} голоса",
      many: "{count} голосов",
      other: "{count} голоса",
    },
    statementsCount: {
      one: "{count} высказывание",
      few: "{count} высказывания",
      many: "{count} высказываний",
      other: "{count} высказывания",
    },
    participantsCount: {
      one: "{count} участник",
      few: "{count} участника",
      many: "{count} участников",
      other: "{count} участника",
    },
  },
};

export function translateProjectPageText({
  languageCode,
  key,
  params = {},
}: {
  languageCode: string;
  key: keyof ProjectPageTranslations;
  params?: Readonly<Record<string, string | number>>;
}): string {
  const parsedLanguageCode =
    parseSupportedDisplayLanguageOrUndefined(languageCode);
  const fallbackLanguageCode: SupportedDisplayLanguageCodes = "en";
  const languageChain =
    parsedLanguageCode === undefined
      ? [fallbackLanguageCode]
      : [
          ...getDisplayLanguageFallbackChain({
            languageCode: parsedLanguageCode,
          }),
          fallbackLanguageCode,
        ];

  let translation = projectPageTranslations.en[key];
  let resolvedLanguageCode: SupportedDisplayLanguageCodes =
    fallbackLanguageCode;

  for (const nextLanguageCode of languageChain) {
    const nextTranslation = projectPageTranslations[nextLanguageCode]?.[key];
    if (nextTranslation !== undefined) {
      translation = nextTranslation;
      resolvedLanguageCode = nextLanguageCode;
      break;
    }
  }

  const countTranslation = getCountTranslation({
    count: params.count,
    key,
    languageChain,
  });
  if (countTranslation !== undefined) {
    translation = countTranslation;
  }

  for (const [paramKey, paramValue] of Object.entries(params)) {
    translation = translation.replace(
      new RegExp(`\\{${paramKey}\\}`, "g"),
      formatProjectPageParam({
        languageCode: resolvedLanguageCode,
        paramKey,
        paramValue,
      })
    );
  }

  return translation;
}

function getCountTranslation({
  count,
  key,
  languageChain,
}: {
  count: string | number | undefined;
  key: keyof ProjectPageTranslations;
  languageChain: readonly SupportedDisplayLanguageCodes[];
}): string | undefined {
  if (
    typeof count !== "number" ||
    !isPluralizableProjectPageTranslationKey(key)
  ) {
    return undefined;
  }

  for (const languageCode of languageChain) {
    const translations = projectPageCountTranslations[languageCode]?.[key];
    if (translations !== undefined) {
      const pluralCategory = getProjectPagePluralRules({ languageCode }).select(
        count
      );
      return translations[pluralCategory] ?? translations.other;
    }
  }

  return undefined;
}

function isPluralizableProjectPageTranslationKey(
  key: keyof ProjectPageTranslations
): key is PluralizableProjectPageTranslationKey {
  return key in pluralizableProjectPageTranslationKeys;
}

function formatProjectPageParam({
  languageCode,
  paramKey,
  paramValue,
}: {
  languageCode: SupportedDisplayLanguageCodes;
  paramKey: string;
  paramValue: string | number;
}): string {
  if (paramKey === "count" && typeof paramValue === "number") {
    return formatProjectPageNumber({ languageCode, value: paramValue });
  }

  return String(paramValue);
}

export function formatProjectPageNumber({
  languageCode,
  value,
}: {
  languageCode: string;
  value: number;
}): string {
  const parsedLanguageCode =
    parseSupportedDisplayLanguageOrUndefined(languageCode);
  return getProjectPageNumberFormatter({
    languageCode: parsedLanguageCode ?? "en",
  }).format(value);
}

const numberFormatters = new Map<string, Intl.NumberFormat>();
const pluralRules = new Map<string, Intl.PluralRules>();

function getProjectPageNumberFormatter({
  languageCode,
}: {
  languageCode: SupportedDisplayLanguageCodes;
}): Intl.NumberFormat {
  const existingFormatter = numberFormatters.get(languageCode);
  if (existingFormatter !== undefined) return existingFormatter;

  const formatter = new Intl.NumberFormat(languageCode);
  numberFormatters.set(languageCode, formatter);
  return formatter;
}

function getProjectPagePluralRules({
  languageCode,
}: {
  languageCode: SupportedDisplayLanguageCodes;
}): Intl.PluralRules {
  const existingRules = pluralRules.get(languageCode);
  if (existingRules !== undefined) return existingRules;

  const rules = new Intl.PluralRules(languageCode);
  pluralRules.set(languageCode, rules);
  return rules;
}
