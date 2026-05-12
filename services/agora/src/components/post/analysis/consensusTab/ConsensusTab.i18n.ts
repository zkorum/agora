import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ConsensusTabTranslations {
  agreementsTitle: string;
  disagreementsTitle: string;
  agreementsLongTitle: string;
  disagreementsLongTitle: string;
  agreementsKeyword: string;
  disagreementsKeyword: string;
  subtitleAgree: string;
  subtitleDisagree: string;
  loadMore: string;
  noAgreementsMessage: string;
  noDisagreementsMessage: string;
  lowerRankedDivider: string;
}

export const consensusTabTranslations: Record<
  SupportedDisplayLanguageCodes,
  ConsensusTabTranslations
> = {
  en: {
    agreementsTitle: "Approved",
    disagreementsTitle: "Rejected",
    agreementsLongTitle:
      "Which statements are {keyword} by all groups?",
    disagreementsLongTitle:
      "Which statements are {keyword} by all groups?",
    agreementsKeyword: "approved",
    disagreementsKeyword: "rejected",
    subtitleAgree:
      "Statements all opinion groups agree to agree on. Not a simple majority, but a cross-group consensus. Only the most statistically significant are shown first.",
    subtitleDisagree:
      "Statements all opinion groups agree to disagree on. Not a simple majority, but a cross-group consensus. Only the most statistically significant are shown first.",
    loadMore: "Load all",
    noAgreementsMessage: "No consensus has emerged yet.",
    noDisagreementsMessage: "No consensus has emerged yet.",
    lowerRankedDivider: "Less statistically significant",
  },
  ar: {
    agreementsTitle: "معتمدة",
    disagreementsTitle: "مرفوضة",
    agreementsLongTitle:
      "ما المقترحات {keyword} من جميع المجموعات؟",
    disagreementsLongTitle:
      "ما المقترحات {keyword} من جميع المجموعات؟",
    agreementsKeyword: "المعتمدة",
    disagreementsKeyword: "المرفوضة",
    subtitleAgree:
      "مقترحات تتفق جميع مجموعات الرأي على الموافقة عليها — إجماع بين المجموعات، وليس مجرد تصويت أغلبية. تُعرض الأكثر دلالة إحصائياً أولاً.",
    subtitleDisagree:
      "مقترحات تتفق جميع مجموعات الرأي على رفضها — إجماع بين المجموعات، وليس مجرد تصويت أغلبية. تُعرض الأكثر دلالة إحصائياً أولاً.",
    loadMore: "تحميل الكل",
    noAgreementsMessage: "لم يظهر أي إجماع بعد.",
    noDisagreementsMessage: "لم يظهر أي إجماع بعد.",
    lowerRankedDivider: "أقل دلالة إحصائياً",
  },
  es: {
    agreementsTitle: "Aprobados",
    disagreementsTitle: "Rechazados",
    agreementsLongTitle:
      "¿Qué afirmaciones son {keyword} por todos los grupos?",
    disagreementsLongTitle:
      "¿Qué afirmaciones son {keyword} por todos los grupos?",
    agreementsKeyword: "aprobadas",
    disagreementsKeyword: "rechazadas",
    subtitleAgree:
      "Proposiciones aprobadas por unanimidad por todos los grupos de opinión. No se trata de una simple mayoría, sino de un consenso entre grupos. Solo se muestran las más estadísticamente significativas primero.",
    subtitleDisagree:
      "Proposiciones rechazadas por unanimidad por todos los grupos de opinión. No se trata de una simple mayoría, sino de un consenso entre grupos. Solo se muestran las más estadísticamente significativas primero.",
    loadMore: "Cargar todo",
    noAgreementsMessage: "Aún no ha surgido ningún consenso.",
    noDisagreementsMessage: "Aún no ha surgido ningún consenso.",
    lowerRankedDivider: "Menos estadísticamente significativas",
  },
  fa: {
    agreementsTitle: "تأیید شده",
    disagreementsTitle: "رد شده",
    agreementsLongTitle: "کدام گزاره‌ها توسط همه گروه‌ها {keyword} شده‌اند؟",
    disagreementsLongTitle: "کدام گزاره‌ها توسط همه گروه‌ها {keyword} شده‌اند؟",
    agreementsKeyword: "تأیید",
    disagreementsKeyword: "رد",
    subtitleAgree:
      "گزاره‌هایی که همه گروه‌های نظر بر تأیید آنها توافق دارند — نه اکثریت ساده، بلکه اجماع بین‌گروهی. ابتدا فقط مهم‌ترین موارد از نظر آماری نمایش داده می‌شوند.",
    subtitleDisagree:
      "گزاره‌هایی که همه گروه‌های نظر بر رد آنها توافق دارند — نه اکثریت ساده، بلکه اجماع بین‌گروهی. ابتدا فقط مهم‌ترین موارد از نظر آماری نمایش داده می‌شوند.",
    loadMore: "بارگذاری همه",
    noAgreementsMessage: "هنوز اجماعی شکل نگرفته است.",
    noDisagreementsMessage: "هنوز اجماعی شکل نگرفته است.",
    lowerRankedDivider: "اهمیت آماری کمتر",
  },
  fr: {
    agreementsTitle: "Approuvés",
    disagreementsTitle: "Rejetés",
    agreementsLongTitle:
      "Quelles propositions sont {keyword} par tous les groupes ?",
    disagreementsLongTitle:
      "Quelles propositions sont {keyword} par tous les groupes ?",
    agreementsKeyword: "approuvées",
    disagreementsKeyword: "rejetées",
    subtitleAgree:
      "Propositions approuvées à l'unanimité par tous les groupes d'opinion. Il ne s'agit pas d'une simple majorité, mais d'un consensus inter-groupes. Seules les plus statistiquement significatives sont affichées en premier.",
    subtitleDisagree:
      "Propositions rejetées à l'unanimité par tous les groupes d'opinion. Il ne s'agit pas d'une simple majorité, mais d'un consensus inter-groupes. Seules les plus statistiquement significatives sont affichées en premier.",
    loadMore: "Tout charger",
    noAgreementsMessage: "Aucun consensus n'a encore émergé.",
    noDisagreementsMessage: "Aucun consensus n'a encore émergé.",
    lowerRankedDivider: "Moins statistiquement significatives",
  },
  "zh-Hans": {
    agreementsTitle: "通过",
    disagreementsTitle: "否决",
    agreementsLongTitle: "哪些意见被所有群组{keyword}？",
    disagreementsLongTitle: "哪些意见被所有群组{keyword}？",
    agreementsKeyword: "认可",
    disagreementsKeyword: "否决",
    subtitleAgree:
      "所有意见群组一致同意认可的意见——跨群组共识，而非简单的多数投票。仅先显示统计上最显著的意见。",
    subtitleDisagree:
      "所有意见群组一致同意否决的意见——跨群组共识，而非简单的多数投票。仅先显示统计上最显著的意见。",
    loadMore: "全部加载",
    noAgreementsMessage: "尚未形成共识。",
    noDisagreementsMessage: "尚未形成共识。",
    lowerRankedDivider: "统计显著性较低",
  },
  "zh-Hant": {
    agreementsTitle: "通過",
    disagreementsTitle: "否決",
    agreementsLongTitle: "哪些意見被所有群組{keyword}？",
    disagreementsLongTitle: "哪些意見被所有群組{keyword}？",
    agreementsKeyword: "認可",
    disagreementsKeyword: "否決",
    subtitleAgree:
      "所有意見群組一致同意認可的意見——跨群組共識，而非簡單的多數投票。僅先顯示統計上最顯著的意見。",
    subtitleDisagree:
      "所有意見群組一致同意否決的意見——跨群組共識，而非簡單的多數投票。僅先顯示統計上最顯著的意見。",
    loadMore: "全部載入",
    noAgreementsMessage: "尚未形成共識。",
    noDisagreementsMessage: "尚未形成共識。",
    lowerRankedDivider: "統計顯著性較低",
  },
  he: {
    agreementsTitle: "אושרו",
    disagreementsTitle: "נדחו",
    agreementsLongTitle: "אילו הצהרות {keyword} על ידי כל הקבוצות?",
    disagreementsLongTitle: "אילו הצהרות {keyword} על ידי כל הקבוצות?",
    agreementsKeyword: "אושרו",
    disagreementsKeyword: "נדחו",
    subtitleAgree:
      "הצהרות שכל קבוצות הדעה מסכימות לאשר — לא רוב פשוט, אלא קונצנזוס בין-קבוצתי. רק המובהקות ביותר מבחינה סטטיסטית מוצגות תחילה.",
    subtitleDisagree:
      "הצהרות שכל קבוצות הדעה מסכימות לדחות — לא רוב פשוט, אלא קונצנזוס בין-קבוצתי. רק המובהקות ביותר מבחינה סטטיסטית מוצגות תחילה.",
    loadMore: "טעינת הכל",
    noAgreementsMessage: "טרם התגבש קונצנזוס.",
    noDisagreementsMessage: "טרם התגבש קונצנזוס.",
    lowerRankedDivider: "פחות מובהק מבחינה סטטיסטית",
  },
  ja: {
    agreementsTitle: "承認",
    disagreementsTitle: "否決",
    agreementsLongTitle:
      "すべてのグループに{keyword}された意見は？",
    disagreementsLongTitle:
      "すべてのグループに{keyword}された意見は？",
    agreementsKeyword: "承認",
    disagreementsKeyword: "否決",
    subtitleAgree:
      "すべての意見グループが合意して承認した意見です——多数決ではなく、グループ間の合意です。統計的に最も有意なものが最初に表示されます。",
    subtitleDisagree:
      "すべての意見グループが合意して否決した意見です——多数決ではなく、グループ間の合意です。統計的に最も有意なものが最初に表示されます。",
    loadMore: "すべて読み込む",
    noAgreementsMessage: "まだ合意は形成されていません。",
    noDisagreementsMessage: "まだ合意は形成されていません。",
    lowerRankedDivider: "統計的有意性が低い",
  },
  ky: {
    agreementsTitle: "Жактырылган",
    disagreementsTitle: "Четке кагылган",
    agreementsLongTitle:
      "Кайсы пикирлер бардык топтор тарабынан {keyword}?",
    disagreementsLongTitle:
      "Кайсы пикирлер бардык топтор тарабынан {keyword}?",
    agreementsKeyword: "жактырылган",
    disagreementsKeyword: "четке кагылган",
    subtitleAgree:
      "Бардык пикир топтору бир добуштан жактырган пикирлер — жөнөкөй көпчүлүк эмес, топтор аралык консенсус. Алгач статистикалык жактан эң маанилүүлөрү көрсөтүлөт.",
    subtitleDisagree:
      "Бардык пикир топтору бир добуштан четке каккан пикирлер — жөнөкөй көпчүлүк эмес, топтор аралык консенсус. Алгач статистикалык жактан эң маанилүүлөрү көрсөтүлөт.",
    loadMore: "Баарын жүктөө",
    noAgreementsMessage: "Азырынча консенсус түзүлө элек.",
    noDisagreementsMessage: "Азырынча консенсус түзүлө элек.",
    lowerRankedDivider: "Статистикалык маанилүүлүгү төмөн",
  },
  ru: {
    agreementsTitle: "Одобрено",
    disagreementsTitle: "Отклонено",
    agreementsLongTitle:
      "Какие высказывания {keyword} всеми группами?",
    disagreementsLongTitle:
      "Какие высказывания {keyword} всеми группами?",
    agreementsKeyword: "одобрены",
    disagreementsKeyword: "отклонены",
    subtitleAgree:
      "Высказывания, единогласно одобренные всеми группами мнений — не простое большинство, а межгрупповой консенсус. Сначала показаны наиболее статистически значимые.",
    subtitleDisagree:
      "Высказывания, единогласно отклонённые всеми группами мнений — не простое большинство, а межгрупповой консенсус. Сначала показаны наиболее статистически значимые.",
    loadMore: "Загрузить все",
    noAgreementsMessage: "Консенсус пока не сформирован.",
    noDisagreementsMessage: "Консенсус пока не сформирован.",
    lowerRankedDivider: "Менее статистически значимые",
  },
};
