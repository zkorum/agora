import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface AnalysisOpinionTextTranslations {
  deletedStatement: string;
  unavailableStatement: string;
  moderatedStatement: string;
  deletedAccount: string;
}

export const analysisOpinionTextTranslations: Record<
  SupportedDisplayLanguageCodes,
  AnalysisOpinionTextTranslations
> = {
  en: {
    deletedStatement: "[deleted]",
    unavailableStatement: "[statement unavailable]",
    moderatedStatement: "[moderated]",
    deletedAccount: "[deleted account]",
  },
  ar: {
    deletedStatement: "[محذوفة]",
    unavailableStatement: "[المقترح غير متاح]",
    moderatedStatement: "[خاضعة للإشراف]",
    deletedAccount: "[حساب محذوف]",
  },
  es: {
    deletedStatement: "[eliminada]",
    unavailableStatement: "[propuesta no disponible]",
    moderatedStatement: "[moderada]",
    deletedAccount: "[cuenta eliminada]",
  },
  fa: {
    deletedStatement: "[حذف‌شده]",
    unavailableStatement: "[گزاره در دسترس نیست]",
    moderatedStatement: "[مدیریت‌شده]",
    deletedAccount: "[حساب حذف‌شده]",
  },
  fr: {
    deletedStatement: "[supprimée]",
    unavailableStatement: "[proposition indisponible]",
    moderatedStatement: "[modérée]",
    deletedAccount: "[compte supprimé]",
  },
  "zh-Hans": {
    deletedStatement: "[已删除]",
    unavailableStatement: "[意见不可用]",
    moderatedStatement: "[已审核]",
    deletedAccount: "[账户已删除]",
  },
  "zh-Hant": {
    deletedStatement: "[已刪除]",
    unavailableStatement: "[意見無法顯示]",
    moderatedStatement: "[已審核]",
    deletedAccount: "[帳戶已刪除]",
  },
  he: {
    deletedStatement: "[נמחקה]",
    unavailableStatement: "[ההצהרה אינה זמינה]",
    moderatedStatement: "[עבר מודרציה]",
    deletedAccount: "[חשבון שנמחק]",
  },
  ja: {
    deletedStatement: "[削除済み]",
    unavailableStatement: "[意見を表示できません]",
    moderatedStatement: "[モデレート済み]",
    deletedAccount: "[削除済みアカウント]",
  },
  ky: {
    deletedStatement: "[өчүрүлгөн]",
    unavailableStatement: "[билдирүү жеткиликсиз]",
    moderatedStatement: "[модерацияланган]",
    deletedAccount: "[өчүрүлгөн аккаунт]",
  },
  ru: {
    deletedStatement: "[удалено]",
    unavailableStatement: "[высказывание недоступно]",
    moderatedStatement: "[модерировано]",
    deletedAccount: "[удалённый аккаунт]",
  },
};
