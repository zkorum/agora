<script lang="ts">
  import * as m from "#lib/paraglide/messages.js";

  import Button from "./button.svelte";
  import Dialog from "./dialog.svelte";
  import type { DialogProps } from "./view-types.js";

  let {
    title,
    description,
    dir,
    children,
    closeLabel,
    wide = false,
    disabled = false,
  }: Pick<
    DialogProps,
    "title" | "description" | "dir" | "children" | "wide"
  > & { closeLabel: string; disabled?: boolean } = $props();
  let open = $state(false);
  const dialogId = $props.id();
  let trigger = $state.raw<HTMLElement | null>(null);
  let contentRef = $state.raw<HTMLElement | null>(null);
</script>

<Button
  variant="unstyled"
  class="
    ms-auto inline-flex min-h-8 max-w-full cursor-pointer items-center
    justify-center gap-1.5 rounded-lg bg-primary-lightest px-2.5 py-1.5
    text-start text-sm font-medium wrap-anywhere text-primary-dark
    hover:bg-primary-lighter
    focus-visible:outline-2 focus-visible:outline-offset-2
    focus-visible:outline-primary-base
    disabled:cursor-not-allowed disabled:opacity-60
  "
  aria-haspopup="dialog"
  aria-expanded={open}
  aria-controls={open ? dialogId : undefined}
  {disabled}
  bind:ref={trigger}
  onclick={() => (open = true)}
>
  <span class="icon-[lucide--circle-help] size-4 shrink-0" aria-hidden="true"
  ></span>{m.project_workspace_help_choose()}
</Button>
<Dialog
  {wide}
  {title}
  {description}
  {dir}
  footerInset="action"
  bind:open
  {closeLabel}
  contentProps={{
    id: dialogId,
    onCloseAutoFocus: (event: Event) => {
      if (trigger?.isConnected) {
        event.preventDefault();
        trigger.focus({ preventScroll: true });
      }
    },
    onOpenAutoFocus: (event: Event) => {
      if (!contentRef) return;
      event.preventDefault();
      contentRef.focus({ preventScroll: true });
    },
  }}
  bind:contentRef
>
  {#if open}{@render children()}{/if}
  {#snippet footer()}
    <Button variant="solid" size="control" onclick={() => (open = false)}>
      {m.help_dialog_done()}
    </Button>
  {/snippet}
</Dialog>
