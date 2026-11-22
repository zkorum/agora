<script lang="ts">
  import { DropdownMenu } from "bits-ui";

  import * as m from "#lib/paraglide/messages.js";
  import Button from "$ui/shared/button.svelte";
  import Icon from "$ui/shared/icon.svelte";

  let {
    text,
    dir,
    onmoderate,
  }: {
    text: string;
    dir: "ltr" | "rtl";
    onmoderate: ((opener: HTMLElement) => void) | undefined;
  } = $props();
  let menuTrigger: HTMLElement | null = $state(null);
  let openingDialog = false;
  let copyResult = $state<"copied" | "failed">();
  const triggerClass =
    "inline-flex min-h-8.5 cursor-pointer items-center justify-center rounded-lg border border-sky-lighter bg-sky-white p-2 hover:bg-sky-lightest focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-base pointer-coarse:min-h-11 pointer-coarse:min-w-11";
  const itemClass =
    "cursor-pointer rounded-lg px-3 py-2 data-highlighted:bg-sky-lightest data-highlighted:outline-none";

  async function copyStatement() {
    try {
      await navigator.clipboard.writeText(text);
      copyResult = "copied";
    } catch {
      copyResult = "failed";
    }
  }
</script>

<div class="flex flex-wrap items-center gap-2">
  {#if onmoderate}
    <Button
      variant="unstyled"
      class={[
        triggerClass,
        "gap-2 text-sm/none-sm font-medium tracking-sm text-ink-base",
      ]}
      aria-haspopup="dialog"
      onclick={(event: MouseEvent) => {
        if (event.currentTarget instanceof HTMLElement)
          onmoderate(event.currentTarget);
      }}
      ><span
        class="icon-[lucide--sword] size-4 -scale-x-100 text-sky-dark"
        aria-hidden="true"
      ></span>{m.moderation_moderate()}</Button
    >
  {/if}
  <DropdownMenu.Root
    {dir}
    onOpenChange={(open) => {
      if (open) {
        openingDialog = false;
        copyResult = undefined;
      }
    }}
  >
    <DropdownMenu.Trigger
      bind:ref={menuTrigger}
      aria-label={m.moderation_statement_actions()}
      class={[triggerClass, "w-8.5 text-sky-dark"]}
    >
      <Icon name="more" size={16} />
    </DropdownMenu.Trigger>
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        {dir}
        align="end"
        sideOffset={4}
        collisionPadding={8}
        onCloseAutoFocus={(event) => {
          if (openingDialog) event.preventDefault();
        }}
        class="
          z-80 max-w-[calc(100vw-16px)] min-w-44 rounded-xl border
          border-sky-lighter bg-sky-white p-1 text-sm text-ink-dark shadow-md
        "
      >
        <DropdownMenu.Item class={itemClass} onSelect={copyStatement}
          >{m.moderation_copy_statement()}</DropdownMenu.Item
        >
        {#if onmoderate}
          <DropdownMenu.Item
            class={itemClass}
            onSelect={() => {
              if (menuTrigger) {
                openingDialog = true;
                onmoderate(menuTrigger);
              }
            }}>{m.moderation_moderate_statement()}</DropdownMenu.Item
          >
        {/if}
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  </DropdownMenu.Root>
  <span
    role="status"
    class="
      text-xs text-ink-light
      empty:hidden
    "
    >{copyResult === "copied"
      ? m.moderation_statement_copied()
      : copyResult === "failed"
        ? m.moderation_copy_failed()
        : ""}</span
  >
</div>
