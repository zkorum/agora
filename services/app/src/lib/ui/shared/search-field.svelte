<script lang="ts">
  import { Label } from "bits-ui";
  import type { HTMLInputAttributes } from "svelte/elements";

  import Icon from "./icon.svelte";
  let {
    label,
    value = $bindable(""),
    ref = $bindable(null),
    ...attributes
  }: Omit<HTMLInputAttributes, "type" | "value" | "children"> & {
    label: string;
    value?: string;
    ref?: HTMLInputElement | null;
  } = $props();
  function attachInput(node: HTMLInputElement) {
    ref = node;
    return () => {
      ref = null;
    };
  }
</script>

<Label.Root
  class="
    flex h-10.5 w-(--search-field-width,min(316px,100%)) min-w-0 items-center
    gap-2.5 rounded-lg border border-sky-lighter bg-sky-white px-3 py-2.25
    text-sky-dark
    focus-within:outline-2 focus-within:outline-offset-1
    focus-within:outline-primary-base
  "
  ><Icon name="search" size={16} /><input
    {...attributes}
    class={[
      `
        w-full min-w-0 border-0 bg-transparent text-sm text-ink-dark
        outline-none
        placeholder:text-sky-dark
      `,
      attributes.class,
    ]}
    {@attach attachInput}
    type="search"
    aria-label={label}
    placeholder={attributes.placeholder ?? label}
    bind:value
  /></Label.Root
>
