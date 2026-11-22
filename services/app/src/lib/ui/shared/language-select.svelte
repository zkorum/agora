<script lang="ts">
  import * as m from "#lib/paraglide/messages.js";
  import { locales } from "#lib/paraglide/runtime.js";
  import GradientText from "$ui/shared/gradient-text.svelte";
  import Select from "$ui/shared/select.svelte";
  import type { SelectItem } from "$ui/shared/view-types.js";

  type Locale = (typeof locales)[number];

  let {
    value,
    onchange,
    variant = "compact",
  }: {
    value: Locale;
    onchange: (locale: Locale) => void;
    variant?: "compact" | "field";
  } = $props();

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
</script>

<Select
  type="single"
  dir={["ar", "fa", "he"].includes(value) ? "rtl" : "ltr"}
  items={selectItems}
  placeholder={m.language_label()}
  {variant}
  {value}
  label={variant === "field" ? m.settings_display_language() : undefined}
  onValueChange={(locale: Locale | undefined) => {
    if (locale) onchange(locale);
  }}
  triggerProps={variant === "compact"
    ? { "aria-label": m.language_label() }
    : {}}
>
  {#snippet triggerLabel(item: SelectItem<Locale>)}
    {#if variant === "compact"}
      <GradientText angle={122}>{localeData[item.value].label}</GradientText>
    {:else}
      {item.label}
    {/if}
  {/snippet}
</Select>
