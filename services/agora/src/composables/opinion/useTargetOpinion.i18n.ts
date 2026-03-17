import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface UseTargetOpinionTranslations {
  statementNotFound: string;
}

export const useTargetOpinionTranslations: Record<
  SupportedDisplayLanguageCodes,
  UseTargetOpinionTranslations
> = {
  en: {
    statementNotFound: "The requested statement could not be found.",
  },
  ar: {
    statementNotFound: "لا يمكن العثور على المقترح المطلوب.",
  },
  es: {
    statementNotFound: "No se pudo encontrar la proposición solicitada.",
  },
  fr: {
    statementNotFound: "La proposition demandée n'a pas pu être trouvée.",
  },
  "zh-Hans": {
    statementNotFound: "无法找到请求的观点。",
  },
  "zh-Hant": {
    statementNotFound: "無法找到請求的觀點。",
  },
  ja: {
    statementNotFound: "リクエストされた主張が見つかりませんでした。",
  },
  ky: {
    statementNotFound: "Суралган пикир табылган жок.",
  },
  ru: {
    statementNotFound: "Запрошенное высказывание не найдено.",
  },
};
