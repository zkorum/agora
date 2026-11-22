<script lang="ts">
  import { Label } from "bits-ui";
  import type { Snippet } from "svelte";

  import * as m from "#lib/paraglide/messages.js";

  import Button from "./button.svelte";
  import Chip from "./chip.svelte";
  import FieldLabel from "./field-label.svelte";
  import Icon from "./icon.svelte";
  import type { SelectItem } from "./view-types.js";

  let {
    id,
    label,
    required = false,
    hint,
    error,
    dir,
    variant,
    disabled,
    selected = [],
    onRemove,
    children,
  }: {
    id: string;
    label?: string;
    required?: boolean;
    hint?: string;
    error?: string;
    dir?: "ltr" | "rtl";
    variant: "compact" | "field";
    disabled: boolean;
    selected?: readonly SelectItem[];
    onRemove?: (value: string) => void;
    children: Snippet;
  } = $props();
</script>

<div
  class={[
    "min-w-0 flex-col gap-2 align-middle",
    variant === "field" ? "flex w-full" : "inline-flex",
  ]}
  {dir}
>
  {#if label}<Label.Root for={id} class="text-sm font-medium text-ink-base"
      ><FieldLabel text={label} id={`${id}-label`} {required} /></Label.Root
    >{/if}
  {@render children()}
  {#if selected.length > 0 && onRemove}
    <ul
      class="m-0 flex list-none flex-wrap gap-1.5 p-0"
      aria-label={m.selector_selected_count({ count: selected.length })}
    >
      {#each selected as item (item.value)}
        <li>
          <Chip gradient={false}>
            {item.label}
            <Button
              variant="unstyled"
              class="
                ms-1 inline-grid size-6 cursor-pointer place-items-center
                rounded-full text-ink-light
                focus-visible:outline-2 focus-visible:outline-offset-2
                focus-visible:outline-primary-base
                disabled:cursor-not-allowed disabled:opacity-50
                pointer-coarse:min-h-11 pointer-coarse:min-w-11
              "
              {disabled}
              aria-label={m.selector_remove_selection({ name: item.label })}
              onclick={() => {
                onRemove(item.value);
              }}><Icon name="close" size={14} /></Button
            >
          </Chip>
        </li>
      {/each}
    </ul>
  {/if}
  {#if hint}<small id={`${id}-hint`} class="text-xs/none-lg text-ink-light"
      >{hint}</small
    >{/if}
  {#if error}<small
      id={`${id}-error`}
      class="text-xs/none-lg text-red-darkest"
      role="alert">{error}</small
    >{/if}
</div>
