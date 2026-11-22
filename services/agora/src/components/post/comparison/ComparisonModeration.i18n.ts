import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export const comparisonModerationTranslations = {
  en: {
    moderate: "Moderate statement",
    reason: "Reason",
    original: "Statement and reason in their original language",
    hidden: "Hidden",
    moved: "Moved",
    visibility:
      "When you move a statement, anyone who can view this conversation can read the statement and your reason in Moderation History. When you hide it, only site moderators can read them there.",
    restore: "Restore",
    empty: "No moderated statements.",
    more: "Show more",
    retry: "Retry",
    error: "Could not complete the request. Please try again.",
  },
  fr: {
    moderate: "Modérer la proposition",
    reason: "Motif",
    original: "Proposition et motif dans leur langue d’origine",
    hidden: "Masquée",
    moved: "Déplacée",
    visibility:
      "Après un déplacement, toute personne ayant accès à la conversation peut lire la proposition et votre motif dans l’historique de modération. Si elle est masquée, seuls les modérateurs du site peuvent y lire ces informations.",
    restore: "Rétablir",
    empty: "Aucune proposition modérée.",
    more: "Afficher plus",
    retry: "Réessayer",
    error: "Impossible de terminer la demande. Veuillez réessayer.",
  },
  ar: {
    moderate: "الإشراف على المقترح",
    reason: "السبب",
    original: "المقترح والسبب بلغتهما الأصلية",
    hidden: "مخفي",
    moved: "منقول",
    visibility:
      "عند نقل المقترح، يمكن لكل من يرى المحادثة قراءة المقترح وسبب النقل في سجل الإشراف. وعند إخفائه، لا يراهما هناك سوى مشرفي الموقع.",
    restore: "استعادة",
    empty: "لا توجد مقترحات خضعت للإشراف.",
    more: "عرض المزيد",
    retry: "إعادة المحاولة",
    error: "تعذّر إتمام الطلب. يُرجى المحاولة مجددًا.",
  },
  es: {
    moderate: "Moderar la propuesta",
    reason: "Motivo",
    original: "Propuesta y motivo en su idioma original",
    hidden: "Oculta",
    moved: "Movida",
    visibility:
      "Al mover una propuesta, quienes puedan ver la conversación podrán leerla junto con tu motivo en el historial de moderación. Si la ocultas, solo el equipo de moderación del sitio podrá leerlos allí.",
    restore: "Restaurar",
    empty: "No hay propuestas moderadas.",
    more: "Mostrar más",
    retry: "Reintentar",
    error: "No se pudo completar la solicitud. Vuelve a intentarlo.",
  },
  fa: {
    moderate: "مدیریت گزاره",
    reason: "دلیل",
    original: "گزاره و دلیل به زبان اصلی",
    hidden: "پنهان‌شده",
    moved: "منتقل‌شده",
    visibility:
      "با انتقال گزاره، هر کسی که به گفت‌وگو دسترسی دارد می‌تواند گزاره و دلیل شما را در سابقهٔ مدیریت بخواند. اگر گزاره پنهان شود، فقط مدیران نظارت سایت آن‌ها را در آنجا می‌بینند.",
    restore: "بازگرداندن",
    empty: "هیچ گزاره‌ای مدیریت نشده است.",
    more: "نمایش بیشتر",
    retry: "تلاش دوباره",
    error: "درخواست انجام نشد. لطفاً دوباره تلاش کنید.",
  },
  "zh-Hans": {
    moderate: "审核意见",
    reason: "原因",
    original: "意见和原因均以原文显示",
    hidden: "已隐藏",
    moved: "已移走",
    visibility:
      "移走意见后，所有能查看本讨论的人都能在审核记录中读到意见和原因。隐藏后，只有网站审核员能在那里看到这些内容。",
    restore: "恢复",
    empty: "暂无已审核的意见。",
    more: "显示更多",
    retry: "重试",
    error: "无法完成请求，请重试。",
  },
  "zh-Hant": {
    moderate: "審核意見",
    reason: "原因",
    original: "意見和原因均以原文顯示",
    hidden: "已隱藏",
    moved: "已移走",
    visibility:
      "移走意見後，所有能查看本討論的人都能在審核紀錄中讀到意見和原因。隱藏後，只有網站審核人員能在該處看到這些內容。",
    restore: "還原",
    empty: "目前沒有已審核的意見。",
    more: "顯示更多",
    retry: "重試",
    error: "無法完成請求，請再試一次。",
  },
  he: {
    moderate: "ניהול ההצהרה",
    reason: "סיבה",
    original: "ההצהרה והנימוק בשפת המקור",
    hidden: "הוסתרה",
    moved: "הועברה",
    visibility:
      "לאחר העברה, כל מי שיכול לראות את הדיון יוכל לקרוא את ההצהרה ואת הנימוק בהיסטוריית ניהול התוכן. לאחר הסתרה רק מנהלי התוכן של האתר יוכלו לקרוא אותם שם.",
    restore: "שחזור",
    empty: "אין הצהרות שעברו ניהול תוכן.",
    more: "הצגת פריטים נוספים",
    retry: "ניסיון חוזר",
    error: "לא ניתן היה להשלים את הבקשה. נא לנסות שוב.",
  },
  ja: {
    moderate: "意見のモデレーション",
    reason: "理由",
    original: "意見と理由は原文で表示しています",
    hidden: "非表示",
    moved: "移動済み",
    visibility:
      "移動した意見とその理由は、この対話を閲覧できる人なら誰でもモデレーション履歴で読めます。非表示にした場合、履歴で読めるのはサイトのモデレーターだけです。",
    restore: "復元",
    empty: "モデレーションされた意見はありません。",
    more: "さらに表示",
    retry: "再試行",
    error: "リクエストを完了できませんでした。もう一度お試しください。",
  },
  ky: {
    moderate: "Билдирүүнү модерациялоо",
    reason: "Себеби",
    original: "Билдирүү жана себеп түпнуска тилинде",
    hidden: "Жашырылды",
    moved: "Жылдырылды",
    visibility:
      "Билдирүү жылдырылса, талкууну көрө алган ар бир адам аны жана себебин модерация тарыхынан окуй алат. Жашырылса, ал жерден аларды сайттын модераторлору гана окуй алат.",
    restore: "Калыбына келтирүү",
    empty: "Модерацияланган билдирүүлөр жок.",
    more: "Дагы көрсөтүү",
    retry: "Кайра аракет кылуу",
    error: "Сурам аткарылган жок. Кайра аракет кылыңыз.",
  },
  ru: {
    moderate: "Модерация высказывания",
    reason: "Причина",
    original: "Высказывание и причина на языке оригинала",
    hidden: "Скрыто",
    moved: "Перемещено",
    visibility:
      "После перемещения высказывание и причина будут видны в истории модерации всем, кому доступно обсуждение. После скрытия их смогут прочитать там только модераторы сайта.",
    restore: "Восстановить",
    empty: "Нет высказываний, прошедших модерацию.",
    more: "Показать ещё",
    retry: "Повторить",
    error: "Не удалось выполнить запрос. Попробуйте ещё раз.",
  },
} satisfies Record<
  SupportedDisplayLanguageCodes,
  Record<
    | "visibility"
    | "original"
    | "moved"
    | "hidden"
    | "moderate"
    | "reason"
    | "restore"
    | "empty"
    | "more"
    | "retry"
    | "error",
    string
  >
>;
