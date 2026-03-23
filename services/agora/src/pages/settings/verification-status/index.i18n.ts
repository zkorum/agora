import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface VerificationStatusTranslations {
  pageTitle: string;
  detectedSex: string;
  citizenship: string;
}

export const verificationStatusTranslations: Record<
  SupportedDisplayLanguageCodes,
  VerificationStatusTranslations
> = {
  en: {
    pageTitle: "Verification Status",
    detectedSex: "Detected Sex",
    citizenship: "Citizenship",
  },
  ar: {
    pageTitle: "حالة التحقق",
    detectedSex: "الجنس المكتشف",
    citizenship: "الجنسية",
  },
  es: {
    pageTitle: "Estado de verificación",
    detectedSex: "Sexo detectado",
    citizenship: "Ciudadanía",
  },
  fa: {
    pageTitle: "وضعیت تأیید هویت",
    detectedSex: "جنسیت شناسایی‌شده",
    citizenship: "تابعیت",
  },
  he: {
    pageTitle: "סטטוס אימות",
    detectedSex: "מין שזוהה",
    citizenship: "אזרחות",
  },
  fr: {
    pageTitle: "Statut de vérification",
    detectedSex: "Sexe détecté",
    citizenship: "Citoyenneté",
  },
  "zh-Hans": {
    pageTitle: "验证状态",
    detectedSex: "检测到的性别",
    citizenship: "国籍",
  },
  "zh-Hant": {
    pageTitle: "驗證狀態",
    detectedSex: "檢測到的性別",
    citizenship: "國籍",
  },
  ja: {
    pageTitle: "認証ステータス",
    detectedSex: "検出された性別",
    citizenship: "国籍",
  },
  ky: {
    pageTitle: "Текшерүү абалы",
    detectedSex: "Аныкталган жынысы",
    citizenship: "Жарандыгы",
  },
  ru: {
    pageTitle: "Статус верификации",
    detectedSex: "Определённый пол",
    citizenship: "Гражданство",
  },
};
