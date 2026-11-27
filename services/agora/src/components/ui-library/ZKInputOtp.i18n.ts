import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ZKInputOtpTranslations {
  codeLabel: string;
  characterLabel: string;
}

export const zkInputOtpTranslations: Record<
  SupportedDisplayLanguageCodes,
  ZKInputOtpTranslations
> = {
  en: {
    codeLabel: "Verification code",
    characterLabel: "Verification code, character {index} of {total}",
  },
  de: {
    codeLabel: "Verifizierungscode",
    characterLabel: "Verifizierungscode, Zeichen {index} von {total}",
  },
  hi: {
    codeLabel: "सत्यापन कोड",
    characterLabel: "सत्यापन कोड, {total} का अक्षर {index}",
  },
  fr: {
    codeLabel: "Code de vérification",
    characterLabel: "Code de vérification, caractère {index} sur {total}",
  },
  es: {
    codeLabel: "Código de verificación",
    characterLabel: "Código de verificación, carácter {index} de {total}",
  },
  ar: {
    codeLabel: "رمز التحقق",
    characterLabel: "رمز التحقق، الحرف {index} من {total}",
  },
  fa: {
    codeLabel: "کد تأیید",
    characterLabel: "کد تأیید، نویسهٔ {index} از {total}",
  },
  he: {
    codeLabel: "קוד אימות",
    characterLabel: "קוד אימות, תו {index} מתוך {total}",
  },
  ja: {
    codeLabel: "確認コード",
    characterLabel: "確認コード、{total} 文字中 {index} 文字目",
  },
  ky: {
    codeLabel: "Текшерүү коду",
    characterLabel: "Текшерүү коду, {total} белгинин {index}-белгиси",
  },
  ru: {
    codeLabel: "Код подтверждения",
    characterLabel: "Код подтверждения, символ {index} из {total}",
  },
  "zh-Hans": {
    codeLabel: "验证码",
    characterLabel: "验证码，第 {index} 个字符，共 {total} 个",
  },
  "zh-Hant": {
    codeLabel: "驗證碼",
    characterLabel: "驗證碼，第 {index} 個字元，共 {total} 個",
  },
};
