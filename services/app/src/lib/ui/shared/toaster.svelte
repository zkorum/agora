<script lang="ts">
  import { Toaster } from "svelte-sonner";

  import * as m from "#lib/paraglide/messages.js";

  import Icon from "./icon.svelte";

  let { dir }: { dir: "ltr" | "rtl" } = $props();
</script>

<Toaster
  {dir}
  position={dir === "rtl" ? "bottom-left" : "bottom-right"}
  theme="light"
  closeButton
  closeButtonAriaLabel={m.project_workspace_dismiss_notification()}
  containerAriaLabel={m.project_workspace_notifications()}
  toastOptions={{
    unstyled: true,
    classes: {
      toast:
        "flex w-(--width) items-center gap-1.5 rounded-lg border border-sky-lighter border-s-3 border-s-primary-base bg-sky-white py-4 ps-6 pe-12 font-sans text-sm font-medium text-primary-dark shadow-[0_2px_8px_#0000001a]",
      content: "flex min-w-0 flex-1 flex-col gap-0.5",
      title: "leading-normal",
      description: "font-normal leading-[1.4] text-ink-base",
      icon: "flex size-4 shrink-0 items-center",
      closeButton:
        "absolute end-2.5 top-1/2 grid size-7 -translate-y-1/2 cursor-pointer place-items-center rounded-md border-0 bg-transparent p-0 text-ink-light hover:bg-sky-lightest hover:text-ink-dark focus-visible:text-ink-dark focus-visible:outline-2 focus-visible:outline-primary-base focus-visible:outline-offset-2",
    },
  }}
>
  {#snippet successIcon()}
    <Icon name="circle-check" size={16} />
  {/snippet}
  {#snippet closeIcon()}
    <Icon name="close" size={16} />
  {/snippet}
</Toaster>
