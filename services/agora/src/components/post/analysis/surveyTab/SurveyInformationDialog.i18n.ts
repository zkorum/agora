import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface SurveyInformationDialogTranslations {
  title: string;
  description: string;
}

export const surveyInformationDialogTranslations: Record<
  SupportedDisplayLanguageCodes,
  SurveyInformationDialogTranslations
> = {
  en: {
    title: "Survey",
    description:
      "This tab shows how counted participants answered each survey question. Overall results combine everyone together, and when opinion groups exist you can compare answers by group. Small cells may be suppressed to protect participant privacy.",
  },
  ar: {
    title: "الاستبيان",
    description:
      "يعرض هذا القسم كيف أجاب المشاركون المحتسبون على كل سؤال في الاستبيان. تجمع النتائج الإجمالية الجميع معاً، وعند وجود مجموعات رأي يمكنك مقارنة الإجابات حسب المجموعة. قد تُحجب الخلايا الصغيرة لحماية خصوصية المشاركين.",
  },
  es: {
    title: "Encuesta",
    description:
      "Esta pestaña muestra cómo respondieron los participantes contabilizados a cada pregunta de la encuesta. Los resultados generales combinan a todas las personas, y cuando existen grupos de opinión puedes comparar respuestas por grupo. Las celdas pequeñas pueden ocultarse para proteger la privacidad de los participantes.",
  },
  fa: {
    title: "نظرسنجی",
    description:
      "این بخش نشان می‌دهد شرکت‌کنندگانِ شمارش‌شده به هر پرسش نظرسنجی چگونه پاسخ داده‌اند. نتایج کلی همه را با هم نشان می‌دهد و اگر گروه‌های نظر وجود داشته باشد می‌توانید پاسخ‌ها را بر اساس گروه مقایسه کنید. خانه‌های کوچک ممکن است برای حفظ حریم خصوصی شرکت‌کنندگان پنهان شوند.",
  },
  fr: {
    title: "Questionnaire",
    description:
      "Cet onglet montre comment les participants comptabilisés ont répondu à chaque question du questionnaire. Les résultats globaux regroupent tout le monde, et lorsqu'il existe des groupes d'opinion vous pouvez comparer les réponses par groupe. Les petites cellules peuvent être masquées pour protéger la vie privée des participants.",
  },
  he: {
    title: "סקר",
    description:
      "לשונית זו מציגה כיצד משתתפים שנספרו ענו על כל שאלה בסקר. התוצאות הכוללות מאחדות את כולם יחד, וכשיש קבוצות דעה אפשר להשוות תשובות לפי קבוצה. תאים קטנים עשויים להיות מוסתרים כדי להגן על פרטיות המשתתפים.",
  },
  ja: {
    title: "アンケート",
    description:
      "このタブでは、集計対象の参加者が各アンケート設問にどう回答したかを表示します。全体結果は全員をまとめて示し、意見グループがある場合はグループごとに回答を比較できます。参加者のプライバシーを守るため、小さいセルは非表示になることがあります。",
  },
  ky: {
    title: "Сурамжылоо",
    description:
      "Бул бөлүм эсепке алынган катышуучулар ар бир суроого кандай жооп бергенин көрсөтөт. Жалпы жыйынтык баарын бириктирет, ал эми пикир топтору болсо жоопторду топ боюнча салыштыра аласыз. Катышуучулардын купуялуулугун коргоо үчүн аз сандагы уячалар жашырылышы мүмкүн.",
  },
  ru: {
    title: "Опрос",
    description:
      "Эта вкладка показывает, как учтённые участники ответили на каждый вопрос опроса. Общие результаты объединяют всех вместе, а при наличии групп мнений можно сравнивать ответы по группам. Небольшие ячейки могут скрываться для защиты приватности участников.",
  },
  "zh-Hans": {
    title: "问卷",
    description:
      "此标签页显示被计入分析的参与者如何回答每个问卷问题。总体结果会合并所有人；如果存在意见群组，你也可以按群组比较回答。较小的数据单元可能会被隐藏，以保护参与者隐私。",
  },
  "zh-Hant": {
    title: "問卷",
    description:
      "此分頁顯示被納入分析的參與者如何回答每個問卷問題。整體結果會合併所有人；若存在意見群組，也可以按群組比較回答。較小的資料格可能會被隱藏，以保護參與者隱私。",
  },
};
