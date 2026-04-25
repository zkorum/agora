import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ConversationSurveyQuestionTranslations {
  failedToLoadSurveyTitle: string;
  tryAgainLabel: string;
  conversationSurveyTitle: string;
  questionProgress: string;
  needsUpdateLabel: string;
  requiredLabel: string;
  optionalLabel: string;
  selectOptionLabel: string;
  writeAnswerPlaceholder: string;
  previousLabel: string;
  finishLaterLabel: string;
  nextLabel: string;
  reviewAnswersLabel: string;
  multiChoiceBetweenDescription: string;
  multiChoiceAtLeastDescription: string;
  optionalMultiChoiceBetweenDescription: string;
  optionalMultiChoiceAtLeastDescription: string;
  chooseOneOptionDescription: string;
  chooseZeroOrOneOptionDescription: string;
  writeAnswerDescription: string;
  freeTextHelp: string;
  conversationClosedMessage: string;
  failedToSaveAnswerMessage: string;
}

export const conversationSurveyQuestionTranslations: Record<
  SupportedDisplayLanguageCodes,
  ConversationSurveyQuestionTranslations
> = {
  en: {
    failedToLoadSurveyTitle: "Failed to load survey",
    tryAgainLabel: "Try again",
    conversationSurveyTitle: "Conversation survey",
    questionProgress: "Question {current} of {total}",
    needsUpdateLabel: "Needs update",
    requiredLabel: "Required",
    optionalLabel: "Optional",
    selectOptionLabel: "Select an option",
    writeAnswerPlaceholder: "Write your answer",
    previousLabel: "Previous",
    finishLaterLabel: "Finish later",
    nextLabel: "Next",
    reviewAnswersLabel: "Review answers",
    multiChoiceBetweenDescription:
      "Choose between {min} and {max} options.",
    multiChoiceAtLeastDescription: "Choose at least {min} options.",
    optionalMultiChoiceBetweenDescription:
      "Leave blank or choose between {min} and {max} options.",
    optionalMultiChoiceAtLeastDescription:
      "Leave blank or choose at least {min} options.",
    chooseOneOptionDescription: "Choose one option.",
    chooseZeroOrOneOptionDescription: "Choose zero or one option.",
    writeAnswerDescription: "Write your answer below.",
    freeTextHelp:
      "{count} / {max} characters. Minimum {min} when answered.",
    conversationClosedMessage:
      "This conversation is no longer open for participation.",
    failedToSaveAnswerMessage: "Failed to save your answer.",
  },
  ar: {
    failedToLoadSurveyTitle: "فشل تحميل الاستبيان",
    tryAgainLabel: "حاول مرة أخرى",
    conversationSurveyTitle: "استبيان المحادثة",
    questionProgress: "السؤال {current} من {total}",
    needsUpdateLabel: "يحتاج إلى تحديث",
    requiredLabel: "مطلوب",
    optionalLabel: "اختياري",
    selectOptionLabel: "اختر خيارًا",
    writeAnswerPlaceholder: "اكتب إجابتك",
    previousLabel: "السابق",
    finishLaterLabel: "أكمل لاحقًا",
    nextLabel: "التالي",
    reviewAnswersLabel: "مراجعة الإجابات",
    multiChoiceBetweenDescription:
      "اختر بين {min} و {max} خيارات.",
    multiChoiceAtLeastDescription: "اختر {min} خيارات على الأقل.",
    optionalMultiChoiceBetweenDescription:
      "اتركه فارغًا أو اختر بين {min} و {max} خيارات.",
    optionalMultiChoiceAtLeastDescription:
      "اتركه فارغًا أو اختر {min} خيارات على الأقل.",
    chooseOneOptionDescription: "اختر خيارًا واحدًا.",
    chooseZeroOrOneOptionDescription: "اختر صفرًا أو خيارًا واحدًا.",
    writeAnswerDescription: "اكتب إجابتك أدناه.",
    freeTextHelp:
      "{count} / {max} حرفًا. الحد الأدنى {min} عند الإجابة.",
    conversationClosedMessage:
      "لم تعد هذه المحادثة مفتوحة للمشاركة.",
    failedToSaveAnswerMessage: "فشل حفظ إجابتك.",
  },
  es: {
    failedToLoadSurveyTitle: "No se pudo cargar la encuesta",
    tryAgainLabel: "Intentar de nuevo",
    conversationSurveyTitle: "Encuesta de la conversación",
    questionProgress: "Pregunta {current} de {total}",
    needsUpdateLabel: "Necesita actualización",
    requiredLabel: "Obligatoria",
    optionalLabel: "Opcional",
    selectOptionLabel: "Selecciona una opción",
    writeAnswerPlaceholder: "Escribe tu respuesta",
    previousLabel: "Anterior",
    finishLaterLabel: "Terminar después",
    nextLabel: "Siguiente",
    reviewAnswersLabel: "Revisar respuestas",
    multiChoiceBetweenDescription:
      "Elige entre {min} y {max} opciones.",
    multiChoiceAtLeastDescription: "Elige al menos {min} opciones.",
    optionalMultiChoiceBetweenDescription:
      "Déjalo en blanco o elige entre {min} y {max} opciones.",
    optionalMultiChoiceAtLeastDescription:
      "Déjalo en blanco o elige al menos {min} opciones.",
    chooseOneOptionDescription: "Elige una opción.",
    chooseZeroOrOneOptionDescription: "Elige cero o una opción.",
    writeAnswerDescription: "Escribe tu respuesta abajo.",
    freeTextHelp:
      "{count} / {max} caracteres. Mínimo {min} al responder.",
    conversationClosedMessage:
      "Esta conversación ya no está abierta para participar.",
    failedToSaveAnswerMessage: "No se pudo guardar tu respuesta.",
  },
  fa: {
    failedToLoadSurveyTitle: "بارگیری نظرسنجی انجام نشد",
    tryAgainLabel: "تلاش دوباره",
    conversationSurveyTitle: "نظرسنجی گفتگو",
    questionProgress: "پرسش {current} از {total}",
    needsUpdateLabel: "نیاز به به‌روزرسانی دارد",
    requiredLabel: "الزامی",
    optionalLabel: "اختیاری",
    selectOptionLabel: "یک گزینه انتخاب کنید",
    writeAnswerPlaceholder: "پاسخ خود را بنویسید",
    previousLabel: "قبلی",
    finishLaterLabel: "بعداً ادامه می‌دهم",
    nextLabel: "بعدی",
    reviewAnswersLabel: "مرور پاسخ‌ها",
    multiChoiceBetweenDescription:
      "بین {min} تا {max} گزینه را انتخاب کنید.",
    multiChoiceAtLeastDescription: "حداقل {min} گزینه را انتخاب کنید.",
    optionalMultiChoiceBetweenDescription:
      "خالی بگذارید یا بین {min} تا {max} گزینه را انتخاب کنید.",
    optionalMultiChoiceAtLeastDescription:
      "خالی بگذارید یا حداقل {min} گزینه را انتخاب کنید.",
    chooseOneOptionDescription: "یک گزینه انتخاب کنید.",
    chooseZeroOrOneOptionDescription: "صفر یا یک گزینه را انتخاب کنید.",
    writeAnswerDescription: "پاسخ خود را در پایین بنویسید.",
    freeTextHelp:
      "{count} / {max} نویسه. حداقل {min} هنگام پاسخ‌دادن.",
    conversationClosedMessage:
      "این گفتگو دیگر برای مشارکت باز نیست.",
    failedToSaveAnswerMessage: "ذخیره پاسخ شما انجام نشد.",
  },
  fr: {
    failedToLoadSurveyTitle: "Impossible de charger le questionnaire",
    tryAgainLabel: "Réessayer",
    conversationSurveyTitle: "Questionnaire de la conversation",
    questionProgress: "Question {current} sur {total}",
    needsUpdateLabel: "À mettre à jour",
    requiredLabel: "Requis",
    optionalLabel: "Facultatif",
    selectOptionLabel: "Choisissez une option",
    writeAnswerPlaceholder: "Écrivez votre réponse",
    previousLabel: "Précédent",
    finishLaterLabel: "Terminer plus tard",
    nextLabel: "Suivant",
    reviewAnswersLabel: "Voir les réponses",
    multiChoiceBetweenDescription:
      "Choisissez entre {min} et {max} options.",
    multiChoiceAtLeastDescription: "Choisissez au moins {min} options.",
    optionalMultiChoiceBetweenDescription:
      "Laissez vide ou choisissez entre {min} et {max} options.",
    optionalMultiChoiceAtLeastDescription:
      "Laissez vide ou choisissez au moins {min} options.",
    chooseOneOptionDescription: "Choisissez une option.",
    chooseZeroOrOneOptionDescription: "Choisissez zéro ou une option.",
    writeAnswerDescription: "Écrivez votre réponse ci-dessous.",
    freeTextHelp:
      "{count} / {max} caractères. Minimum {min} si vous répondez.",
    conversationClosedMessage:
      "Cette conversation n'est plus ouverte à la participation.",
    failedToSaveAnswerMessage: "Impossible d'enregistrer votre réponse.",
  },
  he: {
    failedToLoadSurveyTitle: "טעינת הסקר נכשלה",
    tryAgainLabel: "לנסות שוב",
    conversationSurveyTitle: "סקר השיחה",
    questionProgress: "שאלה {current} מתוך {total}",
    needsUpdateLabel: "דורש עדכון",
    requiredLabel: "נדרש",
    optionalLabel: "אופציונלי",
    selectOptionLabel: "בחרו אפשרות",
    writeAnswerPlaceholder: "כתבו את התשובה שלכם",
    previousLabel: "הקודם",
    finishLaterLabel: "לסיים אחר כך",
    nextLabel: "הבא",
    reviewAnswersLabel: "עיון בתשובות",
    multiChoiceBetweenDescription:
      "בחרו בין {min} ל-{max} אפשרויות.",
    multiChoiceAtLeastDescription: "בחרו לפחות {min} אפשרויות.",
    optionalMultiChoiceBetweenDescription:
      "השאירו ריק או בחרו בין {min} ל-{max} אפשרויות.",
    optionalMultiChoiceAtLeastDescription:
      "השאירו ריק או בחרו לפחות {min} אפשרויות.",
    chooseOneOptionDescription: "בחרו אפשרות אחת.",
    chooseZeroOrOneOptionDescription: "בחרו אפס או אפשרות אחת.",
    writeAnswerDescription: "כתבו את התשובה שלכם למטה.",
    freeTextHelp:
      "{count} / {max} תווים. מינימום {min} כשעונים.",
    conversationClosedMessage:
      "השיחה הזו כבר לא פתוחה להשתתפות.",
    failedToSaveAnswerMessage: "שמירת התשובה נכשלה.",
  },
  ja: {
    failedToLoadSurveyTitle: "アンケートを読み込めませんでした",
    tryAgainLabel: "もう一度試す",
    conversationSurveyTitle: "会話アンケート",
    questionProgress: "質問 {current} / {total}",
    needsUpdateLabel: "更新が必要",
    requiredLabel: "必須",
    optionalLabel: "任意",
    selectOptionLabel: "選択してください",
    writeAnswerPlaceholder: "回答を入力してください",
    previousLabel: "前へ",
    finishLaterLabel: "あとで続ける",
    nextLabel: "次へ",
    reviewAnswersLabel: "回答を確認",
    multiChoiceBetweenDescription:
      "{min} から {max} 個の選択肢を選んでください。",
    multiChoiceAtLeastDescription: "少なくとも {min} 個選んでください。",
    optionalMultiChoiceBetweenDescription:
      "空欄のままにするか、{min} から {max} 個の選択肢を選んでください。",
    optionalMultiChoiceAtLeastDescription:
      "空欄のままにするか、少なくとも {min} 個選んでください。",
    chooseOneOptionDescription: "1 つ選んでください。",
    chooseZeroOrOneOptionDescription: "0 個または 1 個の選択肢を選んでください。",
    writeAnswerDescription: "下に回答を入力してください。",
    freeTextHelp:
      "{count} / {max} 文字。回答する場合の最小文字数は {min} です。",
    conversationClosedMessage:
      "この会話はもう参加受付中ではありません。",
    failedToSaveAnswerMessage: "回答を保存できませんでした。",
  },
  ky: {
    failedToLoadSurveyTitle: "Сурамжылоону жүктөө ишке ашкан жок",
    tryAgainLabel: "Кайра аракет кылуу",
    conversationSurveyTitle: "Сүйлөшүүнүн сурамжылоосу",
    questionProgress: "Суроо {current} / {total}",
    needsUpdateLabel: "Жаңыртуу керек",
    requiredLabel: "Милдеттүү",
    optionalLabel: "Ыктыярдуу",
    selectOptionLabel: "Бир вариант тандаңыз",
    writeAnswerPlaceholder: "Жообуңузду жазыңыз",
    previousLabel: "Мурунку",
    finishLaterLabel: "Кийин бүтүрөм",
    nextLabel: "Кийинки",
    reviewAnswersLabel: "Жоопторду көрүү",
    multiChoiceBetweenDescription:
      "{min} менен {max} ортосунда вариант тандаңыз.",
    multiChoiceAtLeastDescription: "Жок дегенде {min} вариант тандаңыз.",
    optionalMultiChoiceBetweenDescription:
      "Бош калтырыңыз же {min} менен {max} ортосунда вариант тандаңыз.",
    optionalMultiChoiceAtLeastDescription:
      "Бош калтырыңыз же жок дегенде {min} вариант тандаңыз.",
    chooseOneOptionDescription: "Бир вариант тандаңыз.",
    chooseZeroOrOneOptionDescription: "Нөл же бир вариант тандаңыз.",
    writeAnswerDescription: "Төмөндө жообуңузду жазыңыз.",
    freeTextHelp:
      "{count} / {max} белги. Жооп берсеңиз, кеминде {min} керек.",
    conversationClosedMessage:
      "Бул сүйлөшүү мындан ары катышууга ачык эмес.",
    failedToSaveAnswerMessage: "Жообуңузду сактоо ишке ашкан жок.",
  },
  ru: {
    failedToLoadSurveyTitle: "Не удалось загрузить опрос",
    tryAgainLabel: "Попробовать снова",
    conversationSurveyTitle: "Опрос беседы",
    questionProgress: "Вопрос {current} из {total}",
    needsUpdateLabel: "Требует обновления",
    requiredLabel: "Обязательный",
    optionalLabel: "Необязательный",
    selectOptionLabel: "Выберите вариант",
    writeAnswerPlaceholder: "Напишите ваш ответ",
    previousLabel: "Назад",
    finishLaterLabel: "Закончить позже",
    nextLabel: "Далее",
    reviewAnswersLabel: "Просмотреть ответы",
    multiChoiceBetweenDescription:
      "Выберите от {min} до {max} вариантов.",
    multiChoiceAtLeastDescription:
      "Выберите как минимум {min} вариантов.",
    optionalMultiChoiceBetweenDescription:
      "Оставьте пустым или выберите от {min} до {max} вариантов.",
    optionalMultiChoiceAtLeastDescription:
      "Оставьте пустым или выберите как минимум {min} вариантов.",
    chooseOneOptionDescription: "Выберите один вариант.",
    chooseZeroOrOneOptionDescription: "Выберите ноль или один вариант.",
    writeAnswerDescription: "Напишите ваш ответ ниже.",
    freeTextHelp:
      "{count} / {max} символов. Минимум {min}, если отвечаете.",
    conversationClosedMessage:
      "Эта беседа больше не открыта для участия.",
    failedToSaveAnswerMessage: "Не удалось сохранить ваш ответ.",
  },
  "zh-Hans": {
    failedToLoadSurveyTitle: "无法加载问卷",
    tryAgainLabel: "重试",
    conversationSurveyTitle: "对话问卷",
    questionProgress: "第 {current} 题，共 {total} 题",
    needsUpdateLabel: "需要更新",
    requiredLabel: "必答",
    optionalLabel: "可选",
    selectOptionLabel: "请选择一个选项",
    writeAnswerPlaceholder: "请输入你的回答",
    previousLabel: "上一题",
    finishLaterLabel: "稍后继续",
    nextLabel: "下一题",
    reviewAnswersLabel: "查看回答",
    multiChoiceBetweenDescription: "请选择 {min} 到 {max} 个选项。",
    multiChoiceAtLeastDescription: "请至少选择 {min} 个选项。",
    optionalMultiChoiceBetweenDescription:
      "可留空，或选择 {min} 到 {max} 个选项。",
    optionalMultiChoiceAtLeastDescription:
      "可留空，或至少选择 {min} 个选项。",
    chooseOneOptionDescription: "请选择一个选项。",
    chooseZeroOrOneOptionDescription: "请选择零个或一个选项。",
    writeAnswerDescription: "请在下方填写你的回答。",
    freeTextHelp:
      "{count} / {max} 个字符。作答时最少需要 {min} 个字符。",
    conversationClosedMessage: "这场对话已不再开放参与。",
    failedToSaveAnswerMessage: "无法保存你的回答。",
  },
  "zh-Hant": {
    failedToLoadSurveyTitle: "無法載入問卷",
    tryAgainLabel: "重試",
    conversationSurveyTitle: "對話問卷",
    questionProgress: "第 {current} 題，共 {total} 題",
    needsUpdateLabel: "需要更新",
    requiredLabel: "必答",
    optionalLabel: "可選",
    selectOptionLabel: "請選擇一個選項",
    writeAnswerPlaceholder: "請輸入你的回答",
    previousLabel: "上一題",
    finishLaterLabel: "稍後繼續",
    nextLabel: "下一題",
    reviewAnswersLabel: "查看回答",
    multiChoiceBetweenDescription: "請選擇 {min} 到 {max} 個選項。",
    multiChoiceAtLeastDescription: "請至少選擇 {min} 個選項。",
    optionalMultiChoiceBetweenDescription:
      "可留空，或選擇 {min} 到 {max} 個選項。",
    optionalMultiChoiceAtLeastDescription:
      "可留空，或至少選擇 {min} 個選項。",
    chooseOneOptionDescription: "請選擇一個選項。",
    chooseZeroOrOneOptionDescription: "請選擇零個或一個選項。",
    writeAnswerDescription: "請在下方填寫你的回答。",
    freeTextHelp:
      "{count} / {max} 個字元。作答時最少需要 {min} 個字元。",
    conversationClosedMessage: "這場對話已不再開放參與。",
    failedToSaveAnswerMessage: "無法儲存你的回答。",
  },
};
