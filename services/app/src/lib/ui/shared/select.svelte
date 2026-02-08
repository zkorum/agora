<script lang="ts">
  import { Select } from "bits-ui";
  import type { Snippet } from "svelte";

  interface SelectItem {
    value: string;
    label: string;
    disabled?: boolean;
  }

  interface Props {
    items: SelectItem[];
    value?: string;
    onValueChange?: (value: string | undefined) => void;
    placeholder?: string;
    disabled?: boolean;
    triggerClass?: string;
    contentClass?: string;
    triggerLabel?: Snippet<[SelectItem]>;
    itemLabel?: Snippet<[SelectItem]>;
  }

  let {
    items,
    value = $bindable(),
    onValueChange,
    placeholder = "Select...",
    disabled = false,
    triggerClass = "",
    contentClass = "",
    triggerLabel,
    itemLabel,
  }: Props = $props();

  const selectedItem = $derived(items.find((item) => item.value === value));
</script>

<Select.Root type="single" bind:value {onValueChange} {disabled}>
  <Select.Trigger
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
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 256 256"
      class="text-primary-base"
      fill="currentColor"
    >
      <path
        d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z"
      />
    </svg>
  </Select.Trigger>

  <Select.Portal>
    <Select.Content
      class="
        z-80 min-w-32 rounded-md bg-white py-1 shadow-md
        {contentClass}"
      sideOffset={4}
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
