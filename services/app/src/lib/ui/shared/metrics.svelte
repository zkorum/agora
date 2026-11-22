<script lang="ts">
  let { items }: { items: readonly { label: string; value: string }[] } =
    $props();
</script>

<dl class="m-0 grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-4">
  {#each items as item (item.label)}<div
      class="flex flex-col-reverse gap-1.5 rounded-[10px] bg-sky-lightest p-5"
    >
      <dt class="text-[13px] text-ink-light">{item.label}</dt>
      <dd class="m-0 text-[28px] font-semibold text-ink-dark">{item.value}</dd>
    </div>{/each}
</dl>
