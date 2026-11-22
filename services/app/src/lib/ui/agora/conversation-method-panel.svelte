<script lang="ts" generics="Value extends string">
  import Icon from "$ui/shared/icon.svelte";
  import Panel from "$ui/shared/panel.svelte";
  import SelectionCard from "$ui/shared/selection-card.svelte";

  import type { ConversationMethodPanelProps } from "./view-types.js";
  let {
    title,
    description,
    actions,
    items,
    selected,
    onselect,
  }: ConversationMethodPanelProps<Value> = $props();
  const name = $props.id();
</script>

<Panel {title} {description} {actions} appearance="activity">
  <fieldset
    class="
      grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))]
      gap-3
    "
  >
    <legend class="sr-only">{title}</legend>
    {#each items as item (item.value)}
      <SelectionCard
        mode="radio"
        {name}
        value={item.value}
        checked={selected === item.value}
        {onselect}
        disabled={item.disabled}
      >
        {#snippet heading()}<span
            class="flex items-center gap-2 font-medium text-ink-dark"
            ><Icon name={item.icon} size={20} />{item.label}</span
          >{/snippet}
        {item.description}
      </SelectionCard>
    {/each}
  </fieldset>
</Panel>
