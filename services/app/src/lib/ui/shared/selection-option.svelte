<script lang="ts">
  import type { Snippet } from "svelte";

  import Icon from "./icon.svelte";

  let {
    label,
    description,
    selected,
    children,
  }: {
    label: string;
    description?: string;
    selected: boolean;
    children?: Snippet;
  } = $props();
</script>

<span class="flex min-w-0 flex-1 flex-col gap-0.75 wrap-anywhere">
  {#if children}{@render children()}{:else}<span>{label}</span>{/if}
  {#if description}<small
      class="text-[13px] leading-[1.4] font-normal text-ink-light"
      >{description}</small
    >{/if}
</span>
<span
  class="grid w-5 shrink-0 place-items-center text-primary-base"
  aria-hidden="true"
>
  {#if selected}<Icon name="check" size={20} />{/if}
</span>
