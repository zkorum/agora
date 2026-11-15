<script lang="ts">
  import * as m from "#lib/paraglide/messages.js";
  import { locales, localizeHref, toLocale } from "#lib/paraglide/runtime.js";
  import { browser } from "$app/env";
  import { page } from "$app/state";
  import GradientText from "$ui/shared/gradient-text.svelte";
  import Select from "$ui/shared/select.svelte";
  import type { SelectItem } from "$ui/shared/view-types.js";

  type Locale = (typeof locales)[number];

  function isLocale(value: string): value is Locale {
    return locales.some((locale) => locale === value);
  }

  const localeData: Record<Locale, { label: string; name: string }> = {
    en: { label: "EN", name: "English" },
    fr: { label: "FR", name: "Français" },
    es: { label: "ES", name: "Español" },
    ar: { label: "AR", name: "العربية" },
    fa: { label: "FA", name: "فارسی" },
    he: { label: "HE", name: "עברית" },
    ja: { label: "JA", name: "日本語" },
    ky: { label: "KY", name: "Кыргызча" },
    ru: { label: "RU", name: "Русский" },
    "zh-hans": { label: "中简", name: "简体中文" },
    "zh-hant": { label: "中繁", name: "繁體中文" },
  };

  const selectItems = locales.map((locale) => ({
    value: locale,
    label: localeData[locale].name,
  }));

  const currentLocale = $derived(
    (() => {
      const pathname = page.url.pathname;
      const segment = pathname.split("/").find(Boolean);
      if (segment && isLocale(segment)) {
        return segment;
      }
      return "en";
    })(),
  );

  function handleLocaleChange(newLocale: string | undefined) {
    if (browser && newLocale && isLocale(newLocale)) {
      try {
        localStorage.setItem("displayLanguage", newLocale);
      } catch {
        // The explicit locale URL still works when storage is unavailable.
      }
      const localizedPath = localizeHref(page.url.pathname, {
        locale: newLocale,
      });
      window.location.href = localizedPath + page.url.search + page.url.hash;
    }
  }
</script>

<Select
  items={selectItems}
  placeholder={m.language_label()}
  value={currentLocale}
  onValueChange={handleLocaleChange}
>
  {#snippet triggerLabel(item: SelectItem)}
    <GradientText angle={122}
      >{localeData[toLocale(item.value) ?? "en"].label}</GradientText
    >
  {/snippet}
  {#snippet itemLabel(item: SelectItem)}
    <GradientText angle={122}>{item.label}</GradientText>
  {/snippet}
</Select>
