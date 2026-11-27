import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ConversationParticipationTranslations {
  description: string;
}

export const conversationParticipationTranslations: Readonly<
  Record<
    SupportedDisplayLanguageCodes,
    Readonly<ConversationParticipationTranslations>
  >
> = {
  en: {
    description:
      "This short setup helps ensure the quality of the consultation. You participate under a pseudonym.",
  },
  de: {
    description:
      "Diese kurze Einrichtung hilft, die Qualität der Konsultation zu gewährleisten. Sie nehmen unter einem Pseudonym teil.",
  },
  hi: {
    description:
      "यह छोटी सेटअप परामर्श की गुणवत्ता सुनिश्चित करने में मदद करता है। आप एक छद्म नाम के तहत भाग लेते हैं।",
  },
  ar: {
    description:
      "تساعد هذه الخطوات القصيرة على ضمان جودة المشاورة. تشارك باسم مستعار.",
  },
  es: {
    description:
      "Este breve proceso ayuda a garantizar la calidad de la consulta. Usted participa bajo un seudónimo.",
  },
  fa: {
    description:
      "این مراحل کوتاه به تضمین کیفیت این نظرخواهی عمومی کمک می‌کند. شما با نام مستعار مشارکت می‌کنید.",
  },
  fr: {
    description:
      "Ce court parcours aide à assurer la qualité de la consultation. Vous participez sous pseudonyme.",
  },
  he: {
    description:
      "התהליך הקצר הזה עוזר להבטיח את איכות ההיוועצות. ההשתתפות היא בכינוי.",
  },
  ja: {
    description:
      "この短い準備手順は、意見募集の質を確保するためのものです。仮名で参加します。",
  },
  ky: {
    description:
      "Бул кыска даярдык коомдук талкуунун сапатын камсыз кылууга жардам берет. Сиз каймана ат менен катышасыз.",
  },
  ru: {
    description:
      "Эти короткие подготовительные шаги помогают обеспечить качество общественного обсуждения. Вы участвуете под псевдонимом.",
  },
  "zh-Hans": {
    description:
      "这段简短的准备流程有助于保障本次公众意见征询的质量。你将使用化名参与。",
  },
  "zh-Hant": {
    description:
      "這段簡短的準備流程有助於保障本次公眾意見徵詢的品質。你將使用化名參與。",
  },
};
