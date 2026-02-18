<script lang="ts">
  import { Dialog } from "bits-ui";
  import type { Snippet } from "svelte";

  type Side = "left" | "right" | "top" | "bottom";

  interface Props {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    side?: Side;
    title?: string;
    class?: string;
    children: Snippet;
  }

  let {
    open = $bindable(false),
    onOpenChange,
    side = "right",
    title = "Menu",
    class: className = "",
    children,
  }: Props = $props();

  const sideClasses: Record<Side, string> = {
    left: "inset-y-0 left-0 w-[280px] animate-[slide-in-from-left_300ms_ease-out] data-[state=closed]:animate-[slide-out-to-left_300ms_ease-out]",
    right:
      "inset-y-0 right-0 w-[280px] animate-[slide-in-from-right_300ms_ease-out] data-[state=closed]:animate-[slide-out-to-right_300ms_ease-out]",
    top: "inset-x-0 top-0 h-auto animate-[slide-in-from-top_300ms_ease-out] data-[state=closed]:animate-[slide-out-to-top_300ms_ease-out]",
    bottom:
      "inset-x-0 bottom-0 h-auto animate-[slide-in-from-bottom_300ms_ease-out] data-[state=closed]:animate-[slide-out-to-bottom_300ms_ease-out]",
  };

  const baseContentClasses =
    "fixed z-70 flex flex-col overflow-hidden bg-sky-white shadow-xl";

  const contentClass = $derived(
    `${baseContentClasses} ${sideClasses[side]} ${className}`.trim(),
  );
</script>

<Dialog.Root bind:open {onOpenChange}>
  <Dialog.Portal>
    <Dialog.Overlay
      class="
        fixed inset-0 z-60 animate-[fade-in_200ms_ease-out] bg-black/30
        data-[state=closed]:animate-[fade-out_200ms_ease-out]
      "
    />
    <Dialog.Content class={contentClass}>
      <Dialog.Title class="sr-only">{title}</Dialog.Title>
      {@render children()}
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
