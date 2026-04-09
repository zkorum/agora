import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface SurveySuppressedQuestionNoticeTranslations {
  title: string;
  lowCountMessage: string;
  clusterMessage: string;
}

export const surveySuppressedQuestionNoticeTranslations: Record<
  SupportedDisplayLanguageCodes,
  SurveySuppressedQuestionNoticeTranslations
> = {
  en: {
    title: "Suppressed",
    lowCountMessage:
      "Results hidden to protect participant privacy because some answer counts are very low.",
    clusterMessage:
      "Results hidden to protect participant privacy because this opinion-group breakdown could reveal individual answers.",
  },
  ar: {
    title: "محجوب",
    lowCountMessage:
      "تم إخفاء النتائج لحماية خصوصية المشاركين لأن بعض أعداد الإجابات منخفضة جداً.",
    clusterMessage:
      "تم إخفاء النتائج لحماية خصوصية المشاركين لأن هذا التفصيل حسب مجموعة الرأي قد يكشف إجابات فردية.",
  },
  es: {
    title: "Suprimido",
    lowCountMessage:
      "Resultados ocultos para proteger la privacidad de las personas participantes porque algunos recuentos de respuestas son muy bajos.",
    clusterMessage:
      "Resultados ocultos para proteger la privacidad de las personas participantes porque este desglose por grupo de opinión podría revelar respuestas individuales.",
  },
  fa: {
    title: "پنهان‌شده",
    lowCountMessage:
      "نتایج برای حفظ حریم خصوصی شرکت‌کنندگان پنهان شده‌اند، چون بعضی شمارش پاسخ‌ها خیلی کم است.",
    clusterMessage:
      "نتایج برای حفظ حریم خصوصی شرکت‌کنندگان پنهان شده‌اند، چون این تفکیک بر اساس گروه نظر می‌تواند پاسخ‌های فردی را آشکار کند.",
  },
  fr: {
    title: "Masqué",
    lowCountMessage:
      "Résultats masqués pour protéger la vie privée des participants, car certains effectifs de réponses sont très faibles.",
    clusterMessage:
      "Résultats masqués pour protéger la vie privée des participants, car ce détail par groupe d'opinion pourrait révéler des réponses individuelles.",
  },
  he: {
    title: "מוסתר",
    lowCountMessage:
      "התוצאות הוסתרו כדי להגן על פרטיות המשתתפים, משום שחלק מספירות התשובות נמוכות מאוד.",
    clusterMessage:
      "התוצאות הוסתרו כדי להגן על פרטיות המשתתפים, משום שפירוט זה לפי קבוצת דעה עלול לחשוף תשובות אישיות.",
  },
  ja: {
    title: "非表示",
    lowCountMessage:
      "一部の回答件数が非常に少ないため、参加者のプライバシー保護のため結果を非表示にしています。",
    clusterMessage:
      "この意見グループ別の内訳は個々の回答を推測できる可能性があるため、参加者のプライバシー保護のため結果を非表示にしています。",
  },
  ky: {
    title: "Жашырылган",
    lowCountMessage:
      "Айрым жооптордун саны өтө аз болгондуктан, катышуучулардын купуялуулугун коргоо үчүн жыйынтыктар жашырылды.",
    clusterMessage:
      "Бул пикир тобу боюнча бөлүштүрүү айрым адамдардын жоопторун ачып коюшу мүмкүн болгондуктан, катышуучулардын купуялуулугун коргоо үчүн жыйынтыктар жашырылды.",
  },
  ru: {
    title: "Скрыто",
    lowCountMessage:
      "Результаты скрыты для защиты приватности участников, потому что некоторые количества ответов слишком малы.",
    clusterMessage:
      "Результаты скрыты для защиты приватности участников, потому что эта разбивка по группе мнений может раскрыть индивидуальные ответы.",
  },
  "zh-Hans": {
    title: "已隐藏",
    lowCountMessage: "由于部分答案数量过低，为保护参与者隐私，结果已被隐藏。",
    clusterMessage:
      "由于这组意见群组拆分可能暴露个人回答，为保护参与者隐私，结果已被隐藏。",
  },
  "zh-Hant": {
    title: "已隱藏",
    lowCountMessage: "由於部分答案數量過低，為保護參與者隱私，結果已被隱藏。",
    clusterMessage:
      "由於這組意見群組拆分可能暴露個人回答，為保護參與者隱私，結果已被隱藏。",
  },
};
