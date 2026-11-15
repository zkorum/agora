import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface PairwiseVotingTranslations {
  title: string;
  choose: string;
  selected: string;
  details: string;
  contentUnavailable: string;
  how: string;
  why: string;
  scoring: string;
}

export const pairwiseVotingTranslations: Record<
  SupportedDisplayLanguageCodes,
  PairwiseVotingTranslations
> = {
  en: {
    title: "Choose the statement you would prioritise",
    choose: "Choose this statement",
    selected: "Selected",
    details: "View details",
    contentUnavailable: "Statement content is not available yet.",
    how: "Compare two statements and choose the one you would prioritise. Each choice is saved automatically. Use Undo to change your last choice.",
    why: "The system selects pairs that still need comparing and skips comparisons it can infer from your previous choices. Every choice contributes to the analysis.",
    scoring:
      "Your choices are converted into preference scores using a mathematical model. Solidago, an open-source aggregation algorithm, combines these scores with other participants’ contributions, weighted by trust level.",
  },
  fr: {
    title: "Choisissez la proposition à prioriser",
    choose: "Choisir cette proposition",
    selected: "Sélectionnée",
    details: "Voir les détails",
    contentUnavailable:
      "Le contenu de la proposition n’est pas encore disponible.",
    how: "Comparez deux propositions et choisissez celle à prioriser. Chaque choix est enregistré automatiquement. Utilisez Annuler pour modifier votre dernier choix.",
    why: "Le système sélectionne les paires à comparer et évite les comparaisons qu’il peut déduire de vos choix précédents. Chaque choix contribue à l’analyse.",
    scoring:
      "Un modèle mathématique convertit vos choix en scores de préférence. Solidago, un algorithme d’agrégation open source, combine ces scores avec les contributions des autres participants, pondérées par leur niveau de confiance.",
  },
  es: {
    title: "Elige la propuesta que priorizarías",
    choose: "Elegir esta propuesta",
    selected: "Seleccionada",
    details: "Ver detalles",
    contentUnavailable: "El contenido de la propuesta aún no está disponible.",
    how: "Compara dos propuestas y elige la que priorizarías. Cada elección se guarda automáticamente. Usa Deshacer para cambiar tu última elección.",
    why: "El sistema selecciona pares pendientes y omite comparaciones que puede deducir de tus elecciones anteriores. Cada elección contribuye al análisis.",
    scoring:
      "Un modelo matemático convierte tus elecciones en puntuaciones de preferencia. Solidago, un algoritmo de agregación de código abierto, combina estas puntuaciones con las aportaciones de otros participantes, ponderadas por su nivel de confianza.",
  },
  ar: {
    title: "اختر المقترح الذي ستعطيه الأولوية",
    choose: "اختر هذا المقترح",
    selected: "تم الاختيار",
    details: "عرض التفاصيل",
    contentUnavailable: "محتوى المقترح غير متاح بعد.",
    how: "قارن بين مقترحين واختر الذي ستعطيه الأولوية. يُحفظ كل اختيار تلقائياً. استخدم التراجع لتغيير اختيارك الأخير.",
    why: "يختار النظام الأزواج التي لا تزال بحاجة إلى مقارنة ويتخطى المقارنات التي يمكن استنتاجها من اختياراتك السابقة. يساهم كل اختيار في التحليل.",
    scoring:
      "يحوّل نموذج رياضي اختياراتك إلى درجات تفضيل. يجمع Solidago، وهو خوارزمية تجميع مفتوحة المصدر، هذه الدرجات مع مساهمات المشاركين الآخرين مرجّحة بمستوى الثقة.",
  },
  fa: {
    title: "گزاره‌ای را که در اولویت قرار می‌دهید انتخاب کنید",
    choose: "انتخاب این گزاره",
    selected: "انتخاب شد",
    details: "مشاهده جزئیات",
    contentUnavailable: "محتوای گزاره هنوز در دسترس نیست.",
    how: "دو گزاره را مقایسه کنید و آن را که در اولویت قرار می‌دهید انتخاب کنید. هر انتخاب خودکار ذخیره می‌شود. برای تغییر آخرین انتخاب از واگرد استفاده کنید.",
    why: "سامانه جفت‌های نیازمند مقایسه را انتخاب می‌کند و از مقایسه‌های قابل استنتاج از انتخاب‌های قبلی می‌گذرد. هر انتخاب به تحلیل کمک می‌کند.",
    scoring:
      "یک مدل ریاضی انتخاب‌های شما را به امتیاز ترجیح تبدیل می‌کند. Solidago، الگوریتم تجمیع متن‌باز، این امتیازها را با مشارکت دیگران بر اساس سطح اعتماد ترکیب می‌کند.",
  },
  he: {
    title: "בחרו את ההצעה שתעדיפו לתעדף",
    choose: "בחירת ההצעה הזו",
    selected: "נבחרה",
    details: "הצגת פרטים",
    contentUnavailable: "תוכן ההצעה עדיין אינו זמין.",
    how: "השוו שתי הצעות ובחרו את זו שתעדיפו לתעדף. כל בחירה נשמרת אוטומטית. השתמשו בביטול כדי לשנות את הבחירה האחרונה.",
    why: "המערכת בוחרת זוגות שעדיין דורשים השוואה ומדלגת על השוואות שניתן להסיק מבחירות קודמות. כל בחירה תורמת לניתוח.",
    scoring:
      "מודל מתמטי ממיר את הבחירות לציוני העדפה. Solidago, אלגוריתם צבירה בקוד פתוח, משלב אותם עם תרומות משתתפים אחרים בשקלול רמת האמון.",
  },
  ja: {
    title: "優先したい提案を選んでください",
    choose: "この提案を選ぶ",
    selected: "選択済み",
    details: "詳細を見る",
    contentUnavailable: "提案の内容はまだ利用できません。",
    how: "2つの提案を比較し、優先したい方を選びます。選択は自動保存されます。「元に戻す」で直前の選択を変更できます。",
    why: "システムは比較が必要なペアを選び、過去の選択から推測できる比較は省略します。すべての選択が分析に貢献します。",
    scoring:
      "数理モデルが選択を選好スコアに変換します。オープンソースの集約アルゴリズムSolidagoが、信頼度で重み付けした他の参加者の貢献と統合します。",
  },
  ky: {
    title: "Артыкчылык бере турган сунушту тандаңыз",
    choose: "Бул сунушту тандоо",
    selected: "Тандалды",
    details: "Чоо-жайын көрүү",
    contentUnavailable: "Сунуштун мазмуну азырынча жеткиликтүү эмес.",
    how: "Эки сунушту салыштырып, артыкчылык бере турганын тандаңыз. Ар бир тандоо автоматтык түрдө сакталат. Акыркы тандоону өзгөртүү үчүн артка кайтарыңыз.",
    why: "Система дагы салыштыруу керек болгон жуптарды тандап, мурунку тандоолордон чыгарууга мүмкүн болгон салыштырууларды өткөрүп жиберет. Ар бир тандоо талдоого салым кошот.",
    scoring:
      "Математикалык модель тандоолоруңузду артыкчылык упайларына айлантат. Ачык булактуу Solidago алгоритми бул упайларды башка катышуучулардын салымдары менен ишеним деңгээлине жараша бириктирет.",
  },
  ru: {
    title: "Выберите предложение, которому отдали бы приоритет",
    choose: "Выбрать это предложение",
    selected: "Выбрано",
    details: "Подробнее",
    contentUnavailable: "Содержание предложения пока недоступно.",
    how: "Сравните два предложения и выберите приоритетное. Каждый выбор сохраняется автоматически. Используйте отмену, чтобы изменить последний выбор.",
    why: "Система выбирает пары, которые ещё нужно сравнить, и пропускает сравнения, выводимые из предыдущих ответов. Каждый выбор вносит вклад в анализ.",
    scoring:
      "Математическая модель преобразует выбор в оценки предпочтений. Solidago, алгоритм агрегации с открытым исходным кодом, объединяет их с вкладом других участников с учётом уровня доверия.",
  },
  "zh-Hans": {
    title: "选择您会优先考虑的提议",
    choose: "选择此提议",
    selected: "已选择",
    details: "查看详情",
    contentUnavailable: "提议内容尚不可用。",
    how: "比较两项提议，选择您会优先考虑的一项。每次选择都会自动保存。使用撤销可更改上一次选择。",
    why: "系统会选择仍需比较的配对，并跳过可从先前选择中推断的比较。每次选择都会为分析做出贡献。",
    scoring:
      "数学模型将您的选择转换为偏好分数。开源聚合算法 Solidago 将这些分数与其他参与者的贡献结合，并按信任级别加权。",
  },
  "zh-Hant": {
    title: "選擇您會優先考慮的提議",
    choose: "選擇此提議",
    selected: "已選擇",
    details: "查看詳情",
    contentUnavailable: "提議內容尚不可用。",
    how: "比較兩項提議，選擇您會優先考慮的一項。每次選擇都會自動儲存。使用復原可更改上一次選擇。",
    why: "系統會選擇仍需比較的配對，並跳過可從先前選擇中推斷的比較。每次選擇都會為分析做出貢獻。",
    scoring:
      "數學模型將您的選擇轉換為偏好分數。開源彙總演算法 Solidago 將這些分數與其他參與者的貢獻結合，並依信任等級加權。",
  },
};
