import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface VotingPresentationTranslations {
  list: string;
  listDescription: string;
  oneAtATime: string;
  oneAtATimeDescription: string;
}

export const votingPresentationTranslations: Record<
  SupportedDisplayLanguageCodes,
  VotingPresentationTranslations
> = {
  en: {
    list: "List",
    listDescription:
      "Best for asynchronous participation. Browse and respond to statements at your own pace.",
    oneAtATime: "One at a time",
    oneAtATimeDescription:
      "Best for live events. Respond to one statement at a time and see your progress.",
  },
  fr: {
    list: "Liste",
    listDescription:
      "Idéal pour une participation asynchrone. Parcourez les propositions et répondez à votre rythme.",
    oneAtATime: "Une à la fois",
    oneAtATimeDescription:
      "Idéal pour les événements en direct. Répondez à une proposition à la fois et suivez votre progression.",
  },
  es: {
    list: "Lista",
    listDescription:
      "Ideal para participar de forma asíncrona. Explora las propuestas y responde a tu ritmo.",
    oneAtATime: "Una a la vez",
    oneAtATimeDescription:
      "Ideal para eventos en directo. Responde a una propuesta a la vez y sigue tu progreso.",
  },
  ar: {
    list: "قائمة",
    listDescription:
      "مناسب للمشاركة غير المتزامنة. تصفّح المقترحات وأجب بالوتيرة التي تناسبك.",
    oneAtATime: "واحدة تلو الأخرى",
    oneAtATimeDescription:
      "مناسب للفعاليات المباشرة. أجب عن مقترح واحد في كل مرة وتابع تقدّمك.",
  },
  fa: {
    list: "فهرست",
    listDescription:
      "مناسب برای مشارکت غیرهم‌زمان. گزاره‌ها را مرور کنید و با سرعت دلخواه پاسخ دهید.",
    oneAtATime: "یکی‌یکی",
    oneAtATimeDescription:
      "مناسب برای رویدادهای زنده. هر بار به یک گزاره پاسخ دهید و پیشرفت خود را ببینید.",
  },
  he: {
    list: "רשימה",
    listDescription:
      "מתאים להשתתפות בזמן הנוח לכם. עיינו בהצעות והשיבו בקצב שלכם.",
    oneAtATime: "אחת בכל פעם",
    oneAtATimeDescription:
      "מתאים לאירועים חיים. השיבו להצעה אחת בכל פעם ועקבו אחר ההתקדמות.",
  },
  ja: {
    list: "一覧",
    listDescription:
      "各自の都合に合わせた参加に最適です。提案を閲覧し、自分のペースで回答できます。",
    oneAtATime: "一つずつ",
    oneAtATimeDescription:
      "ライブイベントに最適です。提案に一つずつ回答し、進捗を確認できます。",
  },
  ky: {
    list: "Тизме",
    listDescription:
      "Өз убактыңызда катышууга ылайыктуу. Сунуштарды карап, өз ыргагыңызда жооп бериңиз.",
    oneAtATime: "Бирден",
    oneAtATimeDescription:
      "Түз эфирдеги иш-чараларга ылайыктуу. Ар бир сунушка бирден жооп берип, жүрүшүңүздү көрүңүз.",
  },
  ru: {
    list: "Список",
    listDescription:
      "Подходит для участия в удобное время. Просматривайте предложения и отвечайте в своём темпе.",
    oneAtATime: "По одному",
    oneAtATimeDescription:
      "Подходит для мероприятий в реальном времени. Отвечайте на предложения по одному и следите за прогрессом.",
  },
  "zh-Hans": {
    list: "列表",
    listDescription: "适合异步参与。按自己的节奏浏览和回应观点。",
    oneAtATime: "逐条回应",
    oneAtATimeDescription: "适合现场活动。每次回应一条观点，并查看进度。",
  },
  "zh-Hant": {
    list: "列表",
    listDescription: "適合非同步參與。按照自己的步調瀏覽及回應觀點。",
    oneAtATime: "逐條回應",
    oneAtATimeDescription: "適合現場活動。每次回應一條觀點，並查看進度。",
  },
};
