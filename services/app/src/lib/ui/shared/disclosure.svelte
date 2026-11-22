<script lang="ts">
  import { Collapsible } from "bits-ui";
  import type { Snippet } from "svelte";
  let {
    label,
    children,
    open = $bindable(false),
  }: { label: string; children: Snippet; open?: boolean } = $props();
</script>

<Collapsible.Root bind:open class="mt-4">
  <Collapsible.Trigger
    class="
      mb-3 inline-flex cursor-pointer items-center gap-2 text-start
      text-primary-dark
      focus-visible:outline-primary-base
    "
  >
    <span
      aria-hidden="true"
      class={["icon-[lucide--chevron-down] size-4", open && "rotate-180"]}
    ></span>{label}
  </Collapsible.Trigger>
  <Collapsible.Content>{@render children()}</Collapsible.Content>
</Collapsible.Root>
