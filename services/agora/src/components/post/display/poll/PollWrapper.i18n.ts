import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface PollWrapperTranslations {
  results: string;
  vote: string;
  votes: string;
  conversationClosed: string;
  voteFailed: string;
}

export const pollWrapperTranslations: Record<SupportedDisplayLanguageCodes, PollWrapperTranslations> =
  {
    en: {
      results: "Results",
      vote: "Vote",
      votes: "votes",
      conversationClosed: "This conversation is no longer open for participation.",
      voteFailed: "Failed to submit poll response.",
    },
    ar: {
      results: "النتائج",
      vote: "تصويت",
      votes: "أصوات",
      conversationClosed: "لم تعد هذه المحادثة مفتوحة للمشاركة.",
      voteFailed: "فشل إرسال رد الاستطلاع.",
    },
    es: {
      results: "Resultados",
      vote: "Votar",
      votes: "votos",
      conversationClosed: "Esta conversación ya no está abierta para participar.",
      voteFailed: "No se pudo enviar la respuesta de la encuesta.",
    },
    fa: {
      results: "نتایج",
      vote: "رأی",
      votes: "رأی",
      conversationClosed: "این گفتگو دیگر برای مشارکت باز نیست.",
      voteFailed: "ارسال پاسخ نظرسنجی انجام نشد.",
    },
    fr: {
      results: "Résultats",
      vote: "Vote",
      votes: "votes",
      conversationClosed: "Cette conversation n'est plus ouverte à la participation.",
      voteFailed: "Impossible d'envoyer la réponse au sondage.",
    },
    "zh-Hans": {
      results: "结果",
      vote: "投票",
      votes: "票",
      conversationClosed: "这场对话已不再开放参与。",
      voteFailed: "无法提交投票回应。",
    },
    "zh-Hant": {
      results: "結果",
      vote: "投票",
      votes: "票",
      conversationClosed: "這場對話已不再開放參與。",
      voteFailed: "無法提交投票回應。",
    },
    he: {
      results: "תוצאות",
      vote: "הצבעה",
      votes: "הצבעות",
      conversationClosed: "השיחה הזו כבר לא פתוחה להשתתפות.",
      voteFailed: "שליחת תשובת הסקר נכשלה.",
    },
    ja: {
      results: "結果",
      vote: "投票",
      votes: "票",
      conversationClosed: "この会話はもう参加受付中ではありません。",
      voteFailed: "投票の送信に失敗しました。",
    },
    ky: {
      results: "Жыйынтыктар",
      vote: "Добуш берүү",
      votes: "добуш",
      conversationClosed: "Бул сүйлөшүү мындан ары катышууга ачык эмес.",
      voteFailed: "Сурамжылоого жооп жөнөтүү ишке ашкан жок.",
    },
    ru: {
      results: "Результаты",
      vote: "Голосовать",
      votes: "голосов",
      conversationClosed: "Эта беседа больше не открыта для участия.",
      voteFailed: "Не удалось отправить ответ на опрос.",
    },
  };
