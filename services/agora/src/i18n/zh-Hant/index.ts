// 繁體中文翻譯

import type { TranslationSchema } from "../types";

const translations: TranslationSchema = {
  // 最小內容以確保 Vue i18n 能識別語言環境
  common: {
    loading: "載入中...",
  },
  importConversation: {
    legalNotice: `點擊「匯入」即表示您確認匯入的內容符合{polisTerms}和我們的{termsOfUse}。請注意，原始 Polis 資料是在{ccLicense}授權下發布的。請勿匯入非法或濫用的內容。請負責任地使用匯入 API。禁止濫用。`,
  },
};

export default translations;
