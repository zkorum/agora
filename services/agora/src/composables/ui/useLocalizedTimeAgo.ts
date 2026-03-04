import { formatTimeAgoIntl, useTimeAgoIntl } from "@vueuse/core";
import type { ComputedRef, MaybeRefOrGetter } from "vue";
import { useI18n } from "vue-i18n";

/**
 * Map internal display language codes to BCP 47 locale identifiers
 * for Intl.RelativeTimeFormat.
 */
function toBcp47Locale(code: string): string {
  switch (code) {
    case "zh-Hans":
      return "zh-CN";
    case "zh-Hant":
      return "zh-TW";
    default:
      return code;
  }
}

/**
 * Reactive composable for localized relative time strings.
 * Auto-updates periodically (default: every 30s).
 */
export function useLocalizedTimeAgo(
  time: MaybeRefOrGetter<Date | number | string>
): ComputedRef<string> {
  const { locale } = useI18n();
  return useTimeAgoIntl(time, { locale: toBcp47Locale(locale.value) });
}

/**
 * Returns a formatter function for localized relative time strings.
 * Call during setup; the returned function reads locale reactively.
 * Use in v-for loops where auto-update is unnecessary.
 */
export function useLocalizedTimeAgoFormatter(): (time: Date) => string {
  const { locale } = useI18n();

  return (time: Date) =>
    formatTimeAgoIntl(time, { locale: toBcp47Locale(locale.value) });
}
