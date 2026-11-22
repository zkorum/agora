<script lang="ts">
  import { Label } from "bits-ui";
  import type { HTMLInputAttributes } from "svelte/elements";

  import FieldLabel from "./field-label.svelte";

  let {
    label,
    value = $bindable(),
    id,
    ...input
  }: Omit<HTMLInputAttributes, "value" | "type" | "children"> & {
    label: string;
    value?: number;
  } = $props();
  const uid = $props.id();
</script>

<div class="grid gap-2">
  <Label.Root for={id ?? uid}
    ><FieldLabel text={label} required={input.required === true} /></Label.Root
  >
  <input
    {...input}
    id={id ?? uid}
    type="number"
    bind:value
    class={[
      `
        max-w-36 rounded-lg border border-sky-lighter bg-sky-white px-4 py-3
        focus-visible:outline-primary-base
      `,
      input.class,
    ]}
  />
</div>
