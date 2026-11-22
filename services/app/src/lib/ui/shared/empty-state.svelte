<script lang="ts">
  import type { Snippet } from "svelte";

  import Icon from "./icon.svelte";
  import type { IconName } from "./view-types.js";

  let {
    title,
    description,
    icon = "folder",
    actions,
  }: {
    title: string;
    description: string;
    icon?: IconName;
    actions?: Snippet;
  } = $props();
</script>

<div
  class="
    flex flex-col items-center gap-3.5 rounded-xl border border-dashed
    border-sky-lighter px-6 py-14 text-center
  "
>
  <span
    class="
      grid size-14 place-items-center rounded-2xl bg-sky-lightest text-ink-light
    "><Icon name={icon} size={28} /></span
  >
  <h3 class="text-lg font-semibold text-ink-dark">{title}</h3>
  <p class="max-w-95 text-sm text-ink-light">{description}</p>
  {#if actions}<div>{@render actions()}</div>{/if}
</div>
