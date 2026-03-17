import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ReportFooterTranslations {
  generatedOn: string;
  poweredBy: string;
}

export const reportFooterTranslations: Record<
  SupportedDisplayLanguageCodes,
  ReportFooterTranslations
> = {
  en: {
    generatedOn: "Report generated on",
    poweredBy: "Powered by Agora Citizen Network",
  },
  ar: {
    generatedOn: "تم إنشاء التقرير في",
    poweredBy: "مدعوم من شبكة أغورا المواطنين",
  },
  es: {
    generatedOn: "Informe generado el",
    poweredBy: "Desarrollado por Agora Citizen Network",
  },
  fr: {
    generatedOn: "Rapport généré le",
    poweredBy: "Propulsé par Agora Citizen Network",
  },
  "zh-Hans": {
    generatedOn: "报告生成于",
    poweredBy: "由 Agora Citizen Network 提供支持",
  },
  "zh-Hant": {
    generatedOn: "報告生成於",
    poweredBy: "由 Agora Citizen Network 提供支持",
  },
  ja: {
    generatedOn: "レポート生成日",
    poweredBy: "Agora Citizen Network 提供",
  },
  ky: {
    generatedOn: "Отчёт түзүлгөн күн",
    poweredBy: "Agora Citizen Network тарабынан иштетилет",
  },
  ru: {
    generatedOn: "Отчёт сформирован",
    poweredBy: "Работает на Agora Citizen Network",
  },
};
