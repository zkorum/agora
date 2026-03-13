// Russian translations

import type { TranslationSchema } from "../types";

const translations: TranslationSchema = {
  // Minimal content to ensure locale is recognized by Vue i18n
  common: {
    loading: "Загрузка...",
  },
  importConversation: {
    legalNotice: `Нажимая «Импортировать», вы подтверждаете, что импорт контента соответствует {polisTerms} и нашим {termsOfUse}. Обратите внимание, что исходные данные Polis лицензированы по {ccLicense}. Не импортируйте незаконный или оскорбительный контент. Используйте API импорта ответственно. Злоупотребление запрещено.`,
  },
};

export default translations;
