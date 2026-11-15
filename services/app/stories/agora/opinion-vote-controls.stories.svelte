<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import type { Snippet } from "svelte";

  import OpinionVoteControls from "$ui/agora/opinion-vote-controls.svelte";
  import type {
    OpinionVoteChoice,
    OpinionVoteControlsProps,
  } from "$ui/agora/view-types.js";

  import FixtureState from "../fixture-state.svelte";
  import type { FixtureStateView } from "../view-types.js";

  type Args = Omit<OpinionVoteControlsProps, "onvote"> & {
    dir?: "ltr" | "rtl";
  };

  const { Story } = defineMeta<
    Snippet<[Args, unknown]>,
    typeof OpinionVoteControls
  >({
    title: "Agora/Opinion vote controls",
    component: OpinionVoteControls,
    args: { label: "Respond to this statement", selected: undefined },
    argTypes: {
      selected: {
        control: "select",
        options: [undefined, "disagree", "pass", "agree"],
      },
      disabled: { control: "boolean" },
    },
  });
</script>

{#snippet template({ dir = "ltr", ...args }: Args)}
  <FixtureState initial={() => args.selected}>
    {#snippet children({
      value: selected,
      set,
    }: FixtureStateView<OpinionVoteChoice | undefined>)}
      <div {dir} style="max-width: 800px">
        <OpinionVoteControls
          {...args}
          {selected}
          onvote={(next: OpinionVoteChoice) => {
            set(next);
          }}
        />
      </div>
    {/snippet}
  </FixtureState>
{/snippet}

<Story name="Unanswered" {template} />
<Story name="Disagreed" args={{ selected: "disagree" }} {template} />
<Story name="Unsure" args={{ selected: "pass" }} {template} />
<Story name="Agreed" args={{ selected: "agree" }} {template} />
<Story name="Disabled" args={{ disabled: true }} {template} />
<Story
  name="Disabled selected"
  args={{ selected: "disagree", disabled: true }}
  {template}
/>
<Story name="RTL" args={{ dir: "rtl" }} {template} />
