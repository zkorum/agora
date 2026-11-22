import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ComparisonResultsTabTranslations {
  title: string;
  noResults: string;
  noItems: string;
  subtitle: string;
  scoreScaleExplanation: string;
  loadingError: string;
  retryButton: string;
  communityLearnMoreHow: string;
  communityLearnMoreDiversity: string;
  communityLearnMoreSourceManual: string;
  communityLearnMoreSourceGitHub: string;
  communityLearnMoreReference: string;
  meLearnMorePersonal: string;
  meLearnMoreCounts: string;
  tabSummary: string;
  tabMe: string;
  tabResults: string;
  tabCompleted: string;
  tabCanceled: string;
  meTitle: string;
  meSubtitle: string;
  meVotesCounted: string;
  meProgress: string;
  meStartVoting: string;
  meKeepVoting: string;
  completedLearnMoreManual: string;
  completedLearnMoreGitHub: string;
  canceledLearnMoreManual: string;
  canceledLearnMoreGitHub: string;
}

export const comparisonResultsTabTranslations: Record<
  SupportedDisplayLanguageCodes,
  ComparisonResultsTabTranslations
> = {
  en: {
    title: "Community Ranking",
    noResults: "No ranking is available for this result.",
    noItems: "No items in this category.",
    subtitle: "Based on the comparisons included in this result",
    scoreScaleExplanation:
      "Scores use a fixed scale from 0 to 100. Small differences stay small instead of stretching every ranking to fill the bars. These scores are not percentages of participants.",
    loadingError: "Failed to load results.",
    retryButton: "Try again",
    communityLearnMoreHow:
      "Solidago combines the included comparisons into a community ranking. Updated rankings appear when calculation finishes.",
    communityLearnMoreDiversity:
      "Items are presented in randomized groups to prevent position bias. Indirect comparisons are inferred to minimize voting rounds.",
    communityLearnMoreSourceManual:
      "Items are added by the conversation facilitator and can grow over time. New items join the voting pool as they are added.",
    communityLearnMoreSourceGitHub:
      "Items are synced from GitHub issues with the configured label. New issues are automatically added to the voting pool when labeled.",
    communityLearnMoreReference: "Learn more:",
    meLearnMorePersonal:
      "Your ranking is based solely on the comparisons you've made. Once you compare enough statements, a complete personal ranking emerges.",
    meLearnMoreCounts:
      "Your saved comparisons can contribute to the community ranking even before your personal ranking is complete.",
    tabSummary: "Summary",
    tabMe: "Me",
    tabResults: "Results",
    tabCompleted: "Completed",
    tabCanceled: "Canceled",
    meTitle: "My Ranking",
    meSubtitle: "Your personal ranking based on your comparisons",
    meVotesCounted: "Your comparisons have been saved.",
    meProgress: "{percent} complete · {votes} votes cast",
    meStartVoting: "Start voting to unlock your ranking",
    meKeepVoting: "Keep voting to unlock your full ranking",
    completedLearnMoreManual:
      "Items marked as completed by the conversation facilitator. Their ranking score was frozen at the time of completion.",
    completedLearnMoreGitHub:
      "GitHub issues closed as completed. Their ranking score was frozen when the issue was closed on GitHub.",
    canceledLearnMoreManual:
      "Items that were canceled or removed. Their ranking score was frozen at the time of cancellation.",
    canceledLearnMoreGitHub:
      "GitHub issues closed as not planned, or with the tracking label removed. Their ranking score was frozen at that time.",
  },
  ar: {
    title: "تصنيف المجتمع",
    noResults: "لا يوجد ترتيب متاح لهذه النتيجة.",
    subtitle: "استنادًا إلى المقارنات المشمولة في هذه النتيجة",
    scoreScaleExplanation:
      "تستخدم الدرجات مقياسًا ثابتًا من 0 إلى 100. تبقى الفروق الصغيرة صغيرة بدلًا من تمديد كل ترتيب لملء الأشرطة. هذه الدرجات ليست نسبًا مئوية للمشاركين.",
    loadingError: "فشل تحميل النتائج.",
    retryButton: "حاول مرة أخرى",
    communityLearnMoreHow:
      "يجمع Solidago المقارنات المشمولة لإعداد ترتيب جماعي. يظهر الترتيب المحدّث عند اكتمال الحساب.",
    communityLearnMoreDiversity:
      "تُعرض العناصر في مجموعات عشوائية لمنع التحيز الموضعي. تُستنتج المقارنات غير المباشرة لتقليل جولات التصويت.",
    communityLearnMoreSourceManual:
      "يضيف مؤلف المحادثة العناصر ويمكن أن تنمو مع الوقت. تنضم العناصر الجديدة إلى مجموعة التصويت عند إضافتها.",
    communityLearnMoreSourceGitHub:
      "تتم مزامنة العناصر من مشكلات GitHub بالتسمية المحددة. تُضاف المشكلات الجديدة تلقائياً إلى مجموعة التصويت عند تسميتها.",
    communityLearnMoreReference: "اعرف المزيد:",
    meLearnMorePersonal:
      "ترتيبك مبني فقط على المقارنات التي أجريتها. بمجرد مقارنة عبارات كافية، يظهر ترتيب شخصي كامل.",
    meLearnMoreCounts:
      "يمكن أن تسهم مقارناتك المحفوظة في الترتيب الجماعي حتى قبل اكتمال ترتيبك الشخصي.",
    tabSummary: "ملخص",
    tabMe: "أنا",
    tabResults: "النتائج",
    tabCompleted: "مكتمل",
    tabCanceled: "ملغي",
    noItems: "لا توجد عناصر في هذه الفئة.",
    meTitle: "ترتيبي",
    meSubtitle: "ترتيبك الشخصي بناءً على مقارناتك",
    meVotesCounted: "حُفظت مقارناتك.",
    meProgress: "{percent} مكتمل · {votes} أصوات",
    meStartVoting: "ابدأ التصويت لفتح ترتيبك",
    meKeepVoting: "واصل التصويت لفتح ترتيبك الكامل",
    completedLearnMoreManual:
      "العناصر التي وضع ميسّر المحادثة علامة مكتملة عليها. جُمّدت نتيجة ترتيبها عند اكتمالها.",
    completedLearnMoreGitHub:
      "مشكلات GitHub التي أُغلقت باعتبارها مكتملة. جُمّدت نتيجة ترتيبها عند إغلاق المشكلة على GitHub.",
    canceledLearnMoreManual:
      "العناصر التي أُلغيت أو أُزيلت. جُمّدت نتيجة ترتيبها عند إلغائها.",
    canceledLearnMoreGitHub:
      "مشكلات GitHub التي أُغلقت باعتبارها غير مخططة، أو التي أُزيلت منها تسمية التتبع. جُمّدت نتيجة ترتيبها في ذلك الوقت.",
  },
  es: {
    title: "Clasificación de la comunidad",
    noResults: "No hay una clasificación disponible para este resultado.",
    subtitle: "Basada en las comparaciones incluidas en este resultado",
    scoreScaleExplanation:
      "Las puntuaciones usan una escala fija de 0 a 100. Las diferencias pequeñas siguen siendo pequeñas, en lugar de ampliar cada clasificación para llenar las barras. No son porcentajes de participantes.",
    loadingError: "Error al cargar los resultados.",
    retryButton: "Intentar de nuevo",
    communityLearnMoreHow:
      "Solidago combina las comparaciones incluidas para obtener una clasificación colectiva. La clasificación se actualiza al terminar el cálculo.",
    communityLearnMoreDiversity:
      "Los elementos se presentan en grupos aleatorios para evitar sesgo de posicion. Se infieren comparaciones indirectas para minimizar rondas de votacion.",
    communityLearnMoreSourceManual:
      "Los elementos son añadidos por el autor de la conversación y pueden crecer con el tiempo. Los nuevos elementos se unen al grupo de votación al ser añadidos.",
    communityLearnMoreSourceGitHub:
      "Los elementos se sincronizan desde issues de GitHub con la etiqueta configurada. Los nuevos issues se añaden automáticamente al grupo de votación al ser etiquetados.",
    communityLearnMoreReference: "Más información:",
    meLearnMorePersonal:
      "Su clasificación se basa únicamente en las comparaciones que ha hecho. Una vez que compare suficientes declaraciones, emerge una clasificación personal completa.",
    meLearnMoreCounts:
      "Tus comparaciones guardadas pueden contribuir a la clasificación colectiva aunque aún no hayas completado la tuya.",
    tabSummary: "Resumen",
    tabMe: "Yo",
    tabResults: "Resultados",
    tabCompleted: "Completado",
    tabCanceled: "Cancelado",
    noItems: "No hay elementos en esta categoría.",
    meTitle: "Mi clasificación",
    meSubtitle: "Su ordenamiento personal basado en sus comparaciones",
    meVotesCounted: "Tus comparaciones se han guardado.",
    meProgress: "{percent} completo · {votes} votos emitidos",
    meStartVoting: "Empiece a votar para desbloquear su clasificación",
    meKeepVoting: "Siga votando para desbloquear su clasificación completa",
    completedLearnMoreManual:
      "Elementos marcados como completados por el facilitador de la conversación. Su puntuación de clasificación se fijó al completarlos.",
    completedLearnMoreGitHub:
      "Incidencias de GitHub cerradas como completadas. Su puntuación de clasificación se fijó al cerrar la incidencia en GitHub.",
    canceledLearnMoreManual:
      "Elementos cancelados o eliminados. Su puntuación de clasificación se fijó al cancelarlos.",
    canceledLearnMoreGitHub:
      "Incidencias de GitHub cerradas como no planificadas o cuya etiqueta de seguimiento se eliminó. Su puntuación de clasificación se fijó en ese momento.",
  },
  fa: {
    title: "رتبه‌بندی جامعه",
    noResults: "برای این نتیجه رتبه‌بندی در دسترس نیست.",
    noItems: "موردی در این دسته‌بندی وجود ندارد.",
    subtitle: "بر اساس مقایسه‌های منظورشده در این نتیجه",
    scoreScaleExplanation:
      "امتیازها از مقیاس ثابت ۰ تا ۱۰۰ استفاده می‌کنند. تفاوت‌های کوچک کوچک می‌مانند و هر رتبه‌بندی برای پر کردن نوارها کشیده نمی‌شود. این امتیازها درصد شرکت‌کنندگان نیستند.",
    loadingError: "بارگذاری نتایج ناموفق بود.",
    retryButton: "دوباره تلاش کنید",
    communityLearnMoreHow:
      "Solidago مقایسه‌های منظورشده را ترکیب می‌کند تا رتبه‌بندی جمعی به دست آید. رتبه‌بندی جدید پس از پایان محاسبه نمایش داده می‌شود.",
    communityLearnMoreDiversity:
      "گزاره‌ها در گروه‌های تصادفی ارائه می‌شوند تا از تعصب موقعیتی جلوگیری شود. مقایسه‌های غیرمستقیم استنتاج می‌شوند تا دورهای رأی‌گیری کمینه شوند.",
    communityLearnMoreSourceManual:
      "موارد توسط نویسنده گفتگو اضافه می‌شوند و می‌توانند در طول زمان رشد کنند. موارد جدید هنگام اضافه شدن به مجموعه رأی‌گیری می‌پیوندند.",
    communityLearnMoreSourceGitHub:
      "موارد از ایشوهای GitHub با برچسب پیکربندی شده همگام‌سازی می‌شوند. ایشوهای جدید هنگام برچسب‌گذاری به صورت خودکار به مجموعه رأی‌گیری اضافه می‌شوند.",
    communityLearnMoreReference: "اطلاعات بیشتر:",
    meLearnMorePersonal:
      "رتبه‌بندی شما صرفاً بر اساس مقایسه‌هایی است که انجام داده‌اید. وقتی گزاره‌های کافی را مقایسه کنید، یک رتبه‌بندی شخصی کامل ظاهر می‌شود.",
    meLearnMoreCounts:
      "حتی پیش از کامل شدن رتبه‌بندی شخصی، مقایسه‌های ذخیره‌شدهٔ شما می‌توانند در رتبه‌بندی جمعی نقش داشته باشند.",
    tabSummary: "خلاصه",
    tabMe: "من",
    tabResults: "نتایج",
    tabCompleted: "تکمیل شده",
    tabCanceled: "لغو شده",
    meTitle: "رتبه‌بندی من",
    meSubtitle: "ترتیب شخصی شما بر اساس مقایسه‌هایتان",
    meVotesCounted: "مقایسه‌هایتان ذخیره شد.",
    meProgress: "{percent} کامل · {votes} رأی",
    meStartVoting: "برای باز کردن رتبه‌بندی خود رأی‌گیری را شروع کنید",
    meKeepVoting: "برای باز کردن رتبه‌بندی کامل به رأی‌گیری ادامه دهید",
    completedLearnMoreManual:
      "مواردی که توسط نویسنده گفتگو به عنوان تکمیل شده علامت‌گذاری شده‌اند. امتیاز رتبه‌بندی آنها در زمان تکمیل ثبت شده است.",
    completedLearnMoreGitHub:
      "ایشوهای GitHub که به عنوان تکمیل شده بسته شده‌اند. امتیاز رتبه‌بندی آنها هنگام بسته شدن ایشو در GitHub ثبت شده است.",
    canceledLearnMoreManual:
      "مواردی که لغو یا حذف شده‌اند. امتیاز رتبه‌بندی آنها در زمان لغو ثبت شده است.",
    canceledLearnMoreGitHub:
      "ایشوهای GitHub که به عنوان بدون برنامه بسته شده‌اند یا برچسب ردیابی آنها حذف شده است. امتیاز رتبه‌بندی آنها در آن زمان ثبت شده است.",
  },
  he: {
    title: "דירוג הקהילה",
    noResults: "אין דירוג זמין לתוצאה זו.",
    noItems: "אין פריטים בקטגוריה זו.",
    subtitle: "על סמך ההשוואות שנכללו בתוצאה זו",
    scoreScaleExplanation:
      "הציונים משתמשים בסולם קבוע מ־0 עד 100. הבדלים קטנים נשארים קטנים, במקום למתוח כל דירוג כדי למלא את הפסים. הציונים אינם אחוזים מהמשתתפים.",
    loadingError: "טעינת התוצאות נכשלה.",
    retryButton: "נסו שוב",
    communityLearnMoreHow:
      "Solidago משלב את ההשוואות שנכללו בדירוג הקבוצתי. הדירוג המעודכן מוצג כשהחישוב מסתיים.",
    communityLearnMoreDiversity:
      "פריטים מוצגים בקבוצות אקראיות למניעת הטיית מיקום. השוואות עקיפות מוסקות כדי למזער סיבובי הצבעה.",
    communityLearnMoreSourceManual:
      "פריטים מתווספים על ידי מחבר/ת השיחה ויכולים לגדול עם הזמן. פריטים חדשים מצטרפים למאגר ההצבעה עם הוספתם.",
    communityLearnMoreSourceGitHub:
      "פריטים מסונכרנים מ-issues של GitHub עם התווית המוגדרת. Issues חדשים מתווספים אוטומטית למאגר ההצבעה כשמתויגים.",
    communityLearnMoreReference: "מידע נוסף:",
    meLearnMorePersonal:
      "הדירוג שלכם מבוסס אך ורק על ההשוואות שביצעתם. ברגע שתשוו מספיק הצהרות, יופיע דירוג אישי מלא.",
    meLearnMoreCounts:
      "ההשוואות השמורות שלך יכולות להשפיע על הדירוג הקבוצתי עוד לפני השלמת הדירוג האישי.",
    tabSummary: "סיכום",
    tabMe: "אני",
    tabResults: "תוצאות",
    tabCompleted: "הושלם",
    tabCanceled: "בוטל",
    meTitle: "הדירוג שלי",
    meSubtitle: "הדירוג האישי שלכם על בסיס ההשוואות שלכם",
    meVotesCounted: "ההשוואות שלך נשמרו.",
    meProgress: "{percent} הושלם · {votes} הצבעות",
    meStartVoting: "התחילו להצביע כדי לפתוח את הדירוג שלכם",
    meKeepVoting: "המשיכו להצביע כדי לפתוח את הדירוג המלא שלכם",
    completedLearnMoreManual:
      "פריטים שסומנו כהושלמו על ידי מחבר/ת השיחה. ציון הדירוג שלהם הוקפא בעת ההשלמה.",
    completedLearnMoreGitHub:
      "Issues ב-GitHub שנסגרו כהושלמו. ציון הדירוג שלהם הוקפא כשה-issue נסגר ב-GitHub.",
    canceledLearnMoreManual:
      "פריטים שבוטלו או הוסרו. ציון הדירוג שלהם הוקפא בעת הביטול.",
    canceledLearnMoreGitHub:
      "Issues ב-GitHub שנסגרו כלא מתוכננים, או שתווית המעקב הוסרה. ציון הדירוג שלהם הוקפא באותו זמן.",
  },
  fr: {
    title: "Classement de la communauté",
    noResults: "Aucun classement disponible pour ce résultat.",
    subtitle: "D’après les comparaisons prises en compte dans ce résultat",
    scoreScaleExplanation:
      "Les scores utilisent une échelle fixe de 0 à 100. Les petits écarts restent petits, au lieu d’étirer chaque classement pour remplir les barres. Ces scores ne sont pas des pourcentages de participants.",
    loadingError: "Échec du chargement des résultats.",
    retryButton: "Réessayer",
    communityLearnMoreHow:
      "Solidago combine les comparaisons prises en compte pour établir le classement collectif. Le classement est actualisé une fois le calcul terminé.",
    communityLearnMoreDiversity:
      "Les éléments sont présentés dans des groupes aléatoires pour éviter le biais de position. Les comparaisons indirectes sont déduites pour minimiser les tours de vote.",
    communityLearnMoreSourceManual:
      "Les éléments sont ajoutés par l'auteur de la conversation et peuvent augmenter avec le temps. Les nouveaux éléments rejoignent le pool de vote dès leur ajout.",
    communityLearnMoreSourceGitHub:
      "Les éléments sont synchronisés depuis les issues GitHub avec le label configuré. Les nouvelles issues sont automatiquement ajoutées au pool de vote lors du labeling.",
    communityLearnMoreReference: "En savoir plus :",
    meLearnMorePersonal:
      "Votre classement est basé uniquement sur les comparaisons que vous avez effectuées. Une fois suffisamment de propositions comparées, un classement personnel complet émerge.",
    meLearnMoreCounts:
      "Vos comparaisons enregistrées peuvent contribuer au classement collectif avant même que votre classement personnel soit complet.",
    tabSummary: "Résumé",
    tabMe: "Moi",
    tabResults: "Résultats",
    tabCompleted: "Terminé",
    tabCanceled: "Annulé",
    noItems: "Aucun élément dans cette catégorie.",
    meTitle: "Mon classement",
    meSubtitle: "Votre classement personnel basé sur vos comparaisons",
    meVotesCounted: "Vos comparaisons ont été enregistrées.",
    meProgress: "{percent} terminé · {votes} votes",
    meStartVoting: "Commencez à voter pour débloquer votre classement",
    meKeepVoting: "Continuez à voter pour débloquer votre classement complet",
    completedLearnMoreManual:
      "Éléments marqués comme terminés par le facilitateur de la conversation. Leur score de classement a été figé au moment de leur achèvement.",
    completedLearnMoreGitHub:
      "Issues GitHub fermées comme terminées. Leur score de classement a été figé lors de la fermeture de l'issue sur GitHub.",
    canceledLearnMoreManual:
      "Éléments annulés ou supprimés. Leur score de classement a été figé au moment de leur annulation.",
    canceledLearnMoreGitHub:
      "Issues GitHub fermées comme non planifiées, ou dont le label de suivi a été supprimé. Leur score de classement a été figé à ce moment-là.",
  },
  "zh-Hans": {
    title: "社区排名",
    noResults: "此结果暂无排名。",
    subtitle: "基于此结果所计入的比较",
    scoreScaleExplanation:
      "评分采用固定的 0–100 刻度。小差异仍然保持较小，不会为了填满条形图而拉伸每个排名。这些评分不是参与者的百分比。",
    loadingError: "加载结果失败。",
    retryButton: "重试",
    communityLearnMoreHow:
      "Solidago 汇总纳入计算的比较，生成集体排名。新排名会在计算完成后显示。",
    communityLearnMoreDiversity:
      "项目以随机分组呈现，防止位置偏差。间接比较会被推断以减少投票轮数。",
    communityLearnMoreSourceManual:
      "项目由对话作者添加，可随时间增长。新项目添加后即加入投票池。",
    communityLearnMoreSourceGitHub:
      "项目从带有配置标签的 GitHub 问题同步。新问题在添加标签时自动加入投票池。",
    communityLearnMoreReference: "了解更多：",
    meLearnMorePersonal:
      "您的排名仅基于您所做的比较。当您比较足够多的意见后，完整的个人排名将会出现。",
    meLearnMoreCounts: "即使个人排名尚未完成，已保存的比较也可计入集体排名。",
    tabSummary: "总结",
    tabMe: "我",
    tabResults: "结果",
    tabCompleted: "已完成",
    tabCanceled: "已取消",
    noItems: "此分类中没有项目。",
    meTitle: "我的排名",
    meSubtitle: "基于您的比较的个人排名",
    meVotesCounted: "您的比较已保存。",
    meProgress: "{percent} 完成 · {votes} 票",
    meStartVoting: "开始投票以解锁您的排名",
    meKeepVoting: "继续投票以解锁完整排名",
    completedLearnMoreManual:
      "由对话作者标记为已完成的项目。其排名分数在完成时被冻结。",
    completedLearnMoreGitHub:
      "在 GitHub 上关闭为已完成的 issue。其排名分数会在 issue 于 GitHub 关闭时被冻结。",
    canceledLearnMoreManual: "已取消或移除的项目。其排名分数在取消时被冻结。",
    canceledLearnMoreGitHub:
      "关闭为 not planned 或移除追踪标签的 GitHub issue。其排名分数会在当时被冻结。",
  },
  "zh-Hant": {
    title: "社群排名",
    noResults: "此結果目前沒有排名。",
    subtitle: "依據此結果所計入的比較",
    scoreScaleExplanation:
      "評分採用固定的 0–100 刻度。小差異仍然保持較小，不會為了填滿長條圖而拉伸每個排名。這些評分不是參與者的百分比。",
    loadingError: "載入結果失敗。",
    retryButton: "重試",
    communityLearnMoreHow:
      "Solidago 彙整納入計算的比較，產生集體排名。新排名會在計算完成後顯示。",
    communityLearnMoreDiversity:
      "項目以隨機分組呈現，防止位置偏差。間接比較會被推斷以減少投票輪數。",
    communityLearnMoreSourceManual:
      "項目由對話作者添加，可隨時間增長。新項目添加後即加入投票池。",
    communityLearnMoreSourceGitHub:
      "項目從帶有配置標籤的 GitHub 問題同步。新問題在添加標籤時自動加入投票池。",
    communityLearnMoreReference: "了解更多：",
    meLearnMorePersonal:
      "您的排名僅基於您所做的比較。當您比較足夠多的意見後，完整的個人排名將會出現。",
    meLearnMoreCounts: "即使個人排名尚未完成，已儲存的比較仍可計入集體排名。",
    tabSummary: "總結",
    tabMe: "我",
    tabResults: "結果",
    tabCompleted: "已完成",
    tabCanceled: "已取消",
    noItems: "此分類中沒有項目。",
    meTitle: "我的排名",
    meSubtitle: "基於您的比較的個人排名",
    meVotesCounted: "您的比較已儲存。",
    meProgress: "{percent} 完成 · {votes} 票",
    meStartVoting: "開始投票以解鎖您的排名",
    meKeepVoting: "繼續投票以解鎖完整排名",
    completedLearnMoreManual:
      "由對話作者標記為已完成的項目。其排名分數在完成時被凍結。",
    completedLearnMoreGitHub:
      "在 GitHub 上關閉為已完成的 issue。其排名分數會在 issue 於 GitHub 關閉時被凍結。",
    canceledLearnMoreManual: "已取消或移除的項目。其排名分數在取消時被凍結。",
    canceledLearnMoreGitHub:
      "關閉為 not planned 或移除追蹤標籤的 GitHub issue。其排名分數會在當時被凍結。",
  },
  ja: {
    title: "コミュニティランキング",
    noResults: "この結果には順位がありません。",
    subtitle: "この結果の集計対象となった比較に基づきます",
    scoreScaleExplanation:
      "スコアは0から100の固定尺度です。順位ごとに棒を引き伸ばさないため、小さな差は小さなまま表示されます。参加者の割合を表すものではありません。",
    loadingError: "結果の読み込みに失敗しました。",
    retryButton: "再試行",
    communityLearnMoreHow:
      "Solidago が集計対象の比較をまとめて全体の順位を算出します。新しい順位は計算が完了すると表示されます。",
    communityLearnMoreDiversity:
      "項目はランダムなグループで提示され、位置バイアスを防止します。間接比較も推論され、投票ラウンドを最小化します。",
    communityLearnMoreSourceManual:
      "アイテムは会話の作成者によって追加され、時間とともに増える可能性があります。新しいアイテムは追加時に投票プールに参加します。",
    communityLearnMoreSourceGitHub:
      "アイテムは設定されたラベルのGitHub issueから同期されます。新しいissueはラベル付け時に自動的に投票プールに追加されます。",
    communityLearnMoreReference: "詳しくはこちら：",
    meLearnMorePersonal:
      "あなたのランキングは、あなたが行った比較のみに基づいています。十分な意見を比較すると、完全な個人ランキングが表示されます。",
    meLearnMoreCounts:
      "個人の順位付けが完了する前でも、保存した比較は全体の順位に反映されることがあります。",
    tabSummary: "サマリー",
    tabMe: "私",
    tabResults: "結果",
    tabCompleted: "完了",
    tabCanceled: "キャンセル",
    noItems: "このカテゴリにはアイテムがありません。",
    meTitle: "マイランキング",
    meSubtitle: "あなたの比較に基づく個人ランキング",
    meVotesCounted: "比較を保存しました。",
    meProgress: "{percent} 完了 · {votes} 票",
    meStartVoting: "投票を始めてランキングを解除",
    meKeepVoting: "投票を続けてフルランキングを解除",
    completedLearnMoreManual:
      "会話の作成者が完了済みとしてマークした項目です。ランキングスコアは完了時点で固定されています。",
    completedLearnMoreGitHub:
      "GitHub で完了として閉じられた issue です。ランキングスコアは GitHub 上で issue が閉じられた時点で固定されています。",
    canceledLearnMoreManual:
      "キャンセルまたは削除された項目です。ランキングスコアはキャンセル時点で固定されています。",
    canceledLearnMoreGitHub:
      "not planned として閉じられた、または追跡ラベルが削除された GitHub issue です。ランキングスコアはその時点で固定されています。",
  },
  ky: {
    title: "Коомдук рейтинг",
    noResults: "Бул жыйынтык үчүн рейтинг жок.",
    subtitle: "Ушул жыйынтыкка кирген салыштыруулар боюнча",
    scoreScaleExplanation:
      "Упайлар 0дөн 100гө чейинки туруктуу шкаланы колдонот. Ар бир рейтинг тилкелерди толтуруу үчүн созулбайт, ошондуктан кичине айырмачылыктар кичине бойдон калат. Бул упайлар катышуучулардын пайызын билдирбейт.",
    loadingError: "Натыйжаларды жүктөө ишке ашкан жок.",
    retryButton: "Кайра аракет кылуу",
    communityLearnMoreHow:
      "Solidago эсепке кирген салыштыруулардан жалпы рейтинг түзөт. Жаңыртылган рейтинг эсептөө аяктаганда көрүнөт.",
    communityLearnMoreDiversity:
      "Элементтер позициялык калыстыксыздыкты алдын алуу үчүн кокустук топтордо берилет. Кыйыр салыштыруулар добуш берүү раунддарын азайтуу үчүн чыгарылат.",
    communityLearnMoreSourceManual:
      "Элементтер талкуунун фасилитатору тарабынан кошулат жана убакыт өткөн сайын көбөйүшү мүмкүн. Жаңы элементтер кошулганда добуш берүү тизмесине кирет.",
    communityLearnMoreSourceGitHub:
      "Элементтер конфигурацияланган энбелгиси бар GitHub маселелеринен синхрондолот. Жаңы маселелер белгиленгенде автоматтык түрдө добуш берүү тизмесине кирет.",
    communityLearnMoreReference: "Көбүрөөк билүү:",
    meLearnMorePersonal:
      "Сиздин рейтингиңиз сиз жасаган салыштырууларга гана негизделген. Жетиштүү пикирлерди салыштырганда, толук жеке рейтинг пайда болот.",
    meLearnMoreCounts:
      "Жеке рейтингиңиз толуктала электе эле сакталган салыштырууларыңыз жалпы рейтингге кошулушу мүмкүн.",
    tabSummary: "Кыскача",
    tabMe: "Мен",
    tabResults: "Натыйжалар",
    tabCompleted: "Аяктаган",
    tabCanceled: "Жокко чыгарылган",
    noItems: "Бул категорияда элементтер жок.",
    meTitle: "Менин рейтингим",
    meSubtitle: "Сиздин салыштырууларыңызга негизделген жеке рейтинг",
    meVotesCounted: "Салыштырууларыңыз сакталды.",
    meProgress: "{percent} аяктаган · {votes} добуш",
    meStartVoting: "Рейтингди ачуу үчүн добуш берүүнү баштаңыз",
    meKeepVoting: "Толук рейтингди ачуу үчүн добуш берүүнү улантыңыз",
    completedLearnMoreManual:
      "Талкуунун фасилитатору аяктады деп белгилеген элементтер. Алардын рейтингдик упайы аяктаган учурда бекитилген.",
    completedLearnMoreGitHub:
      "GitHub'да аяктады деп жабылган маселелер. Алардын рейтингдик упайы маселе GitHub'да жабылган учурда бекитилген.",
    canceledLearnMoreManual:
      "Жокко чыгарылган же алынып салынган элементтер. Алардын рейтингдик упайы жокко чыгарылган учурда бекитилген.",
    canceledLearnMoreGitHub:
      "GitHub'да пландалган эмес деп жабылган же көз салуу энбелгиси алынып салынган маселелер. Алардын рейтингдик упайы ошол учурда бекитилген.",
  },
  ru: {
    title: "Рейтинг сообщества",
    noResults: "Для этого результата рейтинг недоступен.",
    subtitle: "По сравнениям, учтённым в этом результате",
    scoreScaleExplanation:
      "Оценки используют фиксированную шкалу от 0 до 100. Небольшие различия остаются небольшими: каждый рейтинг не растягивается до полной длины полос. Это не процент участников.",
    loadingError: "Не удалось загрузить результаты.",
    retryButton: "Попробовать ещё раз",
    communityLearnMoreHow:
      "Solidago объединяет учтённые сравнения в общий рейтинг. Обновлённый рейтинг появляется после завершения расчёта.",
    communityLearnMoreDiversity:
      "Элементы представляются в рандомизированных группах для предотвращения позиционного смещения. Косвенные сравнения выводятся автоматически для минимизации раундов голосования.",
    communityLearnMoreSourceManual:
      "Элементы добавляются фасилитатором обсуждения, и со временем их может становиться больше. Новые элементы включаются в список для голосования при добавлении.",
    communityLearnMoreSourceGitHub:
      "Элементы синхронизируются из задач GitHub с настроенной меткой. Новые задачи автоматически включаются в список для голосования при добавлении метки.",
    communityLearnMoreReference: "Подробнее:",
    meLearnMorePersonal:
      "Ваш рейтинг основан исключительно на сделанных вами сравнениях. Когда вы сравните достаточно высказываний, появится полный личный рейтинг.",
    meLearnMoreCounts:
      "Сохранённые сравнения могут учитываться в общем рейтинге, даже если ваш личный рейтинг ещё не готов.",
    tabSummary: "Обзор",
    tabMe: "Я",
    tabResults: "Результаты",
    tabCompleted: "Завершённые",
    tabCanceled: "Отменённые",
    noItems: "В этой категории нет элементов.",
    meTitle: "Мой рейтинг",
    meSubtitle: "Ваш личный рейтинг на основе ваших сравнений",
    meVotesCounted: "Ваши сравнения сохранены.",
    meProgress: "Завершено: {percent} · голосов: {votes}",
    meStartVoting: "Начните голосовать, чтобы разблокировать ваш рейтинг",
    meKeepVoting: "Продолжайте голосовать, чтобы разблокировать полный рейтинг",
    completedLearnMoreManual:
      "Элементы, которые фасилитатор обсуждения отметил как завершённые. Их рейтинговая оценка была зафиксирована в момент завершения.",
    completedLearnMoreGitHub:
      "Задачи GitHub, закрытые как выполненные. Их рейтинговая оценка была зафиксирована при закрытии задачи в GitHub.",
    canceledLearnMoreManual:
      "Отменённые или удалённые элементы. Их рейтинговая оценка была зафиксирована в момент отмены.",
    canceledLearnMoreGitHub:
      "Задачи GitHub, закрытые как незапланированные, или задачи, с которых снята отслеживаемая метка. Их рейтинговая оценка была зафиксирована в этот момент.",
  },
};
