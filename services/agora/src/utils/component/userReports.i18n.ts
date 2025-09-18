import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface UserReportsTranslations {
  misleading: string;
  antisocial: string;
  illegal: string;
  doxing: string;
  sexual: string;
  spam: string;
}

export const userReportsTranslations: Record<
  SupportedDisplayLanguageCodes,
  UserReportsTranslations
> = {
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
  "zh-Hans": {
    misleading: "误导性",
    antisocial: "反社会",
    illegal: "非法",
    doxing: "人肉搜索",
    sexual: "色情",
    spam: "垃圾信息",
  },
  "zh-Hant": {
    misleading: "誤導性",
    antisocial: "反社會",
    illegal: "非法",
    doxing: "人肉搜索",
    sexual: "色情",
    spam: "垃圾信息",
  },
  ja: {
    misleading: "誤解を招く",
    antisocial: "反社会的",
    illegal: "違法",
    doxing: "個人情報晒し",
    sexual: "性的",
    spam: "スパム",
  },
};
