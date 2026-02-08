<script lang="ts">
  import { browser } from "$app/environment";
  import { page } from "$app/state";
  import { locales, localizeHref } from "$lib/paraglide/runtime";
  import GradientText from "$ui/shared/gradient-text.svelte";
  import Select from "$ui/shared/select.svelte";

  const localeData = [
    { code: "en", label: "EN", name: "English" },
    { code: "fr", label: "FR", name: "Français" },
    { code: "es", label: "ES", name: "Español" },
    { code: "ar", label: "AR", name: "العربية" },
    { code: "ja", label: "JA", name: "日本語" },
    { code: "zh-hans", label: "中简", name: "简体中文" },
    { code: "zh-hant", label: "中繁", name: "繁體中文" },
  ];

  const availableLocales = $derived(
    localeData.filter((l) =>
      locales.includes(l.code as (typeof locales)[number]),
    ),
  );

  // Map to Select item format
  const selectItems = $derived(
    availableLocales.map((l) => ({ value: l.code, label: l.label })),
  );

  const currentLocale = $derived(
    (() => {
      const pathname = page.url.pathname;
      const segment = pathname.split("/").find(Boolean);
      if (segment && locales.includes(segment as (typeof locales)[number])) {
        return segment;
      }
      return "en";
    })(),
  );

  function handleLocaleChange(newLocale: string | undefined) {
    if (browser && newLocale) {
      localStorage.setItem("displayLanguage", newLocale);
      const localizedPath = localizeHref(page.url.pathname, {
        locale: newLocale,
      });
      window.location.href = localizedPath;
    }
  }
</script>

<Select
  items={selectItems}
  value={currentLocale}
  onValueChange={handleLocaleChange}
>
  {#snippet triggerLabel(item)}
    <GradientText angle={122}>{item.label}</GradientText>
  {/snippet}
  {#snippet itemLabel(item)}
    <GradientText angle={122}>{item.label}</GradientText>
  {/snippet}
</Select>
