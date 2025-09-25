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
    requestedOpinionNotFound: "The requested opinion could not be found.",
    opinionId: "Opinion ID",
    dismiss: "Dismiss",
    dismissBannerAriaLabel: "Dismiss opinion not found message",
  },
  ar: {
    requestedOpinionNotFound: "لا يمكن العثور على الرأي المطلوب.",
    opinionId: "معرف الرأي",
    dismiss: "إغلاق",
    dismissBannerAriaLabel: "إغلاق رسالة عدم العثور على الرأي",
  },
  es: {
    requestedOpinionNotFound: "No se pudo encontrar la opinión solicitada.",
    opinionId: "ID de Opinión",
    dismiss: "Descartar",
    dismissBannerAriaLabel: "Descartar mensaje de opinión no encontrada",
  },
  fr: {
    requestedOpinionNotFound: "L'opinion demandée n'a pas pu être trouvée.",
    opinionId: "ID d'Opinion",
    dismiss: "Ignorer",
    dismissBannerAriaLabel: "Ignorer le message d'opinion introuvable",
  },
  "zh-Hans": {
    requestedOpinionNotFound: "无法找到请求的意见。",
    opinionId: "意见ID",
    dismiss: "关闭",
    dismissBannerAriaLabel: "关闭意见未找到消息",
  },
  "zh-Hant": {
    requestedOpinionNotFound: "無法找到請求的意見。",
    opinionId: "意見ID",
    dismiss: "關閉",
    dismissBannerAriaLabel: "關閉意見未找到消息",
  },
  ja: {
    requestedOpinionNotFound: "リクエストされた意見が見つかりませんでした。",
    opinionId: "意見ID",
    dismiss: "閉じる",
    dismissBannerAriaLabel: "意見が見つからないメッセージを閉じる",
  },
};
