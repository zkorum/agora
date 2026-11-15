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

<div class="empty">
  <span class="mark"><Icon name={icon} size={28} /></span>
  <h3>{title}</h3>
  <p>{description}</p>
  {#if actions}<div>{@render actions()}</div>{/if}
</div>

<style>
  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    padding: 56px 24px;
    text-align: center;
    border: 1px dashed var(--sky-lighter);
    border-radius: 12px;
  }
  .mark {
    display: grid;
    place-items: center;
    width: 56px;
    height: 56px;
    background: var(--sky-lightest);
    border-radius: 16px;
    color: var(--ink-light);
  }
  h3 {
    font-size: 18px;
    font-weight: 600;
    color: var(--ink-dark);
  }
  p {
    font-size: 14px;
    max-width: 380px;
    color: var(--ink-light);
  }
</style>
