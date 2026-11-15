<script lang="ts">
  import { ToggleGroup } from "bits-ui";

  import type { SegmentedControlProps } from "./view-types.js";
  let {
    label,
    items,
    value,
    onchange,
    appearance = "pill",
    disabled = false,
    rootProps = {},
    ref = $bindable(null),
    itemContent,
  }: SegmentedControlProps = $props();

  function change(next: string) {
    if (next) onchange(next);
  }
</script>

<ToggleGroup.Root
  {...rootProps}
  bind:ref
  type="single"
  {disabled}
  bind:value={() => value, change}
  aria-label={label}
  class={["agora-segments", appearance, rootProps.class]}
>
  {#each items as item (item.value)}
    <ToggleGroup.Item value={item.value} class="agora-segment"
      >{#if itemContent}{@render itemContent(
          item,
        )}{:else}{item.label}{#if item.count}<span class="count"
            >{item.count}</span
          >{/if}{/if}</ToggleGroup.Item
    >
  {/each}
</ToggleGroup.Root>

<style>
  :global(.agora-segments) {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-wrap: wrap;
    width: fit-content;
    max-width: 100%;
  }
  :global(.agora-segments.pill) {
    padding: 3px;
    background: var(--sky-lighter);
    border-radius: 999px;
  }
  :global(.agora-segment) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    padding: 9px 18px;
    border-radius: 999px;
    background: transparent;
    color: var(--ink-light);
    font: inherit;
    font-size: 14px;
    border: 0;
    cursor: pointer;
  }
  :global(.agora-segment[data-state="on"]) {
    background: white;
    color: var(--ink-dark);
    box-shadow: 0 1px 3px #33323808;
  }
  :global(.agora-segments.underline) {
    gap: 0;
    border-block-end: 1px solid var(--sky-lighter);
    border-radius: 0;
  }
  :global(.agora-segments.underline .agora-segment) {
    border-radius: 0;
    border-block-end: 2px solid transparent;
    padding-inline: 12px;
  }
  :global(.agora-segments.underline .agora-segment[data-state="on"]) {
    background: transparent;
    border-block-end-color: var(--primary-base);
    box-shadow: none;
  }
  .count {
    background: var(--sky-lighter);
    border-radius: 4px;
    padding: 0 4px;
    color: var(--ink-light);
    font-size: 11px;
  }
  :global(.agora-segment:focus-visible) {
    outline: 3px solid var(--primary-light);
    outline-offset: 2px;
  }
  :global(.agora-segment:disabled) {
    cursor: not-allowed;
    opacity: 0.6;
  }
  @media (max-width: 760px) {
    :global(.agora-segment) {
      padding-inline: 12px;
    }
  }
</style>
