<script lang="ts">
  import { NavigationMenu } from "bits-ui";

  import LanguageSwitcher from "$components/shared/language-switcher.svelte";
  import agoraIcon from "$lib/assets/agora-icon.svg";
  import agoraText from "$lib/assets/agora-text.svg";
  import * as m from "$lib/paraglide/messages.js";
  import { localizeHref } from "$lib/paraglide/runtime";
  import Chip from "$ui/shared/chip.svelte";
  import GradientButton from "$ui/shared/gradient-button.svelte";
  import MobileNavDrawer from "$ui/shared/mobile-nav-drawer.svelte";
  import TopBar from "$ui/shared/top-bar.svelte";

  interface Props {
    hideOnScroll?: boolean;
    variant?: "default" | "resources";
  }

  let { hideOnScroll = false, variant = "default" }: Props = $props();

  let mobileMenuOpen = $state(false);

  const loginHref = "https://www.agoracitizen.app/welcome";

  const defaultNavLinks = $derived([
    { label: m.nav_facilitators(), href: localizeHref("/#facilitators") },
    { label: m.nav_citizens(), href: localizeHref("/#citizens") },
    { label: m.nav_usecases(), href: localizeHref("/#usecases") },
    { label: m.nav_testimonials(), href: localizeHref("/#testimonials") },
    { label: m.nav_casestudies(), href: localizeHref("/#resources") },
    { label: m.nav_pricing(), href: localizeHref("/#pricing") },
    { label: "FAQ", href: localizeHref("/#faq") },
    { label: m.nav_team(), href: localizeHref("/#team") },
  ]);

  const resourceNavLinks = $derived([
    { label: m.nav_facilitators(), href: localizeHref("/#facilitators") },
    { label: m.nav_citizens(), href: localizeHref("/#citizens") },
    { label: m.nav_usecases(), href: localizeHref("/#usecases") },
    { label: m.nav_testimonials(), href: localizeHref("/#testimonials") },
    { label: "FAQ", href: localizeHref("/#faq") },
    { label: m.nav_casestudies(), href: localizeHref("/resources") },
  ]);

  const navLinks = $derived(
    variant === "resources" ? resourceNavLinks : defaultNavLinks,
  );
</script>

<TopBar {hideOnScroll}>
  {#snippet start()}
    <!-- Logo -->
    <a href={localizeHref("/")} class="flex shrink-0 items-center gap-3">
      <img src={agoraIcon} alt="" class="h-[29px] w-auto" />
      <img src={agoraText} alt="Agora" class="h-[25px] w-auto" />
    </a>
  {/snippet}

  {#snippet nav()}
    {#each navLinks as link (link.href)}
      <NavigationMenu.Item>
        <NavigationMenu.Link href={link.href}>
          <Chip variant="nav">{link.label}</Chip>
        </NavigationMenu.Link>
      </NavigationMenu.Item>
    {/each}
  {/snippet}

  {#snippet end()}
    {#if variant !== "resources"}
      <div
        class="
          hidden
          lg:block
        "
      >
        <GradientButton href={loginHref} size="sm">
          {m.nav_login()}
        </GradientButton>
      </div>
    {/if}
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
        hover:bg-zinc-100
        lg:hidden
      "
      onclick={() => (mobileMenuOpen = true)}
      aria-label="Open navigation menu"
    >
      <span class="icon-[lucide--menu] size-6 gradient-primary"></span>
    </button>
  {/snippet}
</TopBar>

<!-- Mobile drawer -->
<MobileNavDrawer
  bind:open={mobileMenuOpen}
  links={navLinks}
  onNavigate={() => (mobileMenuOpen = false)}
>
  {#snippet action()}
    {#if variant !== "resources"}
      <GradientButton href={loginHref} size="sm">
        {m.nav_login()}
      </GradientButton>
    {/if}
  {/snippet}
  <LanguageSwitcher />
</MobileNavDrawer>
