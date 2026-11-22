import { ZodSupportedDisplayLanguageCodes } from "src/shared/languages";
import { useI18n } from "vue-i18n";

// Named formats let Vue I18n reuse the formatter across rows and rerenders.
const formats = {
  integer: { maximumFractionDigits: 0 },
  signedInteger: { maximumFractionDigits: 0, signDisplay: "exceptZero" },
  percent: { style: "percent" },
} satisfies Record<string, Intl.NumberFormatOptions>;

export const numberFormats = Object.fromEntries(
  ZodSupportedDisplayLanguageCodes.options.map(
    (locale) => [locale, formats] as const
  )
);

export function useDisplayNumbers() {
  const { n } = useI18n();
  const format = (key: keyof typeof formats) => (value: number) =>
    n(value, key);
  return {
    integer: format("integer"),
    signedInteger: format("signedInteger"),
    percent: format("percent"),
  };
}
