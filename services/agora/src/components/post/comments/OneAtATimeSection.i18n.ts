import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface OneAtATimeTranslations {
  remaining: string;
  caughtUp: string;
  caughtUpDescription: string;
  loadError: string;
  retry: string;
  statementSubmitted: string;
  undoFailed: string;
  finishingSaving: string;
  recoveryError: string;
  voteChanged: string;
  voteUnconfirmed: string;
  voteUnavailable: string;
  votingUnavailable: string;
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
    finishingSaving: "Finishing saving…",
    recoveryError: "Could not load statements that need another look.",
    voteChanged:
      "This statement changed. Your previous vote wasn't saved. Please review it and vote again.",
    voteUnconfirmed:
      "We couldn't confirm your previous vote on this statement. Please choose again.",
    voteUnavailable:
      "A statement you voted on is no longer available. It was skipped.",
    votingUnavailable: "Voting is no longer available in this conversation.",
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
    finishingSaving: "Enregistrement en cours…",
    recoveryError: "Impossible de charger les propositions à revoir.",
    voteChanged:
      "Cette proposition a changé. Votre vote précédent n’a pas été enregistré. Relisez-la et votez à nouveau.",
    voteUnconfirmed:
      "Votre vote précédent sur cette proposition n’a pas pu être confirmé. Veuillez choisir à nouveau.",
    voteUnavailable:
      "Une proposition sur laquelle vous avez voté n’est plus disponible. Elle a été ignorée.",
    votingUnavailable:
      "Il n’est plus possible de voter dans cette conversation.",
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
    finishingSaving: "Terminando de guardar…",
    recoveryError: "No se pudieron cargar los enunciados que debes revisar.",
    voteChanged:
      "Este enunciado cambió. Tu voto anterior no se guardó. Revísalo y vuelve a votar.",
    voteUnconfirmed:
      "No pudimos confirmar tu voto anterior en este enunciado. Elige de nuevo.",
    voteUnavailable:
      "Un enunciado en el que votaste ya no está disponible. Se omitió.",
    votingUnavailable: "Ya no se puede votar en esta conversación.",
  },
  ar: {
    remaining: "المتبقي {count}",
    caughtUp: "أنت على اطلاع بكل جديد!",
    caughtUpDescription: "شكرًا لمشاركتك. ستظهر المقترحات الجديدة هنا.",
    loadError: "تعذر تحميل المقترح التالي",
    retry: "حاول مجددًا",
    statementSubmitted: "تم إرسال مقترحك بنجاح.",
    undoFailed: "تعذر التراجع عن تصويتك. يرجى المحاولة مرة أخرى.",
    finishingSaving: "جارٍ إكمال الحفظ…",
    recoveryError: "تعذر تحميل المقترحات التي تحتاج إلى مراجعة.",
    voteChanged:
      "تغيّر هذا المقترح. لم يُحفظ تصويتك السابق. راجعه وصوّت مجددًا.",
    voteUnconfirmed:
      "تعذر تأكيد تصويتك السابق على هذا المقترح. يرجى الاختيار مجددًا.",
    voteUnavailable: "لم يعد أحد المقترحات التي صوّت عليها متاحًا. تم تخطيه.",
    votingUnavailable: "لم يعد التصويت متاحًا في هذه المحادثة.",
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
    finishingSaving: "در حال تکمیل ذخیره‌سازی…",
    recoveryError: "بارگذاری گزاره‌های نیازمند بازبینی ممکن نشد.",
    voteChanged:
      "این گزاره تغییر کرده است. رأی قبلی شما ذخیره نشد. آن را بازبینی کنید و دوباره رأی دهید.",
    voteUnconfirmed:
      "تأیید رأی قبلی شما به این گزاره ممکن نشد. لطفاً دوباره انتخاب کنید.",
    voteUnavailable:
      "یکی از گزاره‌هایی که به آن رأی دادید دیگر در دسترس نیست و رد شد.",
    votingUnavailable: "رأی‌گیری در این گفتگو دیگر در دسترس نیست.",
  },
  he: {
    remaining: "נשארו {count}",
    caughtUp: "אתם מעודכנים!",
    caughtUpDescription: "תודה שהשתתפתם. הצעות חדשות יופיעו כאן.",
    loadError: "לא ניתן לטעון את ההצעה הבאה",
    retry: "לנסות שוב",
    statementSubmitted: "ההצעה שלכם נשלחה בהצלחה.",
    undoFailed: "לא ניתן לבטל את ההצבעה. אנא נסו שוב.",
    finishingSaving: "מסיימים לשמור…",
    recoveryError: "לא ניתן לטעון את ההצעות שדורשות בדיקה נוספת.",
    voteChanged:
      "ההצעה השתנתה. ההצבעה הקודמת שלכם לא נשמרה. קראו אותה והצביעו שוב.",
    voteUnconfirmed:
      "לא הצלחנו לאשר את ההצבעה הקודמת שלכם על הצעה זו. בחרו שוב.",
    voteUnavailable: "הצעה שהצבעתם עליה אינה זמינה עוד. דילגנו עליה.",
    votingUnavailable: "לא ניתן עוד להצביע בשיחה זו.",
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
    finishingSaving: "保存を完了しています…",
    recoveryError: "再確認が必要な提案を読み込めませんでした。",
    voteChanged:
      "この提案は変更されました。前の投票は保存されませんでした。内容を確認して再度投票してください。",
    voteUnconfirmed:
      "この提案への前の投票を確認できませんでした。もう一度選択してください。",
    voteUnavailable: "投票した提案が利用できなくなったため、スキップしました。",
    votingUnavailable: "この会話では投票できなくなりました。",
  },
  ky: {
    remaining: "{count} калды",
    caughtUp: "Баарына жооп бердиңиз!",
    caughtUpDescription:
      "Катышканыңыз үчүн рахмат. Жаңы сунуштар бул жерде пайда болот.",
    loadError: "Кийинки сунуш жүктөлгөн жок",
    retry: "Кайра аракет кылыңыз",
    statementSubmitted: "Сунушуңуз ийгиликтүү жөнөтүлдү.",
    undoFailed:
      "Добушуңузду артка кайтаруу мүмкүн болгон жок. Кайра аракет кылыңыз.",
    finishingSaving: "Сактоо аяктап жатат…",
    recoveryError: "Кайра каралуучу сунуштар жүктөлгөн жок.",
    voteChanged:
      "Бул сунуш өзгөрдү. Мурунку добушуңуз сакталган жок. Аны карап чыгып, кайра добуш бериңиз.",
    voteUnconfirmed:
      "Бул сунушка берген мурунку добушуңуз ырасталган жок. Кайра тандаңыз.",
    voteUnavailable:
      "Сиз добуш берген сунуш мындан ары жеткиликсиз. Ал өткөрүлүп жиберилди.",
    votingUnavailable: "Бул талкууда добуш берүү мындан ары жеткиликсиз.",
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
    finishingSaving: "Завершаем сохранение…",
    recoveryError:
      "Не удалось загрузить высказывания для повторного просмотра.",
    voteChanged:
      "Это высказывание изменилось. Ваш предыдущий голос не был сохранён. Прочитайте его и проголосуйте снова.",
    voteUnconfirmed:
      "Не удалось подтвердить ваш предыдущий голос за это высказывание. Выберите снова.",
    voteUnavailable:
      "Высказывание, за которое вы голосовали, больше недоступно. Оно пропущено.",
    votingUnavailable: "Голосование в этом обсуждении больше недоступно.",
  },
  "zh-Hans": {
    remaining: "剩余 {count} 条",
    caughtUp: "已全部完成！",
    caughtUpDescription: "感谢参与。新观点会显示在这里。",
    loadError: "无法加载下一条观点",
    retry: "重试",
    statementSubmitted: "你的观点已成功提交。",
    undoFailed: "无法撤销你的投票，请重试。",
    finishingSaving: "正在完成保存…",
    recoveryError: "无法加载需要重新查看的观点。",
    voteChanged: "此观点已更改。你之前的投票未保存，请重新阅读并投票。",
    voteUnconfirmed: "无法确认你之前对此观点的投票，请重新选择。",
    voteUnavailable: "你投票的某个观点已不可用，已跳过。",
    votingUnavailable: "此对话已无法投票。",
  },
  "zh-Hant": {
    remaining: "剩餘 {count} 條",
    caughtUp: "已全部完成！",
    caughtUpDescription: "感謝參與。新觀點會顯示在這裡。",
    loadError: "無法載入下一條觀點",
    retry: "重試",
    statementSubmitted: "你的觀點已成功提交。",
    undoFailed: "無法復原你的投票，請再試一次。",
    finishingSaving: "正在完成儲存…",
    recoveryError: "無法載入需要重新查看的觀點。",
    voteChanged: "此觀點已變更。你先前的投票未儲存，請重新閱讀並投票。",
    voteUnconfirmed: "無法確認你先前對此觀點的投票，請重新選擇。",
    voteUnavailable: "你投票的某個觀點已無法使用，已略過。",
    votingUnavailable: "此對話已無法投票。",
  },
};
