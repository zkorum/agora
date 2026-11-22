import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

interface ClosedVoteWithdrawalTranslations {
  withdraw: string;
  title: string;
  message: string;
  cancel: string;
  success: string;
  failure: string;
}

export const closedVoteWithdrawalTranslations = {
  en: {
    withdraw: "Withdraw my votes",
    title: "Withdraw all your votes?",
    message:
      "Future Live calculations will exclude all your votes. Closing results are unaffected. You can vote again only if this conversation reopens.",
    cancel: "Cancel",
    success: "Your votes were withdrawn from Live inputs.",
    failure: "Could not confirm withdrawal. Refresh and try again.",
  },
  fr: {
    withdraw: "Retirer mes votes",
    title: "Retirer tous vos votes ?",
    message:
      "Les prochains calculs sur les données actuelles excluront tous vos votes. Les résultats à la clôture ne changent pas. Vous ne pourrez revoter que si la conversation est rouverte.",
    cancel: "Annuler",
    success: "Vos votes ont été retirés des données actuelles.",
    failure:
      "Impossible de confirmer le retrait. Actualisez la page et réessayez.",
  },
  es: {
    withdraw: "Retirar mis votos",
    title: "¿Retirar todos tus votos?",
    message:
      "Los próximos cálculos con datos actuales excluirán todos tus votos. Los resultados al cierre no cambian. Solo podrás volver a votar si se reabre la conversación.",
    cancel: "Cancelar",
    success: "Tus votos se retiraron de los datos actuales.",
    failure:
      "No se pudo confirmar la retirada. Actualiza la página e inténtalo de nuevo.",
  },
  ar: {
    withdraw: "سحب أصواتي",
    title: "هل تريد سحب جميع أصواتك؟",
    message:
      "ستُستبعد جميع أصواتك من الحسابات المقبلة التي تستخدم المدخلات الحالية. لن تتأثر نتائج الإغلاق. لن تتمكن من التصويت مجددًا إلا إذا أُعيد فتح المحادثة.",
    cancel: "إلغاء",
    success: "سُحبت أصواتك من مدخلات النتائج الحالية.",
    failure: "تعذّر تأكيد السحب. حدّث الصفحة وحاول مجددًا.",
  },
  fa: {
    withdraw: "پس گرفتن رأی‌هایم",
    title: "همهٔ رأی‌هایتان را پس می‌گیرید؟",
    message:
      "همهٔ رأی‌هایتان از محاسبات بعدی با داده‌های زنده کنار گذاشته می‌شوند. نتایج زمان بسته‌شدن تغییری نمی‌کنند. فقط در صورت بازگشایی گفت‌وگو می‌توانید دوباره رأی بدهید.",
    cancel: "انصراف",
    success: "رأی‌های شما از محاسبهٔ نتایج زنده کنار گذاشته شدند.",
    failure: "پس گرفتن رأی‌ها تأیید نشد. صفحه را تازه کنید و دوباره تلاش کنید.",
  },
  he: {
    withdraw: "משיכת ההצבעות שלי",
    title: "למשוך את כל ההצבעות שלך?",
    message:
      "כל ההצבעות שלך יוחרגו מחישובים עתידיים על סמך הנתונים העדכניים. תוצאות הסגירה לא יושפעו. אפשר יהיה להצביע שוב רק אם הדיון ייפתח מחדש.",
    cancel: "ביטול",
    success: "ההצבעות שלך הוסרו מהנתונים לחישוב התוצאות העדכניות.",
    failure: "לא ניתן היה לאשר את המשיכה. יש לרענן את הדף ולנסות שוב.",
  },
  ja: {
    withdraw: "投票を取り消す",
    title: "すべての投票を取り消しますか？",
    message:
      "最新のデータを使う今後の集計から、あなたのすべての投票が除外されます。終了時の結果は変わりません。対話が再開されるまで再投票はできません。",
    cancel: "キャンセル",
    success: "あなたの投票は最新の結果の集計対象から外れました。",
    failure:
      "取り消しを確認できませんでした。ページを更新して、もう一度お試しください。",
  },
  ky: {
    withdraw: "Добуштарымды кайтарып алуу",
    title: "Бардык добуштарыңызды кайтарып аласызбы?",
    message:
      "Учурдагы маалыматтар боюнча кийинки эсептөөлөргө добуштарыңыздын бири да кирбейт. Жабылгандагы жыйынтыктар өзгөрбөйт. Талкуу кайра ачылганда гана добуш бере аласыз.",
    cancel: "Баш тартуу",
    success: "Добуштарыңыз учурдагы жыйынтыктардын эсебинен чыгарылды.",
    failure:
      "Добуштарды кайтарып алуу ырасталган жок. Баракты жаңыртып, кайра аракет кылыңыз.",
  },
  ru: {
    withdraw: "Отозвать мои голоса",
    title: "Отозвать все ваши голоса?",
    message:
      "Все ваши голоса будут исключены из следующих расчётов по текущим данным. Результаты на момент закрытия не изменятся. Проголосовать снова можно будет только после повторного открытия обсуждения.",
    cancel: "Отмена",
    success: "Ваши голоса исключены из расчёта текущих результатов.",
    failure:
      "Не удалось подтвердить отзыв голосов. Обновите страницу и попробуйте ещё раз.",
  },
  "zh-Hans": {
    withdraw: "撤回我的投票",
    title: "撤回您的全部投票？",
    message:
      "今后使用实时数据计算时，将不再计入您的任何投票。结束时的结果不受影响。只有在讨论重新开放后，您才能再次投票。",
    cancel: "取消",
    success: "您的投票已从实时结果的计算中移除。",
    failure: "未能确认撤回。请刷新页面后重试。",
  },
  "zh-Hant": {
    withdraw: "撤回我的投票",
    title: "要撤回您的全部投票嗎？",
    message:
      "今後使用即時資料計算時，將不再計入您的任何投票。結束時的結果不受影響。只有在討論重新開放後，您才能再次投票。",
    cancel: "取消",
    success: "您的投票已從即時結果的計算中移除。",
    failure: "未能確認撤回。請重新整理頁面後再試一次。",
  },
} satisfies Record<
  SupportedDisplayLanguageCodes,
  ClosedVoteWithdrawalTranslations
>;
