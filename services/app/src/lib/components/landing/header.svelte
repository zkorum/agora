<script lang="ts">
  import { NavigationMenu } from "bits-ui";

  import LanguageSwitcher from "$components/shared/language-switcher.svelte";
  import agoraIcon from "$lib/assets/agora-icon.svg";
  import agoraText from "$lib/assets/agora-text.svg";
  import * as m from "$lib/paraglide/messages.js";
  import { localizeHref } from "$lib/paraglide/runtime";
  import Chip from "$ui/shared/chip.svelte";
  import MobileNavDrawer from "$ui/shared/mobile-nav-drawer.svelte";
  import TopBar from "$ui/shared/top-bar.svelte";

  interface Props {
    hideOnScroll?: boolean;
  }

  let { hideOnScroll = false }: Props = $props();

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
    <a
      href="https://www.agoracitizen.app/welcome"
      class="
        hidden items-center justify-center rounded-chip px-2 py-[7px]
        text-sm/none-sm font-medium tracking-sm text-white gradient-primary
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
        hover:bg-zinc-100
        lg:hidden
      "
      onclick={() => (mobileMenuOpen = true)}
      aria-label="Open navigation menu"
    >
      <span class="icon-[lucide--menu] h-6 w-6 gradient-primary"></span>
    </button>
  {/snippet}
</TopBar>

<!-- Mobile drawer -->
<MobileNavDrawer
  bind:open={mobileMenuOpen}
  links={navLinks}
  onNavigate={() => (mobileMenuOpen = false)}
>
  <LanguageSwitcher />
</MobileNavDrawer>
