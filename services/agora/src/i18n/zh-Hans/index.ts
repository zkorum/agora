// 简体中文翻译

import type { TranslationSchema } from "../types";

const translations: TranslationSchema = {
  // 最小内容以确保 Vue i18n 能识别语言环境
  common: {
    loading: "加载中...",
  },
  importConversation: {
    legalNotice: `点击"导入"即表示您确认导入的内容符合{polisTerms}和我们的{termsOfUse}。请注意，原始 Polis 数据是在{ccLicense}授权下发布的。请勿导入非法或滥用的内容。请负责任地使用导入 API。禁止滥用。`,
  },
};

export default translations;
