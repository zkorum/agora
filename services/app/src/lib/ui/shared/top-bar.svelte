<script lang="ts">
  import { NavigationMenu } from "bits-ui";
  import type { Snippet } from "svelte";

  import { createScrollVisibility } from "$logic/shared/scroll-visibility.svelte";

  interface Props {
    hideOnScroll?: boolean;
    start?: Snippet;
    nav?: Snippet;
    end?: Snippet;
  }

  let { hideOnScroll = false, start, nav, end }: Props = $props();

  const scrollVisibility = createScrollVisibility();

  $effect(() => {
    if (!hideOnScroll) return;

    function handleScroll() {
      scrollVisibility.update(window.scrollY);
    }

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  });

  const headerClass = $derived(
    hideOnScroll && scrollVisibility.hidden
      ? "-translate-y-full lg:translate-y-0"
      : "translate-y-0",
  );
</script>

<header
  class="
    fixed inset-x-0 top-0 z-50 transition-transform duration-300
    {headerClass}"
>
  <div
    class="mx-auto flex max-w-[1440px] items-center justify-between px-8 py-6"
  >
    {@render start?.()}

    <NavigationMenu.Root
      orientation="horizontal"
      class="
        hidden items-center gap-1.5
        lg:flex
      "
    >
      <NavigationMenu.List class="flex items-center gap-1.5">
        {@render nav?.()}
      </NavigationMenu.List>
    </NavigationMenu.Root>

    <div class="flex items-center gap-3">
      {@render end?.()}
    </div>
  </div>
</header>
