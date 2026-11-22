<script lang="ts">
  import type { Snippet } from "svelte";

  import Button from "$ui/shared/button.svelte";

  import ConversationBadge from "./conversation-badge.svelte";
  import type { ConversationViewKind } from "./view-types.js";
  let {
    back,
    kind,
    title,
    onedit,
  }: {
    back: Snippet;
    kind: ConversationViewKind;
    title: string;
    onedit?: (event: MouseEvent) => void;
  } = $props();
</script>

<div class="flex max-w-full min-w-0 items-center gap-2">
  {@render back()}
  <ConversationBadge {kind} variant="icon" />
  {#if onedit}<Button
      variant="unstyled"
      class="
        truncate text-start
        hover:underline
      "
      aria-haspopup="dialog"
      {title}
      onclick={onedit}>{title}</Button
    >{:else}<span class="truncate" {title}>{title}</span>{/if}
</div>
