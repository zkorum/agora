import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface AnalysisOpinionTextTranslations {
  deletedStatement: string;
  moderatedStatement: string;
}

export const analysisOpinionTextTranslations: Record<
  SupportedDisplayLanguageCodes,
  AnalysisOpinionTextTranslations
> = {
  en: {
    deletedStatement: "[deleted]",
    moderatedStatement: "[moderated]",
  },
  ar: {
    deletedStatement: "[محذوفة]",
    moderatedStatement: "[خاضعة للإشراف]",
  },
  es: {
    deletedStatement: "[eliminada]",
    moderatedStatement: "[moderada]",
  },
  fa: {
    deletedStatement: "[حذف‌شده]",
    moderatedStatement: "[مدیریت‌شده]",
  },
  fr: {
    deletedStatement: "[supprimée]",
    moderatedStatement: "[modérée]",
  },
  "zh-Hans": {
    deletedStatement: "[已删除]",
    moderatedStatement: "[已审核]",
  },
  "zh-Hant": {
    deletedStatement: "[已刪除]",
    moderatedStatement: "[已審核]",
  },
  he: {
    deletedStatement: "[נמחקה]",
    moderatedStatement: "[עבר מודרציה]",
  },
  ja: {
    deletedStatement: "[削除済み]",
    moderatedStatement: "[モデレート済み]",
  },
  ky: {
    deletedStatement: "[өчүрүлгөн]",
    moderatedStatement: "[модерацияланган]",
  },
  ru: {
    deletedStatement: "[удалено]",
    moderatedStatement: "[модерировано]",
  },
};
