import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface AnalysisReportTranslations {
  summary: string;
  agreements: string;
  disagreements: string;
  divisive: string;
  surveyTitle: string;
  surveyOverallLabel: string;
  agreementsLong: string;
  disagreementsLong: string;
  divisiveLong: string;
  surveySubtitle: string;
  surveyGroupSubtitle: string;
  agreementsSubtitle: string;
  disagreementsSubtitle: string;
  divisiveSubtitle: string;
  noAgreementsMessage: string;
  noDisagreementsMessage: string;
  noDivisiveMessage: string;
  noSurveyResultsMessage: string;
  suppressed: string;
}

export const analysisReportTranslations: Record<
  SupportedDisplayLanguageCodes,
  AnalysisReportTranslations
> = {
  en: {
    summary: "Summary",
    agreements: "Approved",
    disagreements: "Rejected",
    divisive: "Divisive",
    surveyTitle: "Survey",
    surveyOverallLabel: "Overall",
    agreementsLong: "Which statements are approved by all groups?",
    disagreementsLong: "Which statements are rejected by all groups?",
    divisiveLong: "What divides people across groups?",
    surveySubtitle:
      "See how each survey question is answered overall or within each opinion group.",
    surveyGroupSubtitle: "Only responses from this opinion group are included here.",
    agreementsSubtitle:
      "Cross-group consensus, not simple majority. Only the most statistically significant are shown.",
    disagreementsSubtitle:
      "Cross-group consensus, not simple majority. Only the most statistically significant are shown.",
    divisiveSubtitle:
      "Statements that split opinion groups against each other. Only the most statistically significant are shown.",
    noAgreementsMessage: "No consensus has emerged yet.",
    noDisagreementsMessage: "No consensus has emerged yet.",
    noDivisiveMessage: "No significant divisive statements found yet.",
    noSurveyResultsMessage: "No survey results are available yet.",
    suppressed: "Suppressed",
  },
  ar: {
    summary: "ملخص",
    agreements: "معتمدة",
    disagreements: "مرفوضة",
    divisive: "مثير للجدل",
    surveyTitle: "الاستبيان",
    surveyOverallLabel: "إجمالي",
    agreementsLong: "ما المقترحات المعتمدة من جميع المجموعات؟",
    disagreementsLong: "ما المقترحات المرفوضة من جميع المجموعات؟",
    divisiveLong: "ما الذي يقسم المشاركين عبر مجموعات الرأي؟",
    surveySubtitle:
      "اطّلع على إجابات كل سؤال في الاستبيان على مستوى الجميع أو داخل كل مجموعة رأي.",
    surveyGroupSubtitle: "تُعرض هنا فقط إجابات المشاركين ضمن مجموعة الرأي هذه.",
    agreementsSubtitle:
      "إجماع بين المجموعات وليس أغلبية بسيطة. تُعرض فقط الأكثر دلالة إحصائياً.",
    disagreementsSubtitle:
      "إجماع بين المجموعات وليس أغلبية بسيطة. تُعرض فقط الأكثر دلالة إحصائياً.",
    divisiveSubtitle:
      "مقترحات تفرّق مجموعات الرأي. تُعرض فقط الأكثر دلالة إحصائياً.",
    noAgreementsMessage: "لم يظهر أي إجماع بعد.",
    noDisagreementsMessage: "لم يظهر أي إجماع بعد.",
    noDivisiveMessage: "لم يتم العثور على مقترحات مثيرة للجدل ذات دلالة بعد.",
    noSurveyResultsMessage: "لا توجد نتائج استبيان متاحة بعد.",
    suppressed: "محجوب",
  },
  es: {
    summary: "Resumen",
    agreements: "Aprobados",
    disagreements: "Rechazados",
    divisive: "Divisivo",
    surveyTitle: "Encuesta",
    surveyOverallLabel: "General",
    agreementsLong: "¿Qué afirmaciones son aprobadas por todos los grupos?",
    disagreementsLong: "¿Qué afirmaciones son rechazadas por todos los grupos?",
    divisiveLong:
      "¿Qué divide a los participantes entre los grupos de opinión?",
    surveySubtitle:
      "Consulta cómo se responde cada pregunta de la encuesta en general o dentro de cada grupo de opinión.",
    surveyGroupSubtitle: "Aquí solo se incluyen las respuestas de este grupo de opinión.",
    agreementsSubtitle:
      "Consenso entre grupos, no una mayoría simple. Solo se muestran las más significativas estadísticamente.",
    disagreementsSubtitle:
      "Consenso entre grupos, no una mayoría simple. Solo se muestran las más significativas estadísticamente.",
    divisiveSubtitle:
      "Afirmaciones que dividen a los grupos de opinión entre sí. Solo se muestran las más significativas estadísticamente.",
    noAgreementsMessage: "Aún no ha surgido ningún consenso.",
    noDisagreementsMessage: "Aún no ha surgido ningún consenso.",
    noDivisiveMessage:
      "Aún no se encontraron proposiciones divisivas significativas.",
    noSurveyResultsMessage:
      "Todavía no hay resultados de la encuesta disponibles.",
    suppressed: "Suprimido",
  },
  fa: {
    summary: "خلاصه",
    agreements: "تأیید شده",
    disagreements: "رد شده",
    divisive: "اختلاف‌برانگیز",
    surveyTitle: "نظرسنجی",
    surveyOverallLabel: "کلی",
    agreementsLong: "کدام گزاره‌ها توسط همه گروه‌ها تأیید شده‌اند؟",
    disagreementsLong: "کدام گزاره‌ها توسط همه گروه‌ها رد شده‌اند؟",
    divisiveLong: "چه چیزی افراد را در بین گروه‌ها تفرقه می‌اندازد؟",
    surveySubtitle:
      "ببینید هر پرسش نظرسنجی به صورت کلی یا درون هر گروه نظر چگونه پاسخ داده شده است.",
    surveyGroupSubtitle: "فقط پاسخ‌های این گروه نظر در اینجا نشان داده می‌شود.",
    agreementsSubtitle:
      "اجماع بین‌گروهی، نه اکثریت ساده. فقط مهم‌ترین موارد از نظر آماری نمایش داده می‌شوند.",
    disagreementsSubtitle:
      "اجماع بین‌گروهی، نه اکثریت ساده. فقط مهم‌ترین موارد از نظر آماری نمایش داده می‌شوند.",
    divisiveSubtitle:
      "گزاره‌هایی که گروه‌های نظر را در برابر یکدیگر قرار می‌دهند. فقط مهم‌ترین موارد از نظر آماری نمایش داده می‌شوند.",
    noAgreementsMessage: "هنوز اجماعی شکل نگرفته است.",
    noDisagreementsMessage: "هنوز اجماعی شکل نگرفته است.",
    noDivisiveMessage: "هنوز گزاره اختلاف‌برانگیز مهمی یافت نشده است.",
    noSurveyResultsMessage: "هنوز نتیجه‌ای از نظرسنجی در دسترس نیست.",
    suppressed: "پنهان‌شده",
  },
  fr: {
    summary: "Résumé",
    agreements: "Approuvés",
    disagreements: "Rejetés",
    divisive: "Controversé",
    surveyTitle: "Questionnaire",
    surveyOverallLabel: "Global",
    agreementsLong:
      "Quelles propositions sont approuvées par tous les groupes ?",
    disagreementsLong:
      "Quelles propositions sont rejetées par tous les groupes ?",
    divisiveLong:
      "Qu'est-ce qui divise les participants entre les groupes d'opinion ?",
    surveySubtitle:
      "Voyez comment chaque question du questionnaire est répondue globalement ou dans chaque groupe d'opinion.",
    surveyGroupSubtitle: "Seules les réponses de ce groupe d'opinion sont incluses ici.",
    agreementsSubtitle:
      "Consensus entre groupes, pas une simple majorité. Seules les plus significatives statistiquement sont affichées.",
    disagreementsSubtitle:
      "Consensus entre groupes, pas une simple majorité. Seules les plus significatives statistiquement sont affichées.",
    divisiveSubtitle:
      "Propositions qui divisent les groupes d'opinion entre eux. Seules les plus significatives statistiquement sont affichées.",
    noAgreementsMessage: "Aucun consensus n'a encore émergé.",
    noDisagreementsMessage: "Aucun consensus n'a encore émergé.",
    noDivisiveMessage:
      "Aucune proposition controversée significative trouvée pour le moment.",
    noSurveyResultsMessage:
      "Aucun résultat de questionnaire n'est encore disponible.",
    suppressed: "Masqué",
  },
  "zh-Hans": {
    summary: "摘要",
    agreements: "通过",
    disagreements: "否决",
    divisive: "分歧",
    surveyTitle: "问卷",
    surveyOverallLabel: "整体",
    agreementsLong: "哪些观点被所有群组认可？",
    disagreementsLong: "哪些观点被所有群组否决？",
    divisiveLong: "什么使参与者在各意见群组之间产生分歧？",
    surveySubtitle: "查看每个问卷问题在整体人群或各意见群组内的回答分布。",
    surveyGroupSubtitle: "此处仅包含该意见群组的回答结果。",
    agreementsSubtitle: "跨群组共识，非简单多数。仅显示统计上最显著的结果。",
    disagreementsSubtitle: "跨群组共识，非简单多数。仅显示统计上最显著的结果。",
    divisiveSubtitle: "使意见群组相互对立的观点。仅显示统计上最显著的结果。",
    noAgreementsMessage: "尚未形成共识。",
    noDisagreementsMessage: "尚未形成共识。",
    noDivisiveMessage: "尚未找到显著的分歧观点。",
    noSurveyResultsMessage: "暂时没有可用的问卷结果。",
    suppressed: "已隐藏",
  },
  "zh-Hant": {
    summary: "摘要",
    agreements: "通過",
    disagreements: "否決",
    divisive: "分歧",
    surveyTitle: "問卷",
    surveyOverallLabel: "整體",
    agreementsLong: "哪些觀點被所有群組認可？",
    disagreementsLong: "哪些觀點被所有群組否決？",
    divisiveLong: "什麼使參與者在各意見群組之間產生分歧？",
    surveySubtitle: "查看每個問卷問題在整體或各意見群組內的回答分布。",
    surveyGroupSubtitle: "此處僅包含此意見群組的回答結果。",
    agreementsSubtitle: "跨群組共識，非簡單多數。僅顯示統計上最顯著的結果。",
    disagreementsSubtitle: "跨群組共識，非簡單多數。僅顯示統計上最顯著的結果。",
    divisiveSubtitle: "使意見群組相互對立的觀點。僅顯示統計上最顯著的結果。",
    noAgreementsMessage: "尚未形成共識。",
    noDisagreementsMessage: "尚未形成共識。",
    noDivisiveMessage: "尚未找到顯著的分歧觀點。",
    noSurveyResultsMessage: "目前沒有可用的問卷結果。",
    suppressed: "已隱藏",
  },
  he: {
    summary: "סיכום",
    agreements: "אושרו",
    disagreements: "נדחו",
    divisive: "מפלג",
    surveyTitle: "סקר",
    surveyOverallLabel: "כללי",
    agreementsLong: "אילו הצהרות אושרו על ידי כל הקבוצות?",
    disagreementsLong: "אילו הצהרות נדחו על ידי כל הקבוצות?",
    divisiveLong: "מה מפלג את המשתתפים בין הקבוצות?",
    surveySubtitle:
      "ראו כיצד נענית כל שאלה בסקר בכלל המשתתפים או בתוך כל קבוצת דעה.",
    surveyGroupSubtitle: "כאן מוצגות רק התשובות של קבוצת הדעה הזו.",
    agreementsSubtitle:
      "קונצנזוס בין-קבוצתי, לא רוב פשוט. רק המובהקות ביותר מבחינה סטטיסטית מוצגות.",
    disagreementsSubtitle:
      "קונצנזוס בין-קבוצתי, לא רוב פשוט. רק המובהקות ביותר מבחינה סטטיסטית מוצגות.",
    divisiveSubtitle:
      "הצהרות שמפלגות בין קבוצות הדעה. רק המובהקות ביותר מבחינה סטטיסטית מוצגות.",
    noAgreementsMessage: "טרם התגבש קונצנזוס.",
    noDisagreementsMessage: "טרם התגבש קונצנזוס.",
    noDivisiveMessage: "טרם נמצאו הצהרות מפלגות מובהקות.",
    noSurveyResultsMessage: "עדיין אין תוצאות סקר זמינות.",
    suppressed: "מוסתר",
  },
  ja: {
    summary: "概要",
    agreements: "承認",
    disagreements: "否決",
    divisive: "分断",
    surveyTitle: "アンケート",
    surveyOverallLabel: "全体",
    agreementsLong: "すべてのグループに承認された意見は？",
    disagreementsLong: "すべてのグループに否決された意見は？",
    divisiveLong: "意見グループ間で参加者を分断しているものは何ですか？",
    surveySubtitle:
      "各アンケート設問への回答が全体または各意見グループ内でどう分かれているかを確認できます。",
    surveyGroupSubtitle: "ここにはこの意見グループの回答のみが表示されます。",
    agreementsSubtitle:
      "グループ間の合意であり、単純多数決ではありません。統計的に最も有意なもののみ表示されます。",
    disagreementsSubtitle:
      "グループ間の合意であり、単純多数決ではありません。統計的に最も有意なもののみ表示されます。",
    divisiveSubtitle:
      "意見グループを対立させる意見。統計的に最も有意なもののみ表示されます。",
    noAgreementsMessage: "まだ合意は形成されていません。",
    noDisagreementsMessage: "まだ合意は形成されていません。",
    noDivisiveMessage: "有意な分断的主張はまだ見つかりません。",
    noSurveyResultsMessage: "利用可能なアンケート結果はまだありません。",
    suppressed: "非表示",
  },
  ky: {
    summary: "Корутунду",
    agreements: "Жактырылган",
    disagreements: "Четке кагылган",
    divisive: "Талаштуу",
    surveyTitle: "Сурамжылоо",
    surveyOverallLabel: "Жалпы",
    agreementsLong: "Кайсы пикирлер бардык топтор тарабынан жактырылган?",
    disagreementsLong: "Кайсы пикирлер бардык топтор тарабынан четке кагылган?",
    divisiveLong: "Топтор аралык катышуучуларды эмне бөлөт?",
    surveySubtitle:
      "Ар бир сурамжылоо суроосуна жооптор жалпы же ар бир пикир тобунун ичинде кандай бөлүнгөнүн көрүңүз.",
    surveyGroupSubtitle: "Бул жерде ушул пикир тобунун жооптору гана көрсөтүлөт.",
    agreementsSubtitle:
      "Топтор аралык консенсус, жөнөкөй көпчүлүк эмес. Статистикалык жактан эң маанилүүлөрү гана көрсөтүлөт.",
    disagreementsSubtitle:
      "Топтор аралык консенсус, жөнөкөй көпчүлүк эмес. Статистикалык жактан эң маанилүүлөрү гана көрсөтүлөт.",
    divisiveSubtitle:
      "Пикир топторун бири-бирине каршы коюучу пикирлер. Статистикалык жактан эң маанилүүлөрү гана көрсөтүлөт.",
    noAgreementsMessage: "Азырынча консенсус түзүлө элек.",
    noDisagreementsMessage: "Азырынча консенсус түзүлө элек.",
    noDivisiveMessage: "Азырынча маанилүү талаштуу пикирлер табылган жок.",
    noSurveyResultsMessage:
      "Азырынча сурамжылоонун жыйынтыктары жеткиликтүү эмес.",
    suppressed: "Жашырылган",
  },
  ru: {
    summary: "Сводка",
    agreements: "Одобрено",
    disagreements: "Отклонено",
    divisive: "Спорные",
    surveyTitle: "Опрос",
    surveyOverallLabel: "В целом",
    agreementsLong: "Какие высказывания одобрены всеми группами?",
    disagreementsLong: "Какие высказывания отклонены всеми группами?",
    divisiveLong: "Что разделяет участников между группами?",
    surveySubtitle:
      "Смотрите, как отвечают на каждый вопрос опроса в целом или внутри каждой группы мнений.",
    surveyGroupSubtitle: "Здесь показаны только ответы этой группы мнений.",
    agreementsSubtitle:
      "Межгрупповой консенсус, а не простое большинство. Показаны только наиболее статистически значимые.",
    disagreementsSubtitle:
      "Межгрупповой консенсус, а не простое большинство. Показаны только наиболее статистически значимые.",
    divisiveSubtitle:
      "Высказывания, по которым группы мнений расходятся. Показаны только наиболее статистически значимые.",
    noAgreementsMessage: "Консенсус пока не сформирован.",
    noDisagreementsMessage: "Консенсус пока не сформирован.",
    noDivisiveMessage: "Значимых спорных высказываний пока не найдено.",
    noSurveyResultsMessage: "Результаты опроса пока недоступны.",
    suppressed: "Скрыто",
  },
};
