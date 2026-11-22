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
  class={[
    appearance !== "unstyled" && "flex w-fit max-w-full flex-wrap items-center",
    appearance === "underline" && "border-b border-sky-lighter",
    (appearance === "filter" || appearance === "pill") && "gap-1",
    appearance === "pill" && "rounded-full bg-sky-lighter p-0.75",
    rootProps.class,
  ]}
>
  {#each items as item (item.value)}
    <ToggleGroup.Item
      value={item.value}
      class={[
        `
          inline-flex cursor-pointer items-center justify-center gap-1.75
          text-sm text-ink-light
          focus-visible:outline-3 focus-visible:outline-offset-2
          focus-visible:outline-primary-light
          disabled:cursor-not-allowed disabled:opacity-60
        `,
        appearance === "underline"
          ? `
            border-b-2 border-transparent bg-transparent px-3 py-2.25
            data-[state=on]:border-primary-base data-[state=on]:text-ink-dark
          `
          : appearance === "filter"
            ? `
              rounded-full bg-sky-lighter px-3.5 py-1.5
              data-[state=on]:bg-primary-base data-[state=on]:text-sky-white
              data-[state=on]:shadow-[0_1px_3px_#33323808]
            `
            : appearance === "pill" &&
              `
                rounded-full bg-transparent px-4.5 py-2.25
                data-[state=on]:bg-sky-white data-[state=on]:text-ink-dark
                data-[state=on]:shadow-[0_1px_3px_#33323808]
                max-md:px-3
              `,
      ]}
      >{#if itemContent}{@render itemContent(
          item,
        )}{:else}{item.label}{#if item.count}<span
            class="rounded-sm bg-sky-lighter px-1 text-[11px] text-ink-light"
            >{item.count}</span
          >{/if}{/if}</ToggleGroup.Item
    >
  {/each}
</ToggleGroup.Root>
