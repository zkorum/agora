<script lang="ts">
  import { Checkbox, Label } from "bits-ui";
  let {
    label,
    checked = $bindable(false),
    ...props
  }: Omit<Checkbox.RootProps, "children" | "child" | "checked"> & {
    label: string;
    checked?: boolean;
  } = $props();
  const uid = $props.id();
</script>

<div class="flex min-h-11.5 items-center gap-2">
  <Checkbox.Root
    {...props}
    id={props.id ?? uid}
    bind:checked
    class={[
      `
        grid size-5 shrink-0 place-items-center rounded-sm border
        border-sky-base bg-sky-white
        focus-visible:outline-primary-base
        aria-checked:border-primary-base aria-checked:bg-primary-base
      `,
      props.class,
    ]}
  >
    {#if checked}<span
        class="icon-[lucide--check] size-4 text-sky-white"
        aria-hidden="true"
      ></span>{/if}
  </Checkbox.Root>
  <Label.Root for={props.id ?? uid}>{label}</Label.Root>
</div>
