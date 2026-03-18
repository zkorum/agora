<script lang="ts">
  import type { Snippet } from "svelte";

  import Chip from "$ui/shared/chip.svelte";
  import Sheet from "$ui/shared/sheet.svelte";

  interface NavLink {
    label: string;
    href: string;
  }

  interface Props {
    open?: boolean;
    links: NavLink[];
    onNavigate?: () => void;
    action?: Snippet;
    children?: Snippet;
  }

  let {
    open = $bindable(false),
    links,
    onNavigate,
    action,
    children,
  }: Props = $props();
</script>

<Sheet bind:open title="Navigation menu" side="right">
  <!-- Close button (top-right) -->
  <div class="flex items-center justify-end px-6 py-4">
    <button
      type="button"
      class="
        inline-flex items-center justify-center rounded-full p-2 text-foreground
        hover:bg-sky-lightest
      "
      onclick={() => (open = false)}
      aria-label="Close navigation menu"
    >
      <span class="icon-[lucide--x] size-5"></span>
    </button>
  </div>

  <!-- Nav links using Chip -->
  <nav
    class="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-2"
    aria-label="Mobile navigation"
  >
    {#each links as link (link.href)}
      <a href={link.href} onclick={onNavigate}>
        <Chip variant="nav" class="w-full px-5 py-3 text-base tracking-base">
          {link.label}
        </Chip>
      </a>
    {/each}
  </nav>

  <!-- Action slot (above the footer border) -->
  {#if action}
    <div class="px-6 pb-4">
      {@render action()}
    </div>
  {/if}

  <!-- Footer slot -->
  {#if children}
    <div class="border-t border-sky-light px-6 py-4">
      {@render children()}
    </div>
  {/if}
</Sheet>
