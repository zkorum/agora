<script lang="ts">
  import { Select } from "bits-ui";
  import type { Snippet } from "svelte";

  import type { SelectItem } from "./view-types.js";

  interface Props {
    items: SelectItem[];
    placeholder: string;
    value?: string;
    onValueChange?: (value: string | undefined) => void;
    disabled?: boolean;
    triggerClass?: string;
    contentClass?: string;
    triggerLabel?: Snippet<[SelectItem]>;
    itemLabel?: Snippet<[SelectItem]>;
    rootProps?: Omit<
      Extract<Select.RootProps, { type: "single" }>,
      "type" | "value" | "children" | "disabled" | "onValueChange"
    >;
    triggerProps?: Omit<Select.TriggerProps, "children" | "class" | "ref">;
    contentProps?: Omit<Select.ContentProps, "children" | "class" | "ref">;
    triggerRef?: Select.TriggerProps["ref"];
    contentRef?: Select.ContentProps["ref"];
  }

  let {
    items,
    placeholder,
    value = $bindable(),
    onValueChange,
    disabled = false,
    triggerClass = "",
    contentClass = "",
    triggerLabel,
    itemLabel,
    rootProps = {},
    triggerProps = {},
    contentProps = {},
    triggerRef = $bindable(null),
    contentRef = $bindable(null),
  }: Props = $props();

  const selectedItem = $derived(items.find((item) => item.value === value));
</script>

<Select.Root {...rootProps} type="single" bind:value {onValueChange} {disabled}>
  <Select.Trigger
    {...triggerProps}
    bind:ref={triggerRef}
    class="
      inline-flex items-center gap-1.5 rounded-chip bg-sky-lightest px-2 py-1.5
      text-sm transition-colors outline-none
      hover:bg-sky-lighter
      focus-visible:ring-2 focus-visible:ring-primary-base
      {triggerClass}"
  >
    {#if selectedItem}
      {#if triggerLabel}
        {@render triggerLabel(selectedItem)}
      {:else}
        {selectedItem.label}
      {/if}
    {:else}
      <span class="text-muted-foreground">{placeholder}</span>
    {/if}
    <span
      class="icon-[lucide--chevron-down] size-4 text-primary-base"
      aria-hidden="true"
    ></span>
  </Select.Trigger>

  <Select.Portal>
    <Select.Content
      {...contentProps}
      bind:ref={contentRef}
      class="
        z-80 min-w-32 rounded-md bg-white py-1 shadow-md
        {contentClass}"
      sideOffset={contentProps.sideOffset ?? 4}
    >
      {#each items as item (item.value)}
        <Select.Item
          value={item.value}
          label={item.label}
          disabled={item.disabled}
          class="
            cursor-pointer rounded-md px-3 py-2 text-sm transition-colors
            outline-none
            data-highlighted:bg-sky-lightest
            data-selected:font-medium
          "
        >
          {#if itemLabel}
            {@render itemLabel(item)}
          {:else}
            {item.label}
          {/if}
        </Select.Item>
      {/each}
    </Select.Content>
  </Select.Portal>
</Select.Root>
