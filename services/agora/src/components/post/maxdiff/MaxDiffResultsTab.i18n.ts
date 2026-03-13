import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface MaxDiffResultsTabTranslations {
  title: string;
  noResults: string;
  participants: string;
  subtitle: string;
  score: string;
  loadingError: string;
  learnMore: string;
  learnMoreMethod: string;
  learnMoreHow: string;
  learnMoreWhy: string;
  learnMoreReference: string;
}

export const maxDiffResultsTabTranslations: Record<
  SupportedDisplayLanguageCodes,
  MaxDiffResultsTabTranslations
> = {
  en: {
    title: "Community Ranking",
    noResults: "No ranking data yet. Be the first to participate!",
    participants: "{count} participant(s)",
    subtitle: "Ranked through pairwise comparisons for more reliable results",
    score: "Score: {score}",
    loadingError: "Failed to load results.",
    learnMore: "Learn more",
    learnMoreMethod: "This ranking uses Best-Worst Scaling (MaxDiff), a method developed by researcher Jordan Louviere in the 1990s.",
    learnMoreHow: "Each participant compares statements in small groups, selecting the most and least important in each set. The ranking is computed by aggregating all participants' comparisons.",
    learnMoreWhy: "This approach produces more reliable results than simple rating scales because it forces meaningful trade-offs between options.",
    learnMoreReference: "Learn more:",
  },
  ar: {
    title: "تصنيف المجتمع",
    noResults: "لا توجد بيانات ترتيب بعد. كن أول من يشارك!",
    participants: "{count} مشارك(ين)",
    subtitle: "مرتب عبر مقارنات ثنائية لنتائج أكثر موثوقية",
    score: "النتيجة: {score}",
    loadingError: "فشل تحميل النتائج.",
    learnMore: "اعرف المزيد",
    learnMoreMethod: "يستخدم هذا الترتيب طريقة Best-Worst Scaling (MaxDiff)، وهي طريقة طوّرها الباحث جوردان لوفيير في التسعينيات.",
    learnMoreHow: "يقارن كل مشارك العبارات في مجموعات صغيرة، ويختار الأكثر والأقل أهمية في كل مجموعة. يتم حساب الترتيب من خلال تجميع مقارنات جميع المشاركين.",
    learnMoreWhy: "هذا النهج ينتج نتائج أكثر موثوقية من مقاييس التقييم البسيطة لأنه يفرض المفاضلة بين الخيارات.",
    learnMoreReference: "اعرف المزيد:",
  },
  es: {
    title: "Clasificación de la comunidad",
    noResults: "Aún no hay datos de clasificación. ¡Sé el primero en participar!",
    participants: "{count} participante(s)",
    subtitle: "Clasificado mediante comparaciones por pares para resultados más fiables",
    score: "Puntuación: {score}",
    loadingError: "Error al cargar los resultados.",
    learnMore: "Más información",
    learnMoreMethod: "Esta clasificación utiliza Best-Worst Scaling (MaxDiff), un método desarrollado por el investigador Jordan Louviere en los años 90.",
    learnMoreHow: "Cada participante compara declaraciones en pequeños grupos, seleccionando la más y menos importante de cada conjunto. La clasificación se calcula agregando las comparaciones de todos los participantes.",
    learnMoreWhy: "Este enfoque produce resultados más fiables que las escalas de valoración simples porque obliga a elegir entre opciones.",
    learnMoreReference: "Más información:",
  },
  fr: {
    title: "Classement de la communauté",
    noResults: "Pas encore de données de classement. Soyez le premier à participer !",
    participants: "{count} participant(s)",
    subtitle: "Classé par comparaisons par paires pour des résultats plus fiables",
    score: "Score : {score}",
    loadingError: "Échec du chargement des résultats.",
    learnMore: "En savoir plus",
    learnMoreMethod: "Ce classement utilise le Best-Worst Scaling (MaxDiff), une méthode développée par le chercheur Jordan Louviere dans les années 1990.",
    learnMoreHow: "Chaque participant compare des propositions par petits groupes, en sélectionnant la plus et la moins importante de chaque ensemble. Le classement est calculé en agrégeant les comparaisons de tous les participants.",
    learnMoreWhy: "Cette approche produit des résultats plus fiables que les échelles de notation simples car elle oblige à faire des compromis entre les options.",
    learnMoreReference: "En savoir plus :",
  },
  "zh-Hans": {
    title: "社区排名",
    noResults: "暂无排名数据。成为第一个参与者！",
    participants: "{count} 位参与者",
    subtitle: "通过成对比较排名，结果更加可靠",
    score: "得分：{score}",
    loadingError: "加载结果失败。",
    learnMore: "了解更多",
    learnMoreMethod: "此排名使用 Best-Worst Scaling (MaxDiff) 方法，由研究者 Jordan Louviere 于 1990 年代开发。",
    learnMoreHow: "每位参与者在小组中比较陈述，选择每组中最重要和最不重要的。排名通过汇总所有参与者的比较来计算。",
    learnMoreWhy: "这种方法比简单评分量表产生更可靠的结果，因为它迫使参与者在选项之间做出取舍。",
    learnMoreReference: "了解更多：",
  },
  "zh-Hant": {
    title: "社區排名",
    noResults: "暫無排名資料。成為第一個參與者！",
    participants: "{count} 位參與者",
    subtitle: "透過成對比較排名，結果更加可靠",
    score: "得分：{score}",
    loadingError: "載入結果失敗。",
    learnMore: "了解更多",
    learnMoreMethod: "此排名使用 Best-Worst Scaling (MaxDiff) 方法，由研究者 Jordan Louviere 於 1990 年代開發。",
    learnMoreHow: "每位參與者在小組中比較陳述，選擇每組中最重要和最不重要的。排名通過匯總所有參與者的比較來計算。",
    learnMoreWhy: "這種方法比簡單評分量表產生更可靠的結果，因為它迫使參與者在選項之間做出取捨。",
    learnMoreReference: "了解更多：",
  },
  ja: {
    title: "コミュニティランキング",
    noResults: "まだランキングデータがありません。最初の参加者になりましょう！",
    participants: "{count} 人の参加者",
    subtitle: "ペアワイズ比較による、より信頼性の高いランキング",
    score: "スコア：{score}",
    loadingError: "結果の読み込みに失敗しました。",
    learnMore: "詳しく",
    learnMoreMethod: "このランキングは、1990年代に研究者 Jordan Louviere が開発した Best-Worst Scaling (MaxDiff) という手法を使用しています。",
    learnMoreHow: "各参加者は小グループでステートメントを比較し、各セットで最も重要なものと最も重要でないものを選択します。ランキングはすべての参加者の比較を集計して算出されます。",
    learnMoreWhy: "この手法は、選択肢間のトレードオフを強制するため、単純な評価スケールよりも信頼性の高い結果を生み出します。",
    learnMoreReference: "詳しくはこちら：",
  },
  ky: {
    title: "Коомдук рейтинг",
    noResults: "Рейтинг маалыматы жок. Биринчи катышуучу болуңуз!",
    participants: "{count} катышуучу",
    subtitle: "Жуптук салыштыруулар аркылуу ишенимдүү натыйжалар үчүн рейтингделген",
    score: "Упай: {score}",
    loadingError: "Натыйжаларды жүктөө ишке ашкан жок.",
    learnMore: "Көбүрөөк билүү",
    learnMoreMethod: "Бул рейтинг Best-Worst Scaling (MaxDiff) ыкмасын колдонот, аны 1990-жылдары изилдөөчү Jordan Louviere иштеп чыккан.",
    learnMoreHow: "Ар бир катышуучу билдирүүлөрдү кичинекей топторго бөлүп салыштырат, ар бир топтон эң маанилүүсүн жана эң аз маанилүүсүн тандайт. Рейтинг бардык катышуучулардын салыштырууларын бириктирип эсептелет.",
    learnMoreWhy: "Бул ыкма жөнөкөй баалоо шкалаларына караганда ишенимдүү натыйжаларды берет, анткени ал тандоолордун ортосунда маанилүү тандоолорду талап кылат.",
    learnMoreReference: "Көбүрөөк билүү:",
  },
  ru: {
    title: "Рейтинг сообщества",
    noResults: "Данных рейтинга пока нет. Станьте первым участником!",
    participants: "{count} участник(ов)",
    subtitle: "Ранжировано через попарные сравнения для более надёжных результатов",
    score: "Оценка: {score}",
    loadingError: "Не удалось загрузить результаты.",
    learnMore: "Подробнее",
    learnMoreMethod: "Этот рейтинг использует метод Best-Worst Scaling (MaxDiff), разработанный исследователем Джорданом Лувьером в 1990-х годах.",
    learnMoreHow: "Каждый участник сравнивает утверждения в небольших группах, выбирая самое и наименее важное в каждом наборе. Рейтинг рассчитывается путём агрегирования сравнений всех участников.",
    learnMoreWhy: "Этот подход даёт более надёжные результаты, чем простые шкалы оценки, поскольку заставляет делать осмысленный выбор между вариантами.",
    learnMoreReference: "Подробнее:",
  },
};
