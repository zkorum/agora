import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface OneAtATimeTranslations {
  remaining: string;
  caughtUp: string;
  caughtUpDescription: string;
  loadError: string;
  retry: string;
  statementSubmitted: string;
  undoFailed: string;
}

export const oneAtATimeTranslations: Record<
  SupportedDisplayLanguageCodes,
  OneAtATimeTranslations
> = {
  en: {
    remaining: "{count} remaining",
    caughtUp: "You're all caught up!",
    caughtUpDescription:
      "Thanks for contributing. New statements will appear here.",
    loadError: "Could not load the next statement",
    retry: "Try again",
    statementSubmitted: "Your statement was submitted successfully.",
    undoFailed: "Could not undo your vote. Please try again.",
  },
  fr: {
    remaining: "{count} restantes",
    caughtUp: "Vous êtes à jour !",
    caughtUpDescription:
      "Merci de votre participation. Les nouvelles propositions apparaîtront ici.",
    loadError: "Impossible de charger la proposition suivante",
    retry: "Réessayer",
    statementSubmitted: "Votre proposition a bien été envoyée.",
    undoFailed: "Impossible d’annuler votre vote. Veuillez réessayer.",
  },
  es: {
    remaining: "Quedan {count}",
    caughtUp: "¡Ya estás al día!",
    caughtUpDescription:
      "Gracias por participar. Las nuevas propuestas aparecerán aquí.",
    loadError: "No se pudo cargar la siguiente propuesta",
    retry: "Reintentar",
    statementSubmitted: "Tu propuesta se ha enviado correctamente.",
    undoFailed: "No se pudo deshacer tu voto. Inténtalo de nuevo.",
  },
  ar: {
    remaining: "المتبقي {count}",
    caughtUp: "أنت على اطلاع بكل جديد!",
    caughtUpDescription: "شكرًا لمشاركتك. ستظهر المقترحات الجديدة هنا.",
    loadError: "تعذر تحميل المقترح التالي",
    retry: "حاول مجددًا",
    statementSubmitted: "تم إرسال مقترحك بنجاح.",
    undoFailed: "تعذر التراجع عن تصويتك. يرجى المحاولة مرة أخرى.",
  },
  fa: {
    remaining: "{count} مورد باقی مانده",
    caughtUp: "همه موارد را بررسی کردید!",
    caughtUpDescription:
      "از مشارکت شما سپاسگزاریم. گزاره‌های جدید اینجا نمایش داده می‌شوند.",
    loadError: "بارگذاری گزاره بعدی ممکن نشد",
    retry: "تلاش دوباره",
    statementSubmitted: "گزاره شما با موفقیت ارسال شد.",
    undoFailed: "بازگردانی رأی شما ممکن نشد. لطفاً دوباره تلاش کنید.",
  },
  he: {
    remaining: "נשארו {count}",
    caughtUp: "אתם מעודכנים!",
    caughtUpDescription: "תודה שהשתתפתם. הצעות חדשות יופיעו כאן.",
    loadError: "לא ניתן לטעון את ההצעה הבאה",
    retry: "לנסות שוב",
    statementSubmitted: "ההצעה שלכם נשלחה בהצלחה.",
    undoFailed: "לא ניתן לבטל את ההצבעה. אנא נסו שוב.",
  },
  ja: {
    remaining: "残り{count}件",
    caughtUp: "すべて回答しました！",
    caughtUpDescription:
      "ご参加ありがとうございます。新しい提案はここに表示されます。",
    loadError: "次の提案を読み込めませんでした",
    retry: "再試行",
    statementSubmitted: "提案を送信しました。",
    undoFailed: "投票を取り消せませんでした。もう一度お試しください。",
  },
  ky: {
    remaining: "{count} калды",
    caughtUp: "Баарына жооп бердиңиз!",
    caughtUpDescription:
      "Катышканыңыз үчүн рахмат. Жаңы сунуштар бул жерде пайда болот.",
    loadError: "Кийинки сунуш жүктөлгөн жок",
    retry: "Кайра аракет кылыңыз",
    statementSubmitted: "Сунушуңуз ийгиликтүү жөнөтүлдү.",
    undoFailed: "Добушуңузду артка кайтаруу мүмкүн болгон жок. Кайра аракет кылыңыз.",
  },
  ru: {
    remaining: "Осталось {count}",
    caughtUp: "Вы ответили на всё!",
    caughtUpDescription:
      "Спасибо за участие. Новые предложения появятся здесь.",
    loadError: "Не удалось загрузить следующее предложение",
    retry: "Повторить",
    statementSubmitted: "Ваше предложение успешно отправлено.",
    undoFailed: "Не удалось отменить голос. Попробуйте ещё раз.",
  },
  "zh-Hans": {
    remaining: "剩余 {count} 条",
    caughtUp: "已全部完成！",
    caughtUpDescription: "感谢参与。新观点会显示在这里。",
    loadError: "无法加载下一条观点",
    retry: "重试",
    statementSubmitted: "你的观点已成功提交。",
    undoFailed: "无法撤销你的投票，请重试。",
  },
  "zh-Hant": {
    remaining: "剩餘 {count} 條",
    caughtUp: "已全部完成！",
    caughtUpDescription: "感謝參與。新觀點會顯示在這裡。",
    loadError: "無法載入下一條觀點",
    retry: "重試",
    statementSubmitted: "你的觀點已成功提交。",
    undoFailed: "無法復原你的投票，請再試一次。",
  },
};
