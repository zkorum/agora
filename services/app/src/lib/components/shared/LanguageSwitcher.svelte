<script lang="ts">
  import { Select } from "bits-ui";

  import { browser } from "$app/environment";
  import { page } from "$app/state";
  import GradientText from "$lib/components/shared/GradientText.svelte";
  import { locales, localizeHref } from "$lib/paraglide/runtime";

  const localeLabels: Record<string, string> = {
    en: "EN",
    fr: "FR",
    es: "ES",
    ar: "AR",
    ja: "JA",
    "zh-hans": "中简",
    "zh-hant": "中繁",
  };

  const localeNames: Record<string, string> = {
    en: "English",
    fr: "Français",
    es: "Español",
    ar: "العربية",
    ja: "日本語",
    "zh-hans": "简体中文",
    "zh-hant": "繁體中文",
  };

  let currentLocale = $derived(
    (() => {
      const pathname = page.url.pathname;
      const segment = pathname.split("/").find(Boolean);
      if (segment && locales.includes(segment as (typeof locales)[number])) {
        return segment;
      }
      return "en";
    })(),
  );

  function handleLocaleChange(newLocale: string) {
    if (browser) {
      // eslint-disable-next-line no-undef -- localStorage is available in browser
      localStorage.setItem("displayLanguage", newLocale);
      const localizedPath = localizeHref(page.url.pathname, {
        locale: newLocale,
      });
      // eslint-disable-next-line no-undef -- window is available in browser
      window.location.href = localizedPath;
    }
  }
</script>

<Select.Root
  type="single"
  value={currentLocale}
  onValueChange={(value: string | undefined) => {
    if (value) {
      handleLocaleChange(value);
    }
  }}
>
  <Select.Trigger
    class="
      inline-flex items-center gap-1 rounded-chip px-[2px] py-[5px] text-sm
      leading-[14px] font-semibold tracking-[-0.14px]
    "
  >
    <GradientText angle={122}>
      {localeLabels[currentLocale] ?? currentLocale.toUpperCase()}
    </GradientText>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 256 256"
      class="text-brand-purple"
      fill="currentColor"
    >
      <path
        d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z"
      />
    </svg>
  </Select.Trigger>

  <Select.Portal>
    <Select.Content
      class="
        z-80 min-w-[140px] overflow-hidden rounded-lg border border-zinc-200
        bg-white shadow-lg
      "
      sideOffset={4}
    >
      <Select.Viewport class="p-1">
        {#each locales as locale (locale)}
          <Select.Item
            value={locale}
            label={localeNames[locale] ?? locale}
            class="
              cursor-pointer rounded-md px-3 py-2 text-sm outline-none
              data-highlighted:bg-zinc-100
              data-selected:font-medium
            "
          >
            <a
              href={localizeHref(page.url.pathname, { locale })}
              data-sveltekit-reload
              onclick={(e) => {
                e.preventDefault();
                handleLocaleChange(locale);
              }}
              class="
                block w-full
                bg-[linear-gradient(122deg,var(--color-brand-purple)_46%,var(--color-brand-blue)_100%)]
                bg-clip-text text-transparent
              "
            >
              {localeNames[locale] ?? locale}
            </a>
          </Select.Item>
        {/each}
      </Select.Viewport>
    </Select.Content>
  </Select.Portal>
</Select.Root>
