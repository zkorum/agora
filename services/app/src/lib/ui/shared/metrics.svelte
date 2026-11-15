<script lang="ts">
  let { items }: { items: readonly { label: string; value: string }[] } =
    $props();
</script>

<dl>
  {#each items as item (item.label)}<div>
      <dt>{item.label}</dt>
      <dd>{item.value}</dd>
    </div>{/each}
</dl>

<style>
  dl {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 16px;
    margin: 0;
  }
  dl div {
    display: flex;
    flex-direction: column-reverse;
    gap: 6px;
    padding: 20px;
    background: var(--sky-lightest);
    border-radius: 10px;
  }
  dt {
    color: var(--ink-light);
    font-size: 13px;
  }
  dd {
    margin: 0;
    color: var(--ink-dark);
    font-size: 28px;
    font-weight: 600;
  }
</style>
