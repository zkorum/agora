import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface CommentSortingSelectorTranslations {
  filterTitle: string;
  discover: string;
  discoverDescription: string;
  new: string;
  newDescription: string;
  moderationHistory: string;
  moderationHistoryDescription: string;
  hidden: string;
  hiddenDescription: string;
  myVotes: string;
  myVotesDescription: string;
  myStatements: string;
  myStatementsDescription: string;
}

export const commentSortingSelectorTranslations: Record<
  SupportedDisplayLanguageCodes,
  CommentSortingSelectorTranslations
> = {
  en: {
    filterTitle: "Filter statements by:",
    discover: "Discover",
    discoverDescription:
      "Diverse and emerging statements to assign you to a group and keep the analysis evolving",
    new: "New",
    newDescription: "Most recent statements",
    moderationHistory: "Moderation History",
    moderationHistoryDescription:
      "Moderated statements, kept for transparency but excluded from analysis",
    hidden: "Hidden",
    hiddenDescription: "Statements removed by moderators",
    myVotes: "My Votes",
    myVotesDescription: "Statements you've voted on",
    myStatements: "My statements",
    myStatementsDescription: "Statements you've submitted in this conversation",
  },
  de: {
    filterTitle: "Aussagen filtern nach:",
    discover: "Entdecken",
    discoverDescription:
      "Stimmen Sie über neue und unterschiedliche Aussagen ab. Ihre Stimmen helfen, Ihre Meinungsgruppe zu finden und die Analyse zu verfeinern.",
    new: "Neu",
    newDescription: "Neueste Aussagen",
    moderationHistory: "Moderationsverlauf",
    moderationHistoryDescription:
      "Moderierte Aussagen bleiben zur Nachvollziehbarkeit sichtbar, fließen aber nicht in die Analyse ein",
    hidden: "Versteckt",
    hiddenDescription: "Vom Moderationsteam entfernte Aussagen",
    myVotes: "Meine Stimmen",
    myVotesDescription: "Aussagen, über die Sie abgestimmt haben",
    myStatements: "Meine Aussagen",
    myStatementsDescription:
      "Aussagen, die Sie in dieser Diskussion eingereicht haben",
  },
  hi: {
    filterTitle: "कथन छाँटें:",
    discover: "खोजें",
    discoverDescription:
      "नए और अलग-अलग नज़रियों वाले कथनों पर मत दें। इससे आपका मत समूह पहचानने और विश्लेषण को बेहतर बनाने में मदद मिलती है।",
    new: "नया",
    newDescription: "सबसे हाल के कथन",
    moderationHistory: "मॉडरेशन का इतिहास",
    moderationHistoryDescription:
      "जिन कथनों पर मॉडरेशन हुआ है, वे पारदर्शिता के लिए दिखाई देते हैं, लेकिन विश्लेषण में शामिल नहीं होते",
    hidden: "छिपा हुआ",
    hiddenDescription: "मॉडरेटरों ने ये कथन हटा दिए हैं",
    myVotes: "मेरे मत",
    myVotesDescription: "वे कथन जिन पर आपने मतदान किया है",
    myStatements: "मेरे कथन",
    myStatementsDescription: "इस चर्चा में आपके द्वारा प्रस्तुत किए गए कथन",
  },
  ar: {
    filterTitle: "تصفية المقترحات حسب:",
    discover: "استكشف",
    discoverDescription:
      "مقترحات متنوعة وناشئة لتعيينك في مجموعة وإبقاء التحليل متطورًا",
    new: "جديد",
    newDescription: "أحدث المقترحات",
    moderationHistory: "تاريخ الإشراف",
    moderationHistoryDescription:
      "مقترحات خاضعة للإشراف، محفوظة من باب الشفافية لكنها مستبعدة من التحليل",
    hidden: "مخفي",
    hiddenDescription: "مقترحات أزالها المشرفون",
    myVotes: "أصواتي",
    myVotesDescription: "مقترحات صوّتَ عليها",
    myStatements: "مقترحاتي",
    myStatementsDescription: "المقترحات التي قدّمتها في هذه المحادثة",
  },
  es: {
    filterTitle: "Filtrar proposiciones por:",
    discover: "Descubrir",
    discoverDescription:
      "Proposiciones variadas y emergentes para asignarle a un grupo y mantener el análisis en evolución",
    new: "Nuevo",
    newDescription: "Proposiciones más recientes",
    moderationHistory: "Historial de moderación",
    moderationHistoryDescription:
      "Proposiciones moderadas, conservadas por transparencia pero excluidas del análisis",
    hidden: "Oculto",
    hiddenDescription: "Proposiciones eliminadas por moderadores",
    myVotes: "Mis Votos",
    myVotesDescription: "Proposiciones en las que ha votado",
    myStatements: "Mis proposiciones",
    myStatementsDescription:
      "Proposiciones que ha enviado en esta conversación",
  },
  fa: {
    filterTitle: "فیلتر گزاره‌ها بر اساس:",
    discover: "کشف",
    discoverDescription:
      "گزاره‌های متنوع و نوظهور برای اختصاص شما به یک گروه و تکامل تحلیل",
    new: "جدید",
    newDescription: "جدیدترین گزاره‌ها",
    moderationHistory: "تاریخچه مدیریت",
    moderationHistoryDescription:
      "گزاره‌های مدیریت‌شده، برای شفافیت نگهداری شده اما از تحلیل خارج شده‌اند",
    hidden: "پنهان",
    hiddenDescription: "گزاره‌هایی که توسط مدیران حذف شده‌اند",
    myVotes: "رأی‌های من",
    myVotesDescription: "گزاره‌هایی که به آنها رأی داده‌اید",
    myStatements: "گزاره‌های من",
    myStatementsDescription: "گزاره‌هایی که در این گفتگو ارسال کرده‌اید",
  },
  fr: {
    filterTitle: "Filtrer les propositions par :",
    discover: "Découvrir",
    discoverDescription:
      "Propositions variées et émergentes pour vous assigner à un groupe et faire évoluer l'analyse",
    new: "Nouveau",
    newDescription: "Propositions les plus récentes",
    moderationHistory: "Historique de modération",
    moderationHistoryDescription:
      "Propositions modérées, conservées par transparence mais exclues de l'analyse",
    hidden: "Masqué",
    hiddenDescription: "Propositions supprimées par les modérateurs",
    myVotes: "Mes Votes",
    myVotesDescription: "Propositions pour lesquelles vous avez voté",
    myStatements: "Mes propositions",
    myStatementsDescription:
      "Propositions que vous avez soumises dans cette conversation",
  },
  "zh-Hans": {
    filterTitle: "按以下方式筛选意见：",
    discover: "发现",
    discoverDescription: "多元与新兴意见，帮助将您分配到群组并推动分析持续演进",
    new: "最新",
    newDescription: "最新的意见",
    moderationHistory: "审核历史",
    moderationHistoryDescription: "已审核的意见，为透明保留但不参与分析",
    hidden: "已隐藏",
    hiddenDescription: "被管理员移除的意见",
    myVotes: "我的投票",
    myVotesDescription: "你已投票的意见",
    myStatements: "我的意见",
    myStatementsDescription: "你在此对话中提交的意见",
  },
  "zh-Hant": {
    filterTitle: "按以下方式篩選意見：",
    discover: "發現",
    discoverDescription: "多元與新興意見，幫助將您分配到群組並推動分析持續演進",
    new: "最新",
    newDescription: "最新的意見",
    moderationHistory: "審核歷史",
    moderationHistoryDescription: "已審核的意見，為透明保留但不參與分析",
    hidden: "已隱藏",
    hiddenDescription: "被管理員移除的意見",
    myVotes: "我的投票",
    myVotesDescription: "你已投票的意見",
    myStatements: "我的意見",
    myStatementsDescription: "你在此對話中提交的意見",
  },
  he: {
    filterTitle: "סינון הצהרות לפי:",
    discover: "גילוי",
    discoverDescription:
      "הצהרות מגוונות ומתפתחות לשיוך לקבוצה ולהתפתחות הניתוח",
    new: "חדש",
    newDescription: "ההצהרות האחרונות",
    moderationHistory: "היסטוריית מודרציה",
    moderationHistoryDescription:
      "הצהרות שעברו מודרציה, נשמרות לשקיפות אך מוחרגות מהניתוח",
    hidden: "מוסתר",
    hiddenDescription: "הצהרות שהוסרו על ידי מנהלים",
    myVotes: "ההצבעות שלי",
    myVotesDescription: "הצהרות שהצבעת עליהן",
    myStatements: "ההצהרות שלי",
    myStatementsDescription: "הצהרות ששלחת בשיחה הזו",
  },
  ja: {
    filterTitle: "意見を以下でフィルター：",
    discover: "発見",
    discoverDescription:
      "多様な意見や新たな意見で、グループへの割り当てと分析の進化を促します",
    new: "新着",
    newDescription: "最新の意見",
    moderationHistory: "モデレーション履歴",
    moderationHistoryDescription:
      "モデレート済みの意見。透明性のため保持されますが、分析からは除外されます",
    hidden: "非表示",
    hiddenDescription: "モデレーターが削除した意見",
    myVotes: "自分の投票",
    myVotesDescription: "投票した意見",
    myStatements: "自分の意見",
    myStatementsDescription: "この会話で投稿した意見",
  },
  ky: {
    filterTitle: "Пикирлерди чыпкалоо:",
    discover: "Изилдөө",
    discoverDescription:
      "Сизди топко дайындоо жана анализди өнүктүрүү үчүн ар түрдүү жана жаңы пикирлер",
    new: "Жаңы",
    newDescription: "Эң акыркы пикирлер",
    moderationHistory: "Модерация тарыхы",
    moderationHistoryDescription:
      "Модерацияланган пикирлер, ачыктык үчүн сакталган бирок анализден чыгарылган",
    hidden: "Жашырылган",
    hiddenDescription: "Модераторлор тарабынан алынып салынган пикирлер",
    myVotes: "Менин добуштарым",
    myVotesDescription: "Добуш берген пикирлериңиз",
    myStatements: "Менин пикирлерим",
    myStatementsDescription: "Бул баарлашууда жөнөткөн пикирлериңиз",
  },
  ru: {
    filterTitle: "Фильтр высказываний:",
    discover: "Обзор",
    discoverDescription:
      "Разнообразные и новые высказывания для определения вашей группы и развития анализа",
    new: "Новые",
    newDescription: "Самые последние высказывания",
    moderationHistory: "История модерации",
    moderationHistoryDescription:
      "Модерированные высказывания, сохранённые для прозрачности, но исключённые из анализа",
    hidden: "Скрытые",
    hiddenDescription: "Высказывания, удалённые модераторами",
    myVotes: "Мои голоса",
    myVotesDescription: "Высказывания, по которым вы голосовали",
    myStatements: "Мои высказывания",
    myStatementsDescription: "Высказывания, которые вы отправили в этой беседе",
  },
};
