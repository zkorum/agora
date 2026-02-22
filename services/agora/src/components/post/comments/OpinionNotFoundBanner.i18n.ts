import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface OpinionNotFoundBannerTranslations {
  requestedOpinionNotFound: string;
  opinionId: string;
  dismiss: string;
  dismissBannerAriaLabel: string;
}

export const opinionNotFoundBannerTranslations: Record<
  SupportedDisplayLanguageCodes,
  OpinionNotFoundBannerTranslations
> = {
  en: {
    requestedOpinionNotFound: "The requested statement could not be found.",
    opinionId: "Statement ID",
    dismiss: "Dismiss",
    dismissBannerAriaLabel: "Dismiss statement not found message",
  },
  ar: {
    requestedOpinionNotFound: "لا يمكن العثور على المقترح المطلوب.",
    opinionId: "معرف المقترح",
    dismiss: "إغلاق",
    dismissBannerAriaLabel: "إغلاق رسالة عدم العثور على المقترح",
  },
  es: {
    requestedOpinionNotFound: "No se pudo encontrar la proposición solicitada.",
    opinionId: "ID de Proposición",
    dismiss: "Descartar",
    dismissBannerAriaLabel: "Descartar mensaje de proposición no encontrada",
  },
  fr: {
    requestedOpinionNotFound: "La proposition demandée n'a pas pu être trouvée.",
    opinionId: "ID de Proposition",
    dismiss: "Ignorer",
    dismissBannerAriaLabel: "Ignorer le message de proposition introuvable",
  },
  "zh-Hans": {
    requestedOpinionNotFound: "无法找到请求的观点。",
    opinionId: "观点ID",
    dismiss: "关闭",
    dismissBannerAriaLabel: "关闭观点未找到消息",
  },
  "zh-Hant": {
    requestedOpinionNotFound: "無法找到請求的觀點。",
    opinionId: "觀點ID",
    dismiss: "關閉",
    dismissBannerAriaLabel: "關閉觀點未找到消息",
  },
  ja: {
    requestedOpinionNotFound: "リクエストされた主張が見つかりませんでした。",
    opinionId: "主張ID",
    dismiss: "閉じる",
    dismissBannerAriaLabel: "主張が見つからないメッセージを閉じる",
  },
};
