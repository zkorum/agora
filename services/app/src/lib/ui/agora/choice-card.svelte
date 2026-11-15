<script lang="ts">
  import { RadioGroup, Toggle } from "bits-ui";

  import ExpandableText from "$ui/shared/expandable-text.svelte";

  import type { ChoiceCardProps } from "./view-types.js";

  let {
    text,
    label,
    selected,
    onselect,
    disabled = false,
    radioValue,
  }: ChoiceCardProps = $props();
</script>

<div class={["choice-card", { selected, disabled }]}>
  <div class="text"><ExpandableText {text} lines={5} /></div>
  {#if radioValue !== undefined}
    <RadioGroup.Item
      value={radioValue}
      {disabled}
      aria-label={`${label}: ${text}`}
      class="select-line"
    >
      <span class="radio" aria-hidden="true"></span>{label}
    </RadioGroup.Item>
  {:else}
    <Toggle.Root
      bind:pressed={() => selected, onselect}
      {disabled}
      aria-label={`${label}: ${text}`}
      class="select-line"
    >
      <span class="radio" aria-hidden="true"></span>{label}
    </Toggle.Root>
  {/if}
</div>

<style>
  .choice-card {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 40px;
    width: 100%;
    min-height: 220px;
    padding: 28px;
    border: 1px solid var(--sky-lighter);
    border-radius: 12px;
    background: white;
    color: var(--ink-dark);
    text-align: start;
    font: inherit;
  }
  .choice-card:hover:not(.disabled) {
    background: var(--sky-lightest);
  }
  .disabled {
    opacity: 0.6;
  }
  .choice-card :global(.select-line:focus-visible::after) {
    outline: 3px solid var(--primary-light);
    outline-offset: 2px;
  }
  .selected {
    background: var(--primary-lightest);
    border-color: var(--primary-base);
  }
  .text {
    font-size: 20px;
    font-weight: 500;
    line-height: 1.5;
  }
  .choice-card :global(.select-line) {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
    color: var(--ink-light);
    border: 0;
    padding: 0;
    background: transparent;
    text-align: start;
    font-family: inherit;
    cursor: pointer;
  }
  .choice-card :global(.select-line::after) {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 12px;
  }
  .choice-card :global(.select-line:disabled) {
    cursor: not-allowed;
  }
  .radio {
    width: 20px;
    height: 20px;
    border: 1px solid var(--sky-base);
    border-radius: 50%;
    background: white;
  }
  :global([aria-pressed="true"]) .radio,
  :global([data-state="checked"]) .radio {
    border: 6px solid var(--primary-base);
  }
  @media (max-width: 760px) {
    .choice-card {
      min-height: 160px;
      padding: 20px;
    }
    .text {
      font-size: 18px;
    }
  }
</style>
