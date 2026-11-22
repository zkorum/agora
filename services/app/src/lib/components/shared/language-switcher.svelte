<script lang="ts">
  import { baseLocale, locales, localizeHref } from "#lib/paraglide/runtime.js";
  import { browser } from "$app/env";
  import { page } from "$app/state";
  import LanguageSelect from "$ui/shared/language-select.svelte";

  let { variant = "compact" }: { variant?: "compact" | "field" } = $props();
  const value = $derived(
    locales.find((locale) => locale === page.url.pathname.split("/")[1]) ??
      baseLocale,
  );

  function changeLocale(locale: (typeof locales)[number]) {
    if (!browser) return;
    try {
      localStorage.setItem("displayLanguage", locale);
    } catch {
      // The explicit locale URL still works when storage is unavailable.
    }
    window.location.href =
      localizeHref(page.url.pathname, { locale }) +
      page.url.search +
      page.url.hash;
  }
</script>

<LanguageSelect {value} {variant} onchange={changeLocale} />
