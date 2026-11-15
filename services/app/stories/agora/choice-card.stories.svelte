<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import type { Snippet } from "svelte";

  import { prioritizationItemTexts } from "#lib/mock-data.js";
  import ChoiceCard from "$ui/agora/choice-card.svelte";
  import type { ChoiceCardProps } from "$ui/agora/view-types.js";

  import FixtureState from "../fixture-state.svelte";
  import type { FixtureStateView } from "../view-types.js";

  type Args = Omit<ChoiceCardProps, "onselect"> & {
    dir?: "ltr" | "rtl";
  };

  const { Story } = defineMeta<Snippet<[Args, unknown]>, typeof ChoiceCard>({
    title: "Agora/Choice card",
    component: ChoiceCard,
    args: {
      text: prioritizationItemTexts[0],
      label: "Choose this statement",
      selected: false,
    },
  });
</script>

{#snippet template({ dir = "ltr", ...args }: Args)}
  <FixtureState initial={() => args.selected}>
    {#snippet children({ value: selected, set }: FixtureStateView<boolean>)}
      <div {dir} style="max-width: 480px">
        <ChoiceCard
          {...args}
          {selected}
          onselect={() => {
            set(!selected);
          }}
        />
      </div>
    {/snippet}
  </FixtureState>
{/snippet}

<Story name="Unselected" {template} />
<Story name="Selected" args={{ selected: true }} {template} />
<Story name="Disabled" args={{ disabled: true }} {template} />
<Story
  name="Long statement"
  args={{
    text: Array.from(
      { length: 8 },
      () =>
        "We should improve everyday walking routes with safer crossings, accessible pavements and places to rest. Residents should be involved in choosing the first routes to improve.",
    ).join("\n\n"),
  }}
  {template}
/>
<Story name="RTL" args={{ dir: "rtl" }} {template} />
