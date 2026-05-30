import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

interface SuppressionThresholdParams {
  maxHiddenResponses: number;
  threshold: number;
}

interface EmphasizedMessageParts {
  beforeEmphasis: string;
  emphasis: string;
  afterEmphasis: string;
}

export interface SurveyConfigEditorTranslations {
  publicAggregateSuppressionLabel: ({
    maxHiddenResponses,
  }: Pick<SuppressionThresholdParams, "maxHiddenResponses">) => string;
  publicAggregateSuppressionSummary: string;
  publicAggregateSuppressionHintParagraphs: ({
    maxHiddenResponses,
    threshold,
  }: SuppressionThresholdParams) => string[];
  publicAggregateSuppressionLearnMoreTitle: string;
  publicAggregateSuppressionConfirmTitle: string;
  publicAggregateSuppressionConfirmMessage: EmphasizedMessageParts;
  publicAggregateSuppressionConfirmButtonLabel: string;
}

export const surveyConfigEditorTranslations: Record<
  SupportedDisplayLanguageCodes,
  SurveyConfigEditorTranslations
> = {
  en: {
    publicAggregateSuppressionLabel: ({ maxHiddenResponses }) =>
      `Hide public results when any option has 1-${String(maxHiddenResponses)} counted responses`,
    publicAggregateSuppressionSummary:
      "Recommended for small communities where answers could reveal who is who.",
    publicAggregateSuppressionHintParagraphs: ({
      maxHiddenResponses,
      threshold,
    }) => [
      "Applies separately to all respondents and each opinion group.",
      `If any option for this question has 1-${String(maxHiddenResponses)} counted responses, public counts and percentages for the whole question are hidden in that block. Options with 0 or ${String(threshold)}+ responses do not trigger hiding.`,
      "Facilitators can still view the full aggregate results.",
      "Turn this on for small communities where answers could reveal who is who, such as only a few women in a team or only a few people from a specific team.",
    ],
    publicAggregateSuppressionLearnMoreTitle: "About hidden public results",
    publicAggregateSuppressionConfirmTitle: "Enable hidden public results?",
    publicAggregateSuppressionConfirmMessage: {
      beforeEmphasis:
        "After you save this survey with hidden public results enabled, ",
      emphasis: "you will not be able to turn it off for this question",
      afterEmphasis: ". Participants will see this as a privacy guarantee.",
    },
    publicAggregateSuppressionConfirmButtonLabel: "Enable",
  },
  ar: {
    publicAggregateSuppressionLabel: ({ maxHiddenResponses }) =>
      `إخفاء النتائج العامة عندما يضم أي خيار 1-${String(maxHiddenResponses)} إجابات محتسبة`,
    publicAggregateSuppressionSummary:
      "موصى به للمجتمعات الصغيرة حيث قد تكشف الإجابات هوية المشاركين.",
    publicAggregateSuppressionHintParagraphs: ({
      maxHiddenResponses,
      threshold,
    }) => [
      "يُطبَّق بشكل منفصل على جميع المشاركين وعلى كل مجموعة رأي.",
      `إذا كان أي خيار في هذا السؤال يضم 1-${String(maxHiddenResponses)} إجابات محتسبة، تُخفى الأعداد والنسب العامة للسؤال كله في ذلك الجزء. الخيارات التي تضم 0 أو ${String(threshold)} إجابات أو أكثر لا تؤدي إلى الإخفاء.`,
      "يظل بإمكان الميسّرين رؤية النتائج التجميعية الكاملة.",
      "فعّل هذا للمجتمعات الصغيرة حيث قد تكشف الإجابات من هو كل شخص، مثل وجود عدد قليل فقط من النساء في فريق أو عدد قليل فقط من أشخاص فريق محدد.",
    ],
    publicAggregateSuppressionLearnMoreTitle: "حول النتائج العامة المخفية",
    publicAggregateSuppressionConfirmTitle: "تفعيل إخفاء النتائج العامة؟",
    publicAggregateSuppressionConfirmMessage: {
      beforeEmphasis: "بعد حفظ هذا الاستبيان مع تفعيل إخفاء النتائج العامة، ",
      emphasis: "لن تتمكن من إيقافه لهذا السؤال",
      afterEmphasis: ". سيرى المشاركون ذلك كضمان للخصوصية.",
    },
    publicAggregateSuppressionConfirmButtonLabel: "تفعيل",
  },
  es: {
    publicAggregateSuppressionLabel: ({ maxHiddenResponses }) =>
      `Ocultar resultados públicos cuando alguna opción tenga 1-${String(maxHiddenResponses)} respuestas contabilizadas`,
    publicAggregateSuppressionSummary:
      "Recomendado para comunidades pequeñas donde las respuestas podrían revelar quién es quién.",
    publicAggregateSuppressionHintParagraphs: ({
      maxHiddenResponses,
      threshold,
    }) => [
      "Se aplica por separado al conjunto de participantes y a cada grupo de opinión.",
      `Si alguna opción de esta pregunta tiene 1-${String(maxHiddenResponses)} respuestas contabilizadas, los recuentos y porcentajes públicos de toda la pregunta se ocultan en ese bloque. Las opciones con 0 o ${String(threshold)}+ respuestas no activan la ocultación.`,
      "Las personas facilitadoras aún pueden ver los resultados agregados completos.",
      "Actívalo para comunidades pequeñas donde las respuestas podrían revelar quién es quién, por ejemplo si solo hay unas pocas mujeres en un equipo o unas pocas personas de un equipo concreto.",
    ],
    publicAggregateSuppressionLearnMoreTitle:
      "Acerca de los resultados públicos ocultos",
    publicAggregateSuppressionConfirmTitle:
      "¿Activar resultados públicos ocultos?",
    publicAggregateSuppressionConfirmMessage: {
      beforeEmphasis:
        "Después de guardar esta encuesta con resultados públicos ocultos, ",
      emphasis: "no podrás desactivarlo para esta pregunta",
      afterEmphasis:
        ". Las personas participantes lo verán como una garantía de privacidad.",
    },
    publicAggregateSuppressionConfirmButtonLabel: "Activar",
  },
  fa: {
    publicAggregateSuppressionLabel: ({ maxHiddenResponses }) =>
      `پنهان کردن نتایج عمومی وقتی هر گزینه 1-${String(maxHiddenResponses)} پاسخِ شمرده‌شده دارد`,
    publicAggregateSuppressionSummary:
      "برای جوامع کوچک توصیه می‌شود، جایی که پاسخ‌ها ممکن است هویت افراد را آشکار کند.",
    publicAggregateSuppressionHintParagraphs: ({
      maxHiddenResponses,
      threshold,
    }) => [
      "به‌طور جداگانه برای همهٔ پاسخ‌دهندگان و هر گروه نظر اعمال می‌شود.",
      `اگر هر گزینهٔ این پرسش 1-${String(maxHiddenResponses)} پاسخ شمرده‌شده داشته باشد، شمارش‌ها و درصدهای عمومی کل پرسش در آن بخش پنهان می‌شوند. گزینه‌های با 0 یا ${String(threshold)}+ پاسخ باعث پنهان‌سازی نمی‌شوند.`,
      "تسهیل‌گران همچنان می‌توانند نتایج تجمیعی کامل را ببینند.",
      "این گزینه را برای جوامع کوچک فعال کنید، جایی که پاسخ‌ها ممکن است هویت افراد را آشکار کند؛ مثلاً وقتی فقط چند زن در یک تیم یا فقط چند نفر از یک تیم خاص حضور دارند.",
    ],
    publicAggregateSuppressionLearnMoreTitle: "دربارهٔ نتایج عمومی پنهان‌شده",
    publicAggregateSuppressionConfirmTitle: "نتایج عمومی پنهان فعال شود؟",
    publicAggregateSuppressionConfirmMessage: {
      beforeEmphasis: "پس از ذخیرهٔ این نظرسنجی با نتایج عمومی پنهان‌شده، ",
      emphasis: "دیگر نمی‌توانید آن را برای این پرسش خاموش کنید",
      afterEmphasis:
        ". شرکت‌کنندگان آن را به‌عنوان تضمین حریم خصوصی خواهند دید.",
    },
    publicAggregateSuppressionConfirmButtonLabel: "فعال کردن",
  },
  fr: {
    publicAggregateSuppressionLabel: ({ maxHiddenResponses }) =>
      `Masquer les résultats publics lorsqu'une option compte 1 à ${String(maxHiddenResponses)} réponses comptabilisées`,
    publicAggregateSuppressionSummary:
      "Recommandé pour les petites communautés où les réponses pourraient révéler qui est qui.",
    publicAggregateSuppressionHintParagraphs: ({
      maxHiddenResponses,
      threshold,
    }) => [
      "S'applique séparément à l'ensemble des répondants et à chaque groupe d'opinion.",
      `Si une option de cette question compte 1 à ${String(maxHiddenResponses)} réponses comptabilisées, les nombres et pourcentages publics de toute la question sont masqués dans ce bloc. Les options avec 0 ou ${String(threshold)} réponses ou plus ne déclenchent pas le masquage.`,
      "Les facilitateurs peuvent toujours voir les résultats agrégés complets.",
      "Activez cette option pour les petites communautés où les réponses pourraient révéler qui est qui, par exemple lorsqu'il n'y a que quelques femmes dans une équipe ou seulement quelques personnes d'une équipe précise.",
    ],
    publicAggregateSuppressionLearnMoreTitle:
      "À propos des résultats publics masqués",
    publicAggregateSuppressionConfirmTitle:
      "Activer le masquage des résultats publics ?",
    publicAggregateSuppressionConfirmMessage: {
      beforeEmphasis:
        "Après avoir enregistré ce questionnaire avec le masquage des résultats publics activé, ",
      emphasis: "vous ne pourrez plus le désactiver pour cette question",
      afterEmphasis:
        ". Les participants le verront comme une garantie de confidentialité.",
    },
    publicAggregateSuppressionConfirmButtonLabel: "Activer",
  },
  he: {
    publicAggregateSuppressionLabel: ({ maxHiddenResponses }) =>
      `הסתרת תוצאות ציבוריות כאשר לאפשרות כלשהי יש 1-${String(maxHiddenResponses)} תשובות שנספרו`,
    publicAggregateSuppressionSummary:
      "מומלץ לקהילות קטנות שבהן תשובות עלולות לחשוף מי הוא מי.",
    publicAggregateSuppressionHintParagraphs: ({
      maxHiddenResponses,
      threshold,
    }) => [
      "חל בנפרד על כלל המשיבים ועל כל קבוצת דעה.",
      `אם לאפשרות כלשהי בשאלה זו יש 1-${String(maxHiddenResponses)} תשובות שנספרו, הספירות והאחוזים הציבוריים של כל השאלה מוסתרים באותו מקטע. אפשרויות עם 0 או ${String(threshold)}+ תשובות אינן מפעילות הסתרה.`,
      "המנחים עדיין יכולים לראות את התוצאות המצטברות המלאות.",
      "הפעילו זאת בקהילות קטנות שבהן תשובות עלולות לחשוף מי הוא מי, למשל כשיש רק מעט נשים בצוות או רק מעט אנשים מצוות מסוים.",
    ],
    publicAggregateSuppressionLearnMoreTitle: "על תוצאות ציבוריות מוסתרות",
    publicAggregateSuppressionConfirmTitle: "להפעיל הסתרת תוצאות ציבוריות?",
    publicAggregateSuppressionConfirmMessage: {
      beforeEmphasis: "לאחר שמירת הסקר עם הסתרת תוצאות ציבוריות מופעלת, ",
      emphasis: "לא ניתן יהיה לכבות אותה עבור שאלה זו",
      afterEmphasis: ". המשתתפים יראו בכך הבטחת פרטיות.",
    },
    publicAggregateSuppressionConfirmButtonLabel: "הפעלה",
  },
  ja: {
    publicAggregateSuppressionLabel: ({ maxHiddenResponses }) =>
      `いずれかの選択肢に1〜${String(maxHiddenResponses)}件の集計対象回答がある場合、公開結果を非表示にする`,
    publicAggregateSuppressionSummary:
      "回答から個人が推測されるおそれのある小規模なコミュニティにおすすめです。",
    publicAggregateSuppressionHintParagraphs: ({
      maxHiddenResponses,
      threshold,
    }) => [
      "全体の回答者と各意見グループに別々に適用されます。",
      `この設問のいずれかの選択肢に1〜${String(maxHiddenResponses)}件の集計対象回答がある場合、そのブロックでは設問全体の公開カウントと割合が非表示になります。0件または${String(threshold)}件以上の選択肢だけでは非表示になりません。`,
      "ファシリテーターは完全な集計結果を引き続き確認できます。",
      "回答から個人が推測されるおそれのある小規模なコミュニティで有効にしてください。たとえば、チーム内の女性が数人だけの場合や、特定チームのメンバーが数人だけの場合などです。",
    ],
    publicAggregateSuppressionLearnMoreTitle: "非表示の公開結果について",
    publicAggregateSuppressionConfirmTitle:
      "公開結果の非表示を有効にしますか？",
    publicAggregateSuppressionConfirmMessage: {
      beforeEmphasis:
        "公開結果の非表示を有効にしてこのアンケートを保存すると、",
      emphasis: "この設問では後から無効にできません",
      afterEmphasis: "。参加者にはプライバシー保証として表示されます。",
    },
    publicAggregateSuppressionConfirmButtonLabel: "有効にする",
  },
  ky: {
    publicAggregateSuppressionLabel: ({ maxHiddenResponses }) =>
      `Кайсы бир вариантта 1-${String(maxHiddenResponses)} эсептелген жооп болсо, коомдук жыйынтыктарды жашыруу`,
    publicAggregateSuppressionSummary:
      "Жооптор ким экенин ачып коюшу мүмкүн болгон чакан жамааттар үчүн сунушталат.",
    publicAggregateSuppressionHintParagraphs: ({
      maxHiddenResponses,
      threshold,
    }) => [
      "Бардык жооп бергендерге жана ар бир пикир тобуна өз-өзүнчө колдонулат.",
      `Бул суроодогу кайсы бир вариантта 1-${String(maxHiddenResponses)} эсептелген жооп болсо, ошол блокто бүт суроонун коомдук сандары жана пайыздары жашырылат. 0 же ${String(threshold)}+ жооп бар варианттар жашырууну иштетпейт.`,
      "Фасилитаторлор толук агрегатталган жыйынтыктарды дагы эле көрө алышат.",
      "Жооптор ким экенин ачып коюшу мүмкүн болгон чакан жамааттарда муну күйгүзүңүз, мисалы командада аялдар аз болсо же белгилүү бир командадан бир нече эле адам болсо.",
    ],
    publicAggregateSuppressionLearnMoreTitle:
      "Жашырылган коомдук жыйынтыктар жөнүндө",
    publicAggregateSuppressionConfirmTitle:
      "Коомдук жыйынтыктарды жашырууну күйгүзөсүзбү?",
    publicAggregateSuppressionConfirmMessage: {
      beforeEmphasis:
        "Бул сурамжылоону коомдук жыйынтыктарды жашыруу күйгүзүлгөн бойдон сактагандан кийин, ",
      emphasis: "бул суроо үчүн аны өчүрө албайсыз",
      afterEmphasis: ". Катышуучулар муну купуялык кепилдиги катары көрүшөт.",
    },
    publicAggregateSuppressionConfirmButtonLabel: "Күйгүзүү",
  },
  ru: {
    publicAggregateSuppressionLabel: ({ maxHiddenResponses }) =>
      `Скрывать публичные результаты, если у любого варианта есть 1–${String(maxHiddenResponses)} учтённых ответа`,
    publicAggregateSuppressionSummary:
      "Рекомендуется для небольших сообществ, где ответы могут раскрыть, кто есть кто.",
    publicAggregateSuppressionHintParagraphs: ({
      maxHiddenResponses,
      threshold,
    }) => [
      "Применяется отдельно ко всем ответившим и к каждой группе мнений.",
      `Если у любого варианта этого вопроса есть 1–${String(maxHiddenResponses)} учтённых ответа, публичные числа и проценты для всего вопроса скрываются в этом блоке. Варианты с 0 или ${String(threshold)}+ ответами сами по себе не запускают скрытие.`,
      "Фасилитаторы всё равно могут видеть полные агрегированные результаты.",
      "Включайте это для небольших сообществ, где ответы могут раскрыть, кто есть кто, например если в команде всего несколько женщин или только несколько человек из конкретной команды.",
    ],
    publicAggregateSuppressionLearnMoreTitle: "О скрытых публичных результатах",
    publicAggregateSuppressionConfirmTitle:
      "Включить скрытие публичных результатов?",
    publicAggregateSuppressionConfirmMessage: {
      beforeEmphasis:
        "После сохранения этого опроса со скрытием публичных результатов ",
      emphasis: "вы не сможете отключить его для этого вопроса",
      afterEmphasis:
        ". Участники будут воспринимать это как гарантию приватности.",
    },
    publicAggregateSuppressionConfirmButtonLabel: "Включить",
  },
  "zh-Hans": {
    publicAggregateSuppressionLabel: ({ maxHiddenResponses }) =>
      `当任一选项有 1-${String(maxHiddenResponses)} 个计入回答时隐藏公开结果`,
    publicAggregateSuppressionSummary:
      "建议用于小型社区，因为回答可能暴露谁是谁。",
    publicAggregateSuppressionHintParagraphs: ({
      maxHiddenResponses,
      threshold,
    }) => [
      "分别适用于所有回答者和每个意见群组。",
      `如果此问题的任一选项有 1-${String(maxHiddenResponses)} 个计入回答，该区块中整个问题的公开计数和百分比都会隐藏。0 个或 ${String(threshold)}+ 个回答的选项不会触发隐藏。`,
      "主持人仍然可以查看完整的聚合结果。",
      "请在回答可能暴露身份的小型社区中启用，例如团队中只有少数女性，或只有少数人来自某个特定团队。",
    ],
    publicAggregateSuppressionLearnMoreTitle: "关于隐藏的公开结果",
    publicAggregateSuppressionConfirmTitle: "启用公开结果隐藏？",
    publicAggregateSuppressionConfirmMessage: {
      beforeEmphasis: "保存此问卷并启用公开结果隐藏后，",
      emphasis: "你将无法再为此问题关闭它",
      afterEmphasis: "。参与者会将其视为一项隐私保障。",
    },
    publicAggregateSuppressionConfirmButtonLabel: "启用",
  },
  "zh-Hant": {
    publicAggregateSuppressionLabel: ({ maxHiddenResponses }) =>
      `當任一選項有 1-${String(maxHiddenResponses)} 個計入回答時隱藏公開結果`,
    publicAggregateSuppressionSummary:
      "建議用於小型社群，因為回答可能暴露誰是誰。",
    publicAggregateSuppressionHintParagraphs: ({
      maxHiddenResponses,
      threshold,
    }) => [
      "分別適用於所有回答者和每個意見群組。",
      `如果此問題的任一選項有 1-${String(maxHiddenResponses)} 個計入回答，該區塊中整個問題的公開計數和百分比都會被隱藏。0 個或 ${String(threshold)}+ 個回答的選項不會觸發隱藏。`,
      "主持人仍然可以查看完整的彙總結果。",
      "請在回答可能暴露身分的小型社群中啟用，例如團隊中只有少數女性，或只有少數人來自某個特定團隊。",
    ],
    publicAggregateSuppressionLearnMoreTitle: "關於隱藏的公開結果",
    publicAggregateSuppressionConfirmTitle: "啟用公開結果隱藏？",
    publicAggregateSuppressionConfirmMessage: {
      beforeEmphasis: "儲存此問卷並啟用公開結果隱藏後，",
      emphasis: "你將無法再為此問題關閉它",
      afterEmphasis: "。參與者會將其視為一項隱私保障。",
    },
    publicAggregateSuppressionConfirmButtonLabel: "啟用",
  },
};
