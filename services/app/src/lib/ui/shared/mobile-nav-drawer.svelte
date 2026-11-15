<script lang="ts">
  import { Button, Dialog } from "bits-ui";

  import * as m from "#lib/paraglide/messages.js";
  import Chip from "$ui/shared/chip.svelte";

  import type { MobileNavDrawerProps } from "./view-types.js";

  let {
    open = $bindable(false),
    links = [],
    onNavigate,
    action,
    children,
    navigation,
    appearance = "default",
    title = m.mobile_nav_title(),
    closeLabel = m.mobile_nav_close(),
    dir,
    rootProps = {},
    contentProps = {},
    contentRef = $bindable(null),
  }: MobileNavDrawerProps = $props();

  function closeOnDesktop() {
    const query =
      appearance === "sidebar" ? "(min-width: 761px)" : "(min-width: 1024px)";
    if (window.matchMedia(query).matches) open = false;
  }
</script>

<svelte:window onresize={closeOnDesktop} />

<Dialog.Root {...rootProps} bind:open>
  <Dialog.Portal>
    <Dialog.Overlay class={["agora-mobile-drawer-overlay", appearance]} />
    <Dialog.Content
      {...contentProps}
      bind:ref={contentRef}
      {dir}
      class={[`agora-mobile-drawer`, appearance, contentProps.class]}
    >
      <Dialog.Title class="sr-only">{title}</Dialog.Title>
      <div class="flex items-center justify-end px-6 py-4">
        <Dialog.Close
          class="
            inline-flex items-center justify-center rounded-full p-2
            text-foreground
            hover:bg-sky-lightest
          "
          aria-label={closeLabel}
        >
          <span class="icon-[lucide--x] size-5"></span>
        </Dialog.Close>
      </div>

      {#if navigation}
        <div class="drawer-navigation">{@render navigation()}</div>
      {:else}
        <nav
          class="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-2"
          aria-label={m.mobile_nav_label()}
        >
          {#each links as link (link.href)}
            <Button.Root
              href={link.href}
              onclick={() => {
                open = false;
                onNavigate?.();
              }}
            >
              <Chip
                variant="nav"
                class="w-full px-5 py-3 text-base tracking-base"
              >
                {link.label}
              </Chip>
            </Button.Root>
          {/each}
        </nav>
      {/if}

      {#if action}
        <div class="px-6 pb-4">
          {@render action()}
        </div>
      {/if}

      {#if children}
        <div class="border-t border-sky-light px-6 py-4">
          {@render children()}
        </div>
      {/if}
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>

<style>
  :global(.agora-mobile-drawer-overlay) {
    position: fixed;
    inset: 0;
    z-index: 60;
    background: rgb(0 0 0 / 30%);
  }
  :global(.agora-mobile-drawer) {
    position: fixed;
    inset-block: 0;
    inset-inline-end: 0;
    z-index: 70;
    display: flex;
    flex-direction: column;
    width: min(280px, 100vw);
    overflow: hidden;
    background: var(--sky-white);
    box-shadow:
      0 20px 25px -5px rgb(0 0 0 / 10%),
      0 8px 10px -6px rgb(0 0 0 / 10%);
  }
  :global(.agora-mobile-drawer.default) {
    animation: slide-in-from-right 300ms ease-out;
  }
  :global(.agora-mobile-drawer.default[data-state="closed"]) {
    animation-name: slide-out-to-right;
  }
  :global(.agora-mobile-drawer.default:dir(rtl)) {
    animation-name: slide-in-from-left;
  }
  :global(.agora-mobile-drawer.default:dir(rtl)[data-state="closed"]) {
    animation-name: slide-out-to-left;
  }
  :global(.agora-mobile-drawer-overlay.default) {
    animation: fade-in 200ms ease-out;
  }
  :global(.agora-mobile-drawer-overlay.default[data-state="closed"]) {
    animation-name: fade-out;
  }
  :global(.agora-mobile-drawer-overlay.sidebar) {
    z-index: 81;
    background: #211a3340;
  }
  :global(.agora-mobile-drawer.sidebar) {
    inset-inline-start: 0;
    inset-inline-end: auto;
    z-index: 82;
    width: min(240px, 100vw);
    background: var(--sky-lightest);
    color: var(--ink-dark);
    font-family: var(--font-albert-sans);
    line-height: 1.5;
    letter-spacing: -0.01em;
  }
  .drawer-navigation {
    display: flex;
    flex: 1;
    min-height: 0;
    flex-direction: column;
    gap: 16px;
    padding-inline: 20px;
    padding-block-end: 20px;
  }
  @media (prefers-reduced-motion: reduce) {
    :global(.agora-mobile-drawer.default),
    :global(.agora-mobile-drawer-overlay.default) {
      animation: none;
    }
  }
</style>
