<script lang="ts">
  import { Button, Dialog } from "bits-ui";
  import { MediaQuery } from "svelte/reactivity";

  import * as m from "#lib/paraglide/messages.js";
  import Chip from "$ui/shared/chip.svelte";

  import { desktopMediaQueries } from "./responsive.js";
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

  const workspaceDesktop = new MediaQuery(desktopMediaQueries.md);
  const landingDesktop = new MediaQuery(desktopMediaQueries.lg);
  const desktop = $derived(
    appearance === "sidebar"
      ? workspaceDesktop.current
      : landingDesktop.current,
  );

  // Close the portaled dialog on desktop so it releases focus and scroll lock.
  $effect(() => {
    if (desktop && open) open = false;
  });
</script>

<Dialog.Root {...rootProps} bind:open>
  <Dialog.Portal>
    <Dialog.Overlay
      class={[
        "fixed inset-0",
        appearance === "default"
          ? `
            z-60 animate-[fade-in_200ms_ease-out] bg-black/30
            data-[state=closed]:animate-[fade-out_200ms_ease-out]
            motion-reduce:animate-none
            motion-reduce:data-[state=closed]:animate-none
          `
          : "z-81 bg-overlay-soft",
      ]}
    />
    <Dialog.Content
      {...contentProps}
      bind:ref={contentRef}
      {dir}
      class={[
        "fixed inset-y-0 flex flex-col overflow-hidden shadow-xl",
        appearance === "default"
          ? `
            inset-e-0 z-70 w-full max-w-70
            animate-[slide-in-from-right_300ms_ease-out] bg-sky-white
            data-[state=closed]:animate-[slide-out-to-right_300ms_ease-out]
            motion-reduce:animate-none
            motion-reduce:data-[state=closed]:animate-none
            rtl:animate-[slide-in-from-left_300ms_ease-out]
            rtl:data-[state=closed]:animate-[slide-out-to-left_300ms_ease-out]
            rtl:motion-reduce:animate-none
            rtl:motion-reduce:data-[state=closed]:animate-none
          `
          : `
            inset-s-0 z-82 w-full max-w-60 bg-sky-lightest font-sans
            leading-normal tracking-[-0.01em] text-ink-dark
          `,
        contentProps.class,
      ]}
    >
      <Dialog.Title class="sr-only">{title}</Dialog.Title>
      <div class="flex shrink-0 items-center justify-end px-6 py-4">
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
        <div class="flex min-h-0 flex-1 flex-col gap-4 px-5 pb-5">
          {@render navigation()}
        </div>
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
