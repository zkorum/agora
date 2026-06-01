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
      "This tab shows how participants counted in the selected analysis answered each survey question. Overall results combine counted participants, and when opinion groups exist you can compare answers by group.\n\nIf privacy suppression is enabled for a question, public results hide very small groups across all snapshots. Owners can switch between the suppressed public view and the full aggregate view.\n\nOnce privacy suppression is enabled for a question, it cannot be turned off, so participants can rely on that public privacy guarantee.",
  },
  ar: {
    title: "الاستبيان",
    description:
      "يعرض هذا القسم كيف أجاب المشاركون المحتسبون في التحليل المحدد على كل سؤال في الاستبيان. تجمع النتائج الإجمالية المشاركين المحتسبين، وعند وجود مجموعات رأي يمكنك مقارنة الإجابات حسب المجموعة.\n\nإذا كان إخفاء النتائج لحماية الخصوصية مفعلاً لسؤال ما، تخفي النتائج العامة المجموعات الصغيرة جداً في كل اللقطات. يمكن للمالكين التبديل بين العرض العام المخفي والعرض التجميعي الكامل.\n\nبعد تفعيل إخفاء الخصوصية لسؤال ما، لا يمكن إيقافه، بحيث يمكن للمشاركين الاعتماد على ضمان الخصوصية هذا في النتائج العامة.",
  },
  es: {
    title: "Encuesta",
    description:
      "Esta pestaña muestra cómo respondieron a cada pregunta las personas incluidas en el análisis seleccionado. Los resultados generales combinan a esas personas y, cuando existen grupos de opinión, puedes comparar respuestas por grupo.\n\nSi la supresión por privacidad está activada para una pregunta, los resultados públicos ocultan grupos muy pequeños en todas las instantáneas. Las personas propietarias pueden alternar entre la vista pública suprimida y la vista agregada completa.\n\nUna vez activada para una pregunta, la supresión por privacidad no puede desactivarse, para que las personas participantes puedan confiar en esa garantía pública de privacidad.",
  },
  fa: {
    title: "نظرسنجی",
    description:
      "این بخش نشان می‌دهد شرکت‌کنندگانِ شمرده‌شده در تحلیل انتخاب‌شده به هر پرسش نظرسنجی چگونه پاسخ داده‌اند. نتایج کلی همان شرکت‌کنندگان را با هم نشان می‌دهد و اگر گروه‌های نظر وجود داشته باشد می‌توانید پاسخ‌ها را بر اساس گروه مقایسه کنید.\n\nاگر پنهان‌سازی حریم خصوصی برای پرسشی فعال باشد، نتایج عمومی گروه‌های بسیار کوچک را در همهٔ نماهای ذخیره‌شده پنهان می‌کند. مالکان می‌توانند بین نمای عمومیِ پنهان‌شده و نمای تجمیعی کامل جابه‌جا شوند.\n\nپس از فعال شدن پنهان‌سازی حریم خصوصی برای یک پرسش، نمی‌توان آن را خاموش کرد تا شرکت‌کنندگان بتوانند به این تضمین حریم خصوصی در نتایج عمومی اعتماد کنند.",
  },
  fr: {
    title: "Questionnaire",
    description:
      "Cet onglet montre comment les participants comptabilisés dans l'analyse sélectionnée ont répondu à chaque question du questionnaire. Les résultats globaux regroupent ces participants, et lorsqu'il existe des groupes d'opinion vous pouvez comparer les réponses par groupe.\n\nSi le masquage de confidentialité est activé pour une question, les résultats publics masquent les très petits groupes dans tous les jalons. Les propriétaires peuvent basculer entre la vue publique masquée et la vue agrégée complète.\n\nUne fois le masquage de confidentialité activé pour une question, il ne peut plus être désactivé, afin que les participants puissent compter sur cette garantie publique de confidentialité.",
  },
  he: {
    title: "סקר",
    description:
      "לשונית זו מציגה כיצד המשתתפים שנכללו בניתוח שנבחר ענו על כל שאלה בסקר. התוצאות הכוללות מאגדות את המשתתפים האלה, וכשיש קבוצות דעה אפשר להשוות תשובות לפי קבוצה.\n\nאם הסתרה לצורכי פרטיות מופעלת עבור שאלה, התוצאות הציבוריות מסתירות קבוצות קטנות מאוד בכל התמונות השמורות. בעלי השיחה יכולים לעבור בין התצוגה הציבורית המוסתרת לבין התצוגה המצטברת המלאה.\n\nלאחר שהסתרה לצורכי פרטיות הופעלה עבור שאלה, אי אפשר לכבות אותה, כדי שהמשתתפים יוכלו להסתמך על הבטחת הפרטיות הציבורית הזאת.",
  },
  ja: {
    title: "アンケート",
    description:
      "このタブでは、選択中の分析に含まれる参加者が各アンケート設問にどう回答したかを表示します。全体結果は集計対象の参加者をまとめて示し、意見グループがある場合はグループごとに回答を比較できます。\n\n設問でプライバシー保護の抑制が有効な場合、公開結果ではすべてのスナップショットで非常に小さいグループが非表示になります。所有者は、抑制された公開ビューと完全な集計ビューを切り替えられます。\n\n一度プライバシー保護の抑制を有効にした設問では、後から無効にできません。参加者がその公開時のプライバシー保証を信頼できるようにするためです。",
  },
  ky: {
    title: "Сурамжылоо",
    description:
      "Бул бөлүм тандалган талдоого кирген катышуучулар ар бир суроого кандай жооп бергенин көрсөтөт. Жалпы жыйынтык ошол эсептелген катышуучуларды бириктирет, ал эми пикир топтору болсо жоопторду топ боюнча салыштыра аласыз.\n\nЭгер суроо үчүн купуялык максатындагы жашыруу күйгүзүлсө, коомдук жыйынтыктар бардык снапшоттордо өтө чакан топторду жашырат. Ээлер жашырылган коомдук көрүнүш менен толук агрегатталган көрүнүштүн ортосунда которула алышат.\n\nСуроо үчүн купуялык жашыруусу бир жолу күйгүзүлгөндөн кийин, аны өчүрүүгө болбойт, ошондуктан катышуучулар бул коомдук купуялык кепилдигине ишене алышат.",
  },
  ru: {
    title: "Опрос",
    description:
      "Эта вкладка показывает, как участники, учтённые в выбранном анализе, ответили на каждый вопрос опроса. Общие результаты объединяют этих участников, а при наличии групп мнений можно сравнивать ответы по группам.\n\nЕсли для вопроса включено скрытие ради приватности, публичные результаты скрывают очень маленькие группы во всех снимках. Владельцы могут переключаться между скрытой публичной версией и полной агрегированной версией.\n\nПосле включения скрытия ради приватности для вопроса его нельзя отключить, чтобы участники могли рассчитывать на эту публичную гарантию приватности.",
  },
  "zh-Hans": {
    title: "问卷",
    description:
      "此标签页显示被计入所选分析的参与者如何回答每个问卷问题。总体结果会合并这些被计入的参与者；如果存在意见群组，你也可以按群组比较回答。\n\n如果某个问题启用了隐私抑制，公开结果会在所有快照中隐藏非常小的群组。所有者可以在被抑制的公开视图和完整聚合视图之间切换。\n\n一旦某个问题启用了隐私抑制，就不能再关闭，这样参与者才能信赖这项公开隐私保障。",
  },
  "zh-Hant": {
    title: "問卷",
    description:
      "此分頁顯示被納入所選分析的參與者如何回答每個問卷問題。整體結果會合併這些被納入的參與者；若存在意見群組，也可以按群組比較回答。\n\n如果某個問題啟用了隱私抑制，公開結果會在所有快照中隱藏非常小的群組。擁有者可以在已抑制的公開視圖和完整彙總視圖之間切換。\n\n一旦某個問題啟用了隱私抑制，就不能再關閉，讓參與者能夠信賴這項公開隱私保障。",
  },
};
