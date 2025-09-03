export interface UserReportsTranslations {
  misleading: string;
  antisocial: string;
  illegal: string;
  doxing: string;
  sexual: string;
  spam: string;
}

export const userReportsTranslations: Record<string, UserReportsTranslations> =
  {
    en: {
      misleading: "Misleading",
      antisocial: "Antisocial",
      illegal: "Illegal",
      doxing: "Doxing",
      sexual: "Sexual",
      spam: "Spam",
    },
    ar: {
      misleading: "مضلل",
      antisocial: "غير اجتماعي",
      illegal: "غير قانوني",
      doxing: "كشف معلومات شخصية",
      sexual: "جنسي",
      spam: "بريد عشوائي",
    },
    es: {
      misleading: "Engañoso",
      antisocial: "Antisocial",
      illegal: "Ilegal",
      doxing: "Doxing",
      sexual: "Sexual",
      spam: "Spam",
    },
    fr: {
      misleading: "Trompeur",
      antisocial: "Antisocial",
      illegal: "Illégal",
      doxing: "Doxing",
      sexual: "Sexuel",
      spam: "Spam",
    },
  };
