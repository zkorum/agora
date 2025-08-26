// Japanese translations

import type { TranslationSchema } from "../types";

const translations: TranslationSchema = {
  // Minimal content to ensure locale is recognized by Vue i18n
  common: {
    loading: "読み込み中...",
  },
  importConversation: {
    legalNotice: `「インポート」をクリックすることで、コンテンツのインポートが{polisTerms}と{termsOfUse}に準拠していることを確認します。元のPolisデータは{ccLicense}の下でライセンスされていることにご注意ください。違法または虐待的なコンテンツをインポートしないでください。インポートAPIを責任を持って使用してください。悪用は禁止されています。`,
  },
};

export default translations;
