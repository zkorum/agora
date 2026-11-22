<script lang="ts">
  import { Dialog } from "bits-ui";

  import Icon from "./icon.svelte";
  import type { DialogProps } from "./view-types.js";

  let {
    title,
    description,
    open = $bindable(false),
    children,
    footer,
    footerInset,
    wide = false,
    dir,
    rootProps = {},
    contentProps = {},
    contentRef = $bindable(null),
    variant,
    closeLabel = "Close dialog",
    closeIcon,
  }: DialogProps = $props();
  const settings = $derived(variant === "settings");
  const actionFooter = $derived(
    Boolean(footer) && !variant && footerInset === "action",
  );
</script>

<Dialog.Root {...rootProps} bind:open>
  <Dialog.Portal>
    <Dialog.Overlay
      class="
        fixed inset-0 z-[calc(90+2*var(--bits-dialog-depth,0))] bg-overlay-soft
      "
    />
    <Dialog.Content
      {...contentProps}
      bind:ref={contentRef}
      {dir}
      class={[
        `
          fixed inset-0 z-[calc(91+2*var(--bits-dialog-depth,0))] m-auto flex
          max-h-[calc(100dvh-32px)] max-w-[calc(100vw-32px)] flex-col border
          border-sky-lighter bg-sky-lightest font-sans text-sm/normal
          text-ink-dark shadow-[0_16px_64px_#211a3326]
          max-md:px-4
        `,
        settings || wide ? "w-5xl" : "w-[594px]",
        settings
          ? `
            h-[min(800px,calc(100dvh-32px))] rounded-xl px-8 pt-8
            max-md:h-[calc(100dvh-16px)] max-md:max-h-[calc(100dvh-16px)]
            max-md:w-[calc(100vw-16px)] max-md:max-w-[calc(100vw-16px)]
            max-md:pt-6
          `
          : `
            h-fit rounded-2xl px-7 pt-7
            max-md:pt-5
          `,
        settings || actionFooter
          ? "pb-4"
          : `
            pb-7
            max-md:pb-5
          `,
        contentProps.class,
      ]}
    >
      <header class="flex shrink-0 items-center justify-between gap-3">
        <Dialog.Title
          class={[
            "text-2xl/normal font-semibold",
            (settings || actionFooter) && "wrap-anywhere",
          ]}>{title}</Dialog.Title
        ><Dialog.Close
          class={[
            `
              grid size-9.5 cursor-pointer place-items-center rounded-lg
              hover:bg-sky-lighter
              focus-visible:outline-3 focus-visible:outline-offset-2
            `,
            settings
              ? "border border-sky-lighter bg-sky-white"
              : "border-0 bg-transparent",
            settings || actionFooter
              ? `
                shrink-0
                focus-visible:outline-primary-base
              `
              : "focus-visible:outline-primary-light",
          ]}
          aria-label={closeLabel}
          >{#if closeIcon}{@render closeIcon()}{:else}<Icon
              name="close"
            />{/if}</Dialog.Close
        >
      </header>
      <Dialog.Description
        class={settings ? "sr-only" : "mt-2 mb-5 text-ink-light"}
        >{description}</Dialog.Description
      >
      <div
        class={[
          "min-h-0",
          settings ? "mt-4 flex-1 overflow-hidden" : "overflow-auto",
        ]}
      >
        {@render children()}
      </div>
      {#if footer}<footer
          class={[
            "flex shrink-0 justify-end",
            settings
              ? "gap-3 pt-4"
              : "mt-5 gap-2.5 border-t border-sky-lighter pt-5",
            actionFooter && "md:px-1",
            (settings || actionFooter) &&
              `
                [&_button]:max-w-full [&_button]:min-w-0
                [&_button]:wrap-anywhere [&_button]:whitespace-normal
              `,
          ]}
        >
          {@render footer()}
        </footer>{/if}
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
