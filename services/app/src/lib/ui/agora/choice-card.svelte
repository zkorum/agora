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
  const selectClass =
    "group flex cursor-pointer items-center gap-2.5 bg-transparent p-0 text-start text-sm text-ink-light after:absolute after:inset-0 after:rounded-xl focus-visible:after:outline-3 focus-visible:after:outline-primary-light focus-visible:after:outline-offset-2 disabled:cursor-not-allowed";
  const radioClass =
    "size-5 rounded-full border border-sky-base bg-sky-white group-aria-pressed:border-6 group-aria-pressed:border-primary-base group-data-[state=checked]:border-6 group-data-[state=checked]:border-primary-base";
</script>

<div
  class={[
    `
      relative flex min-h-55 w-full flex-col justify-between gap-10 rounded-xl
      border p-7 text-start text-ink-dark
      max-md:min-h-40 max-md:p-5
    `,
    selected
      ? "border-primary-base bg-primary-lightest"
      : "border-sky-lighter bg-sky-white",
    disabled ? "opacity-60" : "hover:bg-sky-lightest",
  ]}
>
  <div
    class="
      text-[20px] leading-normal font-medium
      max-md:text-lg/normal
    "
  >
    <ExpandableText {text} lines={5} />
  </div>
  {#if radioValue !== undefined}
    <RadioGroup.Item
      value={radioValue}
      {disabled}
      aria-label={`${label}: ${text}`}
      class={selectClass}
    >
      <span class={radioClass} aria-hidden="true"></span>{label}
    </RadioGroup.Item>
  {:else}
    <Toggle.Root
      bind:pressed={() => selected, onselect}
      {disabled}
      aria-label={`${label}: ${text}`}
      class={selectClass}
    >
      <span class={radioClass} aria-hidden="true"></span>{label}
    </Toggle.Root>
  {/if}
</div>
