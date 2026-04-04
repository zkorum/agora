import { toBcp47Locale } from "src/utils/language";
import type { ComputedRef, MaybeRefOrGetter } from "vue";
import { computed, toValue } from "vue";
import { useI18n } from "vue-i18n";

export type LocalizedDateTimeValue = Date | number | string;

export const localizedDateTimeFormatOptions = {
  longDate: {
    year: "numeric",
    month: "long",
    day: "numeric",
  } satisfies Intl.DateTimeFormatOptions,
  numericDate: {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  } satisfies Intl.DateTimeFormatOptions,
  dateTime: {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  } satisfies Intl.DateTimeFormatOptions,
  time: {
    hour: "numeric",
    minute: "2-digit",
  } satisfies Intl.DateTimeFormatOptions,
} as const;

export function formatLocalizedDateTime({
  value,
  locale,
  options,
}: {
  value: LocalizedDateTimeValue;
  locale: string;
  options: Intl.DateTimeFormatOptions;
}): string {
  const normalizedDate = value instanceof Date ? value : new Date(value);

  return new Intl.DateTimeFormat(locale, options).format(normalizedDate);
}

export function useLocalizedDateTime({
  value,
  options = localizedDateTimeFormatOptions.dateTime,
}: {
  value: MaybeRefOrGetter<LocalizedDateTimeValue>;
  options?: MaybeRefOrGetter<Intl.DateTimeFormatOptions>;
}): ComputedRef<string> {
  const { locale } = useI18n();

  return computed(() =>
    formatLocalizedDateTime({
      value: toValue(value),
      locale: toBcp47Locale(locale.value),
      options: toValue(options),
    })
  );
}

export function useLocalizedDateTimeFormatter({
  options = localizedDateTimeFormatOptions.dateTime,
}: {
  options?: MaybeRefOrGetter<Intl.DateTimeFormatOptions>;
} = {}): (value: LocalizedDateTimeValue) => string {
  const { locale } = useI18n();

  return (value: LocalizedDateTimeValue) =>
    formatLocalizedDateTime({
      value,
      locale: toBcp47Locale(locale.value),
      options: toValue(options),
    });
}
