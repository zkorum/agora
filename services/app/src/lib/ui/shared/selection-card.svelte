<script lang="ts" generics="Value extends string">
  import { Label } from "bits-ui";
  import type { Snippet } from "svelte";

  import Button from "./button.svelte";
  const base =
    "flex min-w-0 flex-col gap-4 rounded-xl border bg-sky-white p-6 text-start text-base text-ink-light motion-safe:transition-colors max-md:gap-2 max-md:p-3.5 max-md:text-sm";
  const interactive =
    "cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-primary-dark has-focus-visible:outline-2 has-focus-visible:-outline-offset-4 has-focus-visible:outline-primary-dark";
  type Props = {
    disabled?: boolean;
    heading: Snippet;
    children?: Snippet;
  } & (
    | {
        mode: "radio";
        name: string;
        value: Value;
        checked: boolean;
        onselect: (value: Value) => void;
      }
    | { mode: "action"; onclick: () => void }
  );
  let props: Props = $props();
  const id = $props.id();
  const headingId = `${id}-heading`;
  const descriptionId = `${id}-description`;
</script>

{#snippet body(control?: Snippet)}
  <span class="flex flex-wrap items-center gap-2"
    ><span id={headingId}>{@render props.heading()}</span
    >{@render control?.()}</span
  >
  {#if props.children}<span id={descriptionId}>{@render props.children()}</span
    >{/if}
{/snippet}
{#if props.mode === "radio"}
  {#snippet radio()}<input
      class="ms-auto size-4.5 flex-none cursor-pointer accent-primary-base"
      type="radio"
      {id}
      name={props.name}
      value={props.value}
      checked={props.checked}
      disabled={props.disabled}
      aria-labelledby={headingId}
      aria-describedby={props.children ? descriptionId : undefined}
      onchange={(event) => {
        if (props.mode === "radio" && event.currentTarget.checked)
          props.onselect(props.value);
      }}
    />{/snippet}
  <Label.Root
    for={id}
    data-selection-card
    class={[
      base,
      interactive,
      `
        border-sky-lighter
        has-checked:border-primary-base has-checked:bg-primary-lightest
        has-disabled:cursor-(--choice-card-disabled-cursor,not-allowed)
        has-disabled:opacity-70
        has-[:enabled:not(:checked)]:hover:border-sky-dark
        has-[:enabled:not(:checked)]:hover:bg-sky-off-white
      `,
    ]}
  >
    {@render body(radio)}
  </Label.Root>
{:else}<Button
    variant="unstyled"
    class={[
      base,
      interactive,
      "border-sky-lighter enabled:hover:border-sky-dark enabled:hover:bg-sky-off-white disabled:cursor-wait disabled:opacity-70",
    ].join(" ")}
    data-selection-card
    type="button"
    aria-labelledby={headingId}
    aria-describedby={props.children ? descriptionId : undefined}
    disabled={props.disabled}
    onclick={props.onclick}>{@render body()}</Button
  >{/if}
