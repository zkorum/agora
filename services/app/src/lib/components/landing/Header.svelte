<script lang="ts">
  import { browser } from "$app/environment";
  import LanguageSwitcher from "$components/shared/language-switcher.svelte";
  import * as m from "$lib/paraglide/messages.js";
  import { localizeHref } from "$lib/paraglide/runtime";
  import GradientText from "$ui/shared/gradient-text.svelte";

  let mobileMenuOpen = $state(false);

  const navLinks = $derived([
    { label: m.nav_facilitators(), href: localizeHref("/#facilitators") },
    { label: m.nav_citizens(), href: localizeHref("/#citizens") },
    { label: m.nav_usecases(), href: localizeHref("/#usecases") },
    { label: m.nav_testimonials(), href: localizeHref("/#testimonials") },
    { label: m.nav_casestudies(), href: localizeHref("/#casestudies") },
    { label: m.nav_blog(), href: localizeHref("/blog") },
    { label: m.nav_pricing(), href: localizeHref("/#pricing") },
    { label: m.nav_team(), href: localizeHref("/#team") },
  ]);

  function openMenu() {
    mobileMenuOpen = true;
    if (browser) {
      // eslint-disable-next-line no-undef -- document is available in browser
      document.body.style.overflow = "hidden";
    }
  }

  function closeMenu() {
    mobileMenuOpen = false;
    if (browser) {
      // eslint-disable-next-line no-undef -- document is available in browser
      document.body.style.overflow = "";
    }
  }
</script>

<header class="fixed inset-x-0 top-0 z-50">
  <div
    class="mx-auto flex max-w-[1440px] items-center justify-between px-8 py-6"
  >
    <!-- Logo -->
    <a href={localizeHref("/")} class="flex shrink-0 items-center gap-3">
      <img src="/images/agora-icon.svg" alt="" class="h-[29px] w-auto" />
      <img src="/images/agora-text.svg" alt="Agora" class="h-[25px] w-auto" />
    </a>

    <!-- Desktop nav chips -->
    <nav
      class="
        hidden items-center gap-1.5
        lg:flex
      "
    >
      {#each navLinks as link (link.href)}
        <a
          href={link.href}
          class="
            rounded-chip
            bg-[linear-gradient(150deg,var(--color-gradient-light-purple)_46%,var(--color-gradient-light-blue)_100%)]
            px-2.5 py-[6px] text-sm font-medium tracking-[-0.14px]
          "
        >
          <GradientText angle={144}>{link.label}</GradientText>
        </a>
      {/each}
    </nav>

    <!-- Right side: Log In + Language switcher + mobile hamburger -->
    <div class="flex items-center gap-3">
      <a
        href="https://www.agoracitizen.app/welcome"
        class="
          hidden items-center justify-center rounded-chip
          bg-[linear-gradient(132deg,var(--color-brand-purple)_46%,var(--color-brand-blue)_100%)]
          px-2 py-[7px] text-sm leading-[14px] font-medium tracking-[-0.14px]
          text-white
          lg:inline-flex
        "
      >
        {m.nav_login()}
      </a>
      <div
        class="
          hidden
          lg:block
        "
      >
        <LanguageSwitcher />
      </div>

      <!-- Mobile hamburger button -->
      <button
        type="button"
        class="
          inline-flex items-center justify-center rounded-md p-2
          text-text-primary
          hover:bg-zinc-100
          lg:hidden
        "
        onclick={openMenu}
        aria-label="Open navigation menu"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <line x1="4" x2="20" y1="12" y2="12" /><line
            x1="4"
            x2="20"
            y1="6"
            y2="6"
          /><line x1="4" x2="20" y1="18" y2="18" />
        </svg>
      </button>
    </div>
  </div>
</header>

<!-- Mobile drawer overlay -->
{#if mobileMenuOpen}
  <div
    class="fixed inset-0 z-60 bg-black/30 transition-opacity duration-300"
    class:opacity-100={mobileMenuOpen}
    onclick={closeMenu}
    onkeydown={(e) => {
      if (e.key === "Escape") closeMenu();
    }}
    role="presentation"
  ></div>
{/if}

<!-- Mobile drawer -->
<nav
  class="
    fixed top-0 right-0 z-70 flex h-full w-[280px] flex-col bg-white shadow-xl
    transition-transform duration-300 ease-in-out
  "
  class:translate-x-0={mobileMenuOpen}
  class:translate-x-full={!mobileMenuOpen}
  aria-label="Mobile navigation"
>
  <div class="flex items-center justify-end px-6 py-4">
    <button
      type="button"
      class="
        inline-flex items-center justify-center rounded-full p-2
        text-text-primary
        hover:bg-surface-hover
      "
      onclick={closeMenu}
      aria-label="Close navigation menu"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M18 6 6 18" /><path d="m6 6 12 12" />
      </svg>
    </button>
  </div>

  <div class="flex flex-1 flex-col gap-2 overflow-y-auto px-5 py-2">
    {#each navLinks as link (link.href)}
      <a
        href={link.href}
        class="
          rounded-xl
          bg-[linear-gradient(150deg,var(--color-gradient-light-purple)_46%,var(--color-gradient-light-blue)_100%)]
          px-5 py-3 text-base font-medium tracking-[-0.16px] transition-opacity
          hover:opacity-80
        "
        onclick={closeMenu}
      >
        <GradientText angle={144}>{link.label}</GradientText>
      </a>
    {/each}
  </div>

  <div class="border-t border-zinc-100 px-6 py-4">
    <LanguageSwitcher />
  </div>
</nav>
