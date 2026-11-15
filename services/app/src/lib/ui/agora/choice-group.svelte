<script lang="ts">
  import { RadioGroup } from "bits-ui";

  import ChoiceCard from "./choice-card.svelte";

  let {
    label,
    items,
    selected,
    onselect,
    disabled = false,
    rootProps = {},
    ref = $bindable(null),
  }: {
    label: string;
    items: readonly { value: string; text: string; label: string }[];
    selected: string | undefined;
    onselect: (value: string) => void;
    disabled?: boolean;
    rootProps?: Omit<
      RadioGroup.RootProps,
      "children" | "value" | "disabled" | "onValueChange" | "ref"
    >;
    ref?: RadioGroup.RootProps["ref"];
  } = $props();
</script>

<RadioGroup.Root
  orientation="horizontal"
  {...rootProps}
  bind:ref
  aria-label={label}
  {disabled}
  bind:value={() => selected ?? "", onselect}
  class={["agora-choice-group", rootProps.class]}
>
  {#each items as item (item.value)}
    <ChoiceCard
      text={item.text}
      label={item.label}
      selected={selected === item.value}
      radioValue={item.value}
      onselect={() => {
        onselect(item.value);
      }}
      {disabled}
    />
  {/each}
</RadioGroup.Root>

<style>
  :global(.agora-choice-group) {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 20px;
  }
  @media (max-width: 760px) {
    :global(.agora-choice-group) {
      grid-template-columns: 1fr;
    }
  }
</style>
